import { describe, expect, it } from 'vitest'
import {
  flattenFiles,
  isIgnoredDirectory,
  isMarkdownFile,
  relativeKey,
  scanNoteTree,
} from '../../src/components/MarkdownEditor/lib/fileTree'

type FakeEntry =
  | { kind: 'file'; name: string }
  | { kind: 'dir'; name: string; children?: FakeEntry[] }

const createFileHandle = (name: string) =>
  ({
    kind: 'file',
    name,
    getFile: async () => ({ text: async () => '' }),
  }) as unknown as FileSystemFileHandle

const createDirectoryHandle = (
  entries: FakeEntry[],
  name: string,
): FileSystemDirectoryHandle =>
  ({
    kind: 'directory',
    name,
    values: async function* values() {
      for (const entry of entries) {
        yield entry.kind === 'file'
          ? createFileHandle(entry.name)
          : createDirectoryHandle(entry.children ?? [], entry.name)
      }
    },
  }) as unknown as FileSystemDirectoryHandle

describe('isMarkdownFile', () => {
  it.each(['a.md', 'NOTE.MARKDOWN', '积分.md'])('识别 %s', (name) => {
    expect(isMarkdownFile(name)).toBe(true)
  })

  it.each(['a.txt', 'a.md.bak', 'markdown', 'a.mdx'])('排除 %s', (name) => {
    expect(isMarkdownFile(name)).toBe(false)
  })
})

describe('isIgnoredDirectory', () => {
  it.each(['.git', '.obsidian', 'node_modules'])('跳过 %s', (name) => {
    expect(isIgnoredDirectory(name)).toBe(true)
  })

  it('保留普通目录', () => {
    expect(isIgnoredDirectory('数学')).toBe(false)
  })
})

describe('scanNoteTree', () => {
  it('目录优先、按名称排序，并跳过忽略目录与非 Markdown 文件', async () => {
    const root = createDirectoryHandle(
      [
        { kind: 'file', name: 'b.md' },
        { kind: 'file', name: 'a.md' },
        { kind: 'file', name: 'cover.png' },
        {
          kind: 'dir',
          name: 'notes',
          children: [{ kind: 'file', name: 'c.md' }],
        },
        {
          kind: 'dir',
          name: 'node_modules',
          children: [{ kind: 'file', name: 'd.md' }],
        },
      ],
      'root',
    )

    const result = await scanNoteTree(root)

    expect(result.truncated).toBe(false)
    expect(result.nodes.map((node) => node.name)).toEqual([
      'notes',
      'a.md',
      'b.md',
    ])
    expect(flattenFiles(result.nodes).map((node) => node.name)).toEqual([
      'c.md',
      'a.md',
      'b.md',
    ])
  })

  it('超过文件数上限时标记截断', async () => {
    const root = createDirectoryHandle(
      Array.from({ length: 5 }, (_, index) => ({
        kind: 'file' as const,
        name: `n-${index}.md`,
      })),
      'many',
    )

    const result = await scanNoteTree(root, { maxFiles: 2 })

    expect(result.truncated).toBe(true)
    expect(flattenFiles(result.nodes)).toHaveLength(2)
  })
})

describe('relativeKey', () => {
  it('生成可持久化的草稿键', () => {
    expect(relativeKey(['数学', '积分.md'])).toBe('note:数学/积分.md')
  })
})
