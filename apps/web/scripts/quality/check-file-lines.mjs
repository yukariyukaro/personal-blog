import { readdir, readFile } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const CODE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
  '.styl',
])
const IGNORED_DIRECTORY_NAMES = new Set(['node_modules', 'dist', 'output'])
const IGNORED_DIRECTORY_PATHS = new Set(['public/content'])

export const MAX_CODE_LINES = 500

const toPortablePath = (path) => path.split(sep).join('/')

const isIgnoredDirectory = (name, relativePath) =>
  IGNORED_DIRECTORY_NAMES.has(name) ||
  IGNORED_DIRECTORY_PATHS.has(toPortablePath(relativePath))

const collectCodeFiles = async (root, directory = root) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = resolve(directory, entry.name)

    if (entry.isDirectory()) {
      if (!isIgnoredDirectory(entry.name, relative(root, path))) {
        files.push(...(await collectCodeFiles(root, path)))
      }
    } else if (entry.isFile() && CODE_EXTENSIONS.has(extname(entry.name))) {
      files.push(path)
    }
  }

  return files
}

const countLines = (source) => {
  if (source.length === 0) return 0

  const lineBreaks = source.match(/\r\n|\r|\n/g)?.length ?? 0
  return lineBreaks + (source.endsWith('\n') || source.endsWith('\r') ? 0 : 1)
}

export const findOversizedCodeFiles = async (root) => {
  const absoluteRoot = resolve(root)
  const files = await collectCodeFiles(absoluteRoot)
  const oversizedFiles = []

  for (const path of files) {
    const lines = countLines(await readFile(path, 'utf8'))

    if (lines > MAX_CODE_LINES) {
      oversizedFiles.push({
        path: toPortablePath(relative(absoluteRoot, path)),
        lines,
      })
    }
  }

  return oversizedFiles.sort((left, right) =>
    left.path.localeCompare(right.path),
  )
}

const scriptPath = fileURLToPath(import.meta.url)
const isCli = process.argv[1] && resolve(process.argv[1]) === scriptPath

if (isCli) {
  const appRoot = fileURLToPath(new URL('../..', import.meta.url))
  const oversizedFiles = await findOversizedCodeFiles(appRoot)

  for (const file of oversizedFiles) {
    console.error(`${file.path}: ${file.lines} lines`)
  }

  if (oversizedFiles.length > 0) {
    process.exitCode = 1
  }
}
