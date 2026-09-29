export type PermissionMode = 'read' | 'readwrite'

export const FALLBACK_FILE_NAME = 'untitled.md'

const MARKDOWN_PICKER_TYPE = {
  description: 'Markdown 文件',
  accept: { 'text/markdown': ['.md', '.markdown'] },
}

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError'

export const supportsFileSystemAccess = () =>
  typeof window !== 'undefined' &&
  typeof window.showDirectoryPicker === 'function' &&
  window.isSecureContext

export const pickDirectory =
  async (): Promise<FileSystemDirectoryHandle | null> => {
    if (typeof window.showDirectoryPicker !== 'function') {
      return null
    }

    try {
      return await window.showDirectoryPicker({
        id: 'blog-notes',
        mode: 'readwrite',
      })
    } catch (error) {
      if (isAbortError(error)) {
        return null
      }
      throw error
    }
  }

export const pickMarkdownFile = async (): Promise<FileSystemFileHandle | null> => {
  if (typeof window.showOpenFilePicker !== 'function') {
    return null
  }

  try {
    const handles = await window.showOpenFilePicker({
      id: 'blog-markdown',
      multiple: false,
      types: [MARKDOWN_PICKER_TYPE],
    })

    return handles[0] ?? null
  } catch (error) {
    if (isAbortError(error)) {
      return null
    }
    throw error
  }
}

export const pickSaveTarget = async (
  suggestedName: string,
): Promise<FileSystemFileHandle | null> => {
  if (typeof window.showSaveFilePicker !== 'function') {
    return null
  }

  try {
    return await window.showSaveFilePicker({
      id: 'blog-markdown',
      suggestedName,
      types: [MARKDOWN_PICKER_TYPE],
    })
  } catch (error) {
    if (isAbortError(error)) {
      return null
    }
    throw error
  }
}

export const readHandleText = async (handle: FileSystemFileHandle) =>
  (await handle.getFile()).text()

export const writeHandleText = async (
  handle: FileSystemFileHandle,
  text: string,
) => {
  const stream = await handle.createWritable()
  await stream.write(text)
  await stream.close()
}

/**
 * 权限请求必须在用户手势内触发，因此 silent 模式只做静默探测。
 */
export const ensurePermission = async (
  handle: FileSystemFileHandle | FileSystemDirectoryHandle,
  mode: PermissionMode,
  options: { silent?: boolean } = {},
): Promise<boolean> => {
  const descriptor = { mode }

  if (typeof handle.queryPermission !== 'function') {
    // 缺少权限查询能力的实现无法判定，按可用处理，写入时再由浏览器报错。
    return true
  }

  try {
    if ((await handle.queryPermission(descriptor)) === 'granted') {
      return true
    }
    if (options.silent === true || typeof handle.requestPermission !== 'function') {
      return false
    }

    return (await handle.requestPermission(descriptor)) === 'granted'
  } catch {
    return false
  }
}

export const normalizeMarkdownFileName = (name: string) => {
  const trimmed = name.trim() || FALLBACK_FILE_NAME

  return /\.(md|markdown)$/i.test(trimmed) ? trimmed : `${trimmed}.md`
}

export const downloadMarkdown = (fileName: string, text: string) => {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = normalizeMarkdownFileName(fileName)
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // 立即 revoke 在部分浏览器会中断下载，延后释放。
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
