import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  findResponsiveViolations,
  MAX_FIXED_WIDTH_PX,
  PRIMARY_BREAKPOINTS,
} from '../../scripts/quality/check-responsive.mjs'

const cliPath = fileURLToPath(
  new URL('../../scripts/quality/check-responsive.mjs', import.meta.url),
)

const createTestRoot = async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'blog-responsive-'))
  context.after(() => rm(root, { recursive: true, force: true }))
  return root
}

const writeSource = async (root, relativePath, content) => {
  const path = join(root, relativePath)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

const runCli = (root) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, root])
    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code, signal) => {
      if (signal) {
        reject(new Error(`CLI exited with signal ${signal}`))
        return
      }

      resolve({ code, stdout, stderr })
    })
  })

test('主干断点为 768 / 1024 / 1440，固定宽度上限为 480px', () => {
  assert.deepEqual([...PRIMARY_BREAKPOINTS].sort((a, b) => a - b), [
    768, 1024, 1440,
  ])
  assert.equal(MAX_FIXED_WIDTH_PX, 480)
})

test('符合主干断点的样式与脚本不报错', async (context) => {
  const root = await createTestRoot(context)
  await writeSource(
    root,
    'src/pages/Home/HomePage.css',
    [
      '@media (max-width: 768px) {',
      '  .home-page__hero {',
      '    min-height: 32rem;',
      '  }',
      '}',
      '@media (width >= 1440px) {',
      '  .home-page__hero {',
      '    min-height: 40rem;',
      '  }',
      '}',
      '',
    ].join('\n'),
  )
  await writeSource(
    root,
    'src/components/ScrollIndicator/index.tsx',
    'const MOBILE_BREAKPOINT = 768\n',
  )

  assert.deepEqual(await findResponsiveViolations(root), [])
})

test('拒绝非主干断点，但放行登记的遗留断点', async (context) => {
  const root = await createTestRoot(context)
  await writeSource(
    root,
    'src/pages/Home/HomePage.css',
    '@media (max-width: 900px) {\n  .a { color: red; }\n}\n',
  )
  await writeSource(
    root,
    'src/components/HomePanels/DetailPanel/DetailPanelCard.css',
    '@media (max-width: 1200px) {\n  .a { color: red; }\n}\n',
  )

  const violations = await findResponsiveViolations(root)

  assert.deepEqual(
    violations.map((violation) => [violation.path, violation.line]),
    [['src/pages/Home/HomePage.css', 1]],
  )
  assert.match(violations[0].message, /非主干断点 900px/)
})

test('拒绝写死 px 的字号与过大的固定宽度', async (context) => {
  const root = await createTestRoot(context)
  await writeSource(
    root,
    'src/index.css',
    [
      '.title {',
      '  font-size: 24px;',
      '}',
      '.card {',
      '  width: 900px;',
      '}',
      '.avatar {',
      '  min-width: 520px;',
      '}',
      '',
    ].join('\n'),
  )

  const violations = await findResponsiveViolations(root)

  assert.deepEqual(
    violations.map((violation) => violation.line),
    [2, 5, 8],
  )
})

test('拒绝内联样式写死的 px 尺寸', async (context) => {
  const root = await createTestRoot(context)
  await writeSource(
    root,
    'src/components/Demo/index.tsx',
    'export const Demo = () => <div style={{ width: \'320px\' }} />\n',
  )

  const violations = await findResponsiveViolations(root)

  assert.equal(violations.length, 1)
  assert.match(violations[0].message, /内联样式写死了 width/)
})

test('注释中的媒体查询不参与校验', async (context) => {
  const root = await createTestRoot(context)
  await writeSource(
    root,
    'src/index.css',
    '/* @media (max-width: 600px) { .a { color: red; } } */\n.a { color: blue; }\n',
  )

  assert.deepEqual(await findResponsiveViolations(root), [])
})

test('CLI 根据扫描结果设置退出码并输出问题位置', async (context) => {
  const root = await createTestRoot(context)
  const validRoot = join(root, 'valid')
  const invalidRoot = join(root, 'invalid')
  await writeSource(
    validRoot,
    'src/index.css',
    '@media (max-width: 768px) {\n  .a { color: red; }\n}\n',
  )
  await writeSource(
    invalidRoot,
    'src/index.css',
    '@media (max-width: 768px) {\n  .a { width: 900px; }\n}\n',
  )

  assert.deepEqual(await runCli(validRoot), {
    code: 0,
    stdout: '',
    stderr: '',
  })

  const invalidResult = await runCli(invalidRoot)
  assert.equal(invalidResult.code, 1)
  assert.equal(invalidResult.stdout, '')
  assert.match(invalidResult.stderr, /src\/index\.css:2: /)
})
