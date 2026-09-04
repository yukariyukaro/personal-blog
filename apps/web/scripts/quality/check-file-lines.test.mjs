import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import {
  findOversizedCodeFiles,
  MAX_CODE_LINES,
} from './check-file-lines.mjs'

const makeLines = (count) =>
  Array.from({ length: count }, (_, index) => `line ${index + 1}`).join('\n')

const createTestRoot = async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'blog-line-limit-'))
  context.after(() => rm(root, { recursive: true, force: true }))
  return root
}

const writeLines = async (root, relativePath, count) => {
  const path = join(root, relativePath)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, makeLines(count))
}

test('代码文件最多允许 500 行', async (context) => {
  const root = await createTestRoot(context)
  await writeLines(root, 'src/valid.ts', 500)
  await writeLines(root, 'src/invalid.css', 501)

  assert.equal(MAX_CODE_LINES, 500)
  assert.deepEqual(await findOversizedCodeFiles(root), [
    { path: 'src/invalid.css', lines: 501 },
  ])
})

test('只检查支持的代码文件并排除生成目录', async (context) => {
  const root = await createTestRoot(context)
  const extensions = [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.mjs',
    '.cjs',
    '.css',
    '.scss',
    '.styl',
  ]

  await Promise.all([
    ...extensions.map((extension) =>
      writeLines(root, `src/oversized${extension}`, 501),
    ),
    writeLines(root, 'src/article.md', 501),
    writeLines(root, 'src/data.json', 501),
    writeLines(root, 'node_modules/package/index.ts', 501),
    writeLines(root, 'dist/index.js', 501),
    writeLines(root, 'output/report.js', 501),
    writeLines(root, 'public/content/generated.ts', 501),
  ])

  assert.deepEqual(
    await findOversizedCodeFiles(root),
    extensions
      .map((extension) => ({
        path: `src/oversized${extension}`,
        lines: 501,
      }))
      .sort((left, right) => left.path.localeCompare(right.path)),
  )
})
