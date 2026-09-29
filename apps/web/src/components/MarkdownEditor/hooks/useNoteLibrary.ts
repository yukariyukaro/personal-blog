import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearDirectoryHandle,
  readDirectoryHandle,
  writeDirectoryHandle,
} from '../lib/draftStore'
import {
  ensurePermission,
  pickDirectory,
  readHandleText,
  supportsFileSystemAccess,
  writeHandleText,
} from '../lib/fileAccess'
import type { NoteNode } from '../lib/fileTree'
import {
  joinPath,
  relativeKey,
  resolveDirectory,
  scanNoteTree,
} from '../lib/fileTree'

const UNTITLED_LIMIT = 50

export type NoteLibrary = {
  supported: boolean
  rootName: string | null
  hasStoredRoot: boolean
  needsPermission: boolean
  tree: NoteNode[]
  isScanning: boolean
  truncated: boolean
  error: string | null
  activeKey: string | null
  /** 目录句柄的版本号：授权 / 换目录 / 断开时自增，供依赖读盘的能力感知变化。 */
  rootVersion: number
  connect: () => Promise<boolean>
  chooseDirectory: () => Promise<boolean>
  refresh: () => Promise<void>
  forget: () => Promise<void>
  readNote: (path: string[]) => Promise<string | null>
  readImageBlob: (path: string[]) => Promise<Blob | null>
  saveNote: (path: string[], text: string) => Promise<boolean>
  createNote: (directoryPath: string[]) => Promise<string[] | null>
  resolveNotePath: (handle: FileSystemFileHandle) => Promise<string[] | null>
  markActive: (path: string[] | null) => void
}

const resolveFileHandle = async (
  root: FileSystemDirectoryHandle,
  path: string[],
) => {
  const fileName = path.at(-1)
  if (!fileName) {
    return null
  }

  const directory = await resolveDirectory(root, path.slice(0, -1))

  return directory.getFileHandle(fileName)
}

const fileExists = async (
  directory: FileSystemDirectoryHandle,
  name: string,
) => {
  try {
    await directory.getFileHandle(name)

    return true
  } catch {
    return false
  }
}

export function useNoteLibrary(): NoteLibrary {
  const rootRef = useRef<FileSystemDirectoryHandle | null>(null)
  const [rootName, setRootName] = useState<string | null>(null)
  const [hasStoredRoot, setHasStoredRoot] = useState(false)
  const [needsPermission, setNeedsPermission] = useState(false)
  const [tree, setTree] = useState<NoteNode[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [rootVersion, setRootVersion] = useState(0)

  const supported = supportsFileSystemAccess()

  const scan = useCallback(async (root: FileSystemDirectoryHandle) => {
    setIsScanning(true)
    try {
      const result = await scanNoteTree(root)
      setTree(result.nodes)
      setTruncated(result.truncated)
      setError(null)
    } catch {
      setError('读取笔记目录失败，请重新授权。')
    } finally {
      setIsScanning(false)
    }
  }, [])

  const applyRoot = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      rootRef.current = handle
      setRootName(handle.name)
      setHasStoredRoot(true)
      setNeedsPermission(false)
      setRootVersion((version) => version + 1)
      await scan(handle)
    },
    [scan],
  )

  // 首屏静默探测：权限失效时不弹窗，只提示需要重新授权。
  useEffect(() => {
    if (!supported) {
      return
    }

    let cancelled = false

    const restore = async () => {
      const stored = await readDirectoryHandle()
      if (cancelled || !stored) {
        return
      }

      setRootName(stored.name)
      setHasStoredRoot(true)

      const granted = await ensurePermission(stored.handle, 'readwrite', {
        silent: true,
      })
      if (cancelled) {
        return
      }
      if (!granted) {
        setNeedsPermission(true)
        return
      }

      rootRef.current = stored.handle
      setNeedsPermission(false)
      await scan(stored.handle)
    }

    void restore()

    return () => {
      cancelled = true
    }
  }, [scan, supported])

  const connect = useCallback(async () => {
    setError(null)

    if (!supported) {
      return false
    }

    const stored = await readDirectoryHandle()
    if (stored && (await ensurePermission(stored.handle, 'readwrite'))) {
      await applyRoot(stored.handle)

      return true
    }

    const picked = await pickDirectory()
    if (!picked) {
      return false
    }

    await writeDirectoryHandle(picked)
    await applyRoot(picked)

    return true
  }, [applyRoot, supported])

  const chooseDirectory = useCallback(async () => {
    setError(null)

    if (!supported) {
      return false
    }

    const picked = await pickDirectory()
    if (!picked) {
      return false
    }

    await writeDirectoryHandle(picked)
    await applyRoot(picked)

    return true
  }, [applyRoot, supported])

  const refresh = useCallback(async () => {
    const root = rootRef.current
    if (!root) {
      await connect()
      return
    }

    await scan(root)
  }, [connect, scan])

  const forget = useCallback(async () => {
    await clearDirectoryHandle()
    rootRef.current = null
    setRootName(null)
    setHasStoredRoot(false)
    setNeedsPermission(false)
    setTree([])
    setTruncated(false)
    setActiveKey(null)
    setRootVersion((version) => version + 1)
  }, [])

  const readNote = useCallback(async (path: string[]) => {
    const root = rootRef.current
    if (!root) {
      return null
    }

    try {
      const handle = await resolveFileHandle(root, path)

      return handle ? await readHandleText(handle) : null
    } catch {
      setError(`无法读取 ${joinPath(path)}`)

      return null
    }
  }, [])

  const readImageBlob = useCallback(async (path: string[]) => {
    const root = rootRef.current
    if (!root) {
      return null
    }

    try {
      const handle = await resolveFileHandle(root, path)

      // File 是 Blob 的子类，直接返回即可。
      return handle ? await handle.getFile() : null
    } catch {
      // 图片不存在或没有读权限：静默失败，不影响正文编辑与保存。
      return null
    }
  }, [])

  const saveNote = useCallback(async (path: string[], text: string) => {
    const root = rootRef.current
    if (!root) {
      return false
    }

    try {
      const handle = await resolveFileHandle(root, path)
      if (!handle) {
        return false
      }
      if (!(await ensurePermission(handle, 'readwrite'))) {
        setError('写入权限被拒绝，请重新授权笔记目录。')

        return false
      }

      await writeHandleText(handle, text)

      return true
    } catch {
      setError(`无法写入 ${joinPath(path)}`)

      return false
    }
  }, [])

  const createNote = useCallback(
    async (directoryPath: string[]) => {
      const root = rootRef.current
      if (!root) {
        return null
      }

      try {
        const directory = await resolveDirectory(root, directoryPath)
        if (!(await ensurePermission(directory, 'readwrite'))) {
          setError('写入权限被拒绝，请重新授权笔记目录。')

          return null
        }

        for (let index = 1; index <= UNTITLED_LIMIT; index += 1) {
          const name = `untitled-${index}.md`
          if (await fileExists(directory, name)) {
            continue
          }

          const handle = await directory.getFileHandle(name, { create: true })
          await writeHandleText(handle, '')
          await scan(root)

          return [...directoryPath, name]
        }

        setError('同名文件过多，请先整理该目录。')

        return null
      } catch {
        setError('新建笔记失败。')

        return null
      }
    },
    [scan],
  )

  const resolveNotePath = useCallback(async (handle: FileSystemFileHandle) => {
    const root = rootRef.current
    if (!root) {
      return null
    }

    try {
      return await root.resolve(handle)
    } catch {
      return null
    }
  }, [])

  const markActive = useCallback((path: string[] | null) => {
    setActiveKey(path === null ? null : relativeKey(path))
  }, [])

  return {
    supported,
    rootName,
    hasStoredRoot,
    needsPermission,
    tree,
    isScanning,
    truncated,
    error,
    activeKey,
    rootVersion,
    connect,
    chooseDirectory,
    refresh,
    forget,
    readNote,
    readImageBlob,
    saveNote,
    createNote,
    resolveNotePath,
    markActive,
  }
}
