import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildContent } from './content/build-content.mjs'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = resolve(appRoot, '../..')

await buildContent({
  postsRoot: join(repositoryRoot, 'blog-content/posts'),
  outputRoot: join(appRoot, 'public/content'),
  includeDrafts: process.argv.slice(2).includes('--include-drafts'),
})
