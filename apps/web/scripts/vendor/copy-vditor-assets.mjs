import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(scriptDirectory, '../..')
const sourceDirectory = join(appRoot, 'node_modules/vditor/dist')
const targetDirectory = join(appRoot, 'public/vendor/vditor/dist')

const countFiles = async (directory) => {
  let total = 0
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    total += entry.isDirectory()
      ? await countFiles(join(directory, entry.name))
      : 1
  }

  return total
}

const main = async () => {
  try {
    await stat(sourceDirectory)
  } catch {
    console.error(
      `[vendor:sync] 未找到 Vditor 资源目录：${sourceDirectory}\n请先在仓库根目录执行 pnpm install。`,
    )
    process.exitCode = 1
    return
  }

  // 先清理目标目录，保证重复执行结果一致（幂等）。
  await rm(targetDirectory, { recursive: true, force: true })
  await mkdir(dirname(targetDirectory), { recursive: true })
  // 保留 dist 层级：Vditor 运行时按 `${cdn}/dist/...` 拼接资源路径。
  await cp(sourceDirectory, targetDirectory, { recursive: true })

  const fileCount = await countFiles(targetDirectory)
  console.log(`[vendor:sync] 已复制 ${fileCount} 个文件到 ${targetDirectory}`)
}

await main()
