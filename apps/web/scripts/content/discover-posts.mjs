import { readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'

const markdownExtensions = new Set(['.md', '.mdx'])

export const discoverPosts = async (postsRoot) => {
  const entries = await readdir(postsRoot, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(postsRoot, entry.name)
      if (entry.isDirectory()) {
        return discoverPosts(entryPath)
      }
      if (
        entry.isFile() &&
        markdownExtensions.has(extname(entry.name).toLowerCase()) &&
        entry.name.toLowerCase() !== 'readme.md'
      ) {
        return [entryPath]
      }
      return []
    }),
  )

  return files.flat().sort()
}
