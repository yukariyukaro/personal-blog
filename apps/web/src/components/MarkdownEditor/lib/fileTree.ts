export type NoteFileNode = {
  kind: 'file'
  name: string
  path: string[]
  handle: FileSystemFileHandle
}

export type NoteDirNode = {
  kind: 'dir'
  name: string
  path: string[]
  children: NoteNode[]
}

export type NoteNode = NoteFileNode | NoteDirNode

export type ScanOptions = {
  maxDepth?: number
  maxFiles?: number
}

export type ScanResult = {
  nodes: NoteNode[]
  truncated: boolean
}

const MARKDOWN_PATTERN = /\.(md|markdown)$/i
const IGNORED_DIRECTORY_NAMES = new Set(['node_modules'])

export const isMarkdownFile = (name: string) => MARKDOWN_PATTERN.test(name)

export const isIgnoredDirectory = (name: string) =>
  name.startsWith('.') || IGNORED_DIRECTORY_NAMES.has(name)

const compareByName = (left: NoteNode, right: NoteNode) =>
  left.name.localeCompare(right.name, 'zh-Hans-CN')

type ScanState = { fileCount: number; truncated: boolean }

const scanDirectory = async (
  directory: FileSystemDirectoryHandle,
  parentPath: string[],
  depth: number,
  limits: Required<ScanOptions>,
  state: ScanState,
): Promise<NoteNode[]> => {
  const files: NoteFileNode[] = []
  const directories: NoteDirNode[] = []

  for await (const entry of directory.values()) {
    if (entry.kind === 'file') {
      if (!isMarkdownFile(entry.name)) {
        continue
      }
      if (state.fileCount >= limits.maxFiles) {
        state.truncated = true
        continue
      }

      state.fileCount += 1
      files.push({
        kind: 'file',
        name: entry.name,
        path: [...parentPath, entry.name],
        handle: entry,
      })
      continue
    }

    if (isIgnoredDirectory(entry.name) || depth >= limits.maxDepth) {
      continue
    }

    const path = [...parentPath, entry.name]
    directories.push({
      kind: 'dir',
      name: entry.name,
      path,
      children: await scanDirectory(entry, path, depth + 1, limits, state),
    })
  }

  // 目录优先，其余按中文文件名排序。
  return [...directories.sort(compareByName), ...files.sort(compareByName)]
}

export const scanNoteTree = async (
  root: FileSystemDirectoryHandle,
  options: ScanOptions = {},
): Promise<ScanResult> => {
  const limits: Required<ScanOptions> = {
    maxDepth: options.maxDepth ?? 6,
    maxFiles: options.maxFiles ?? 2000,
  }
  const state: ScanState = { fileCount: 0, truncated: false }
  const nodes = await scanDirectory(root, [], 0, limits, state)

  return { nodes, truncated: state.truncated }
}

export const flattenFiles = (nodes: NoteNode[]): NoteFileNode[] =>
  nodes.flatMap((node) =>
    node.kind === 'file' ? [node] : flattenFiles(node.children),
  )

export const joinPath = (path: string[]) => path.join('/')

export const relativeKey = (path: string[]) => `note:${path.join('/')}`

export const resolveDirectory = async (
  root: FileSystemDirectoryHandle,
  path: string[],
): Promise<FileSystemDirectoryHandle> => {
  let current = root

  for (const segment of path) {
    current = await current.getDirectoryHandle(segment)
  }

  return current
}
