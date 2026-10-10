import { EventEmitter } from 'node:events'
import { describe, expect, it } from 'vitest'
import { resolveConfig } from 'vite'
import { PageContext } from 'vite-plugin-pages'
import type { ReactRoute } from 'vite-plugin-pages'
import { PAGE_ROUTE_EXCLUDES } from '../../vite.config'

function getRouteModules(routes: ReactRoute[]): string[] {
  return routes.flatMap(route => [
    ...(route.element ? [route.element.replaceAll('\\', '/').replace(/^.*\/src\/pages\//, '')] : []),
    ...getRouteModules(route.children ?? []),
  ])
}

describe('页面路由扫描', () => {
  it('开发监听新增文件时也排除私有目录、测试文件与声明文件', async () => {
    const context = new PageContext({ resolver: 'react', exclude: PAGE_ROUTE_EXCLUDES }, process.cwd())
    const watcher = new EventEmitter()
    context.setupWatcher(watcher as Parameters<PageContext['setupWatcher']>[0])
    const listeners = watcher.listeners('add') as ((path: string) => Promise<void>)[]
    const notifyAdd = async (path: string) => {
      for (const listener of listeners) await listener(path)
    }
    for (const path of [
      'Portfolio/components/ProjectDeck/index.tsx',
      'Portfolio/hooks/usePortfolioController.ts',
      'Portfolio/utils/projects.ts',
      'Portfolio/styles/layout.ts',
      'Portfolio/index.test.tsx',
      'Portfolio/types.d.ts',
    ]) {
      await notifyAdd(`${process.cwd()}/src/pages/${path}`)
      await notifyAdd(`${process.cwd()}/src/pages/${path}`.replaceAll('/', '\\'))
    }
    expect(context.pageRouteMap.size).toBe(0)
    await notifyAdd(`${process.cwd()}/src/pages/Portfolio/index.tsx`)
    expect(context.pageRouteMap.size).toBe(1)
  })

  it('真实 Vite 配置只扫描页面入口，不将页面私有代码注册为路由', async () => {
    const config = await resolveConfig({ root: process.cwd() }, 'build')
    const plugin = config.plugins.find(candidate => candidate.name === 'vite-plugin-pages')
    const api = plugin?.api as { getResolvedRoutes: () => Promise<ReactRoute[]> } | undefined
    if (!api) throw new Error('未找到文件式路由插件')
    const modules = getRouteModules(await api.getResolvedRoutes()).sort()
    expect(modules).toEqual([
      'Editor/index.tsx',
      'Home/index.tsx',
      'Information/index.tsx',
      'Portfolio/index.tsx',
      'Post/[slug].tsx',
      '[...all].tsx',
      'index.tsx',
    ].sort())
  })
})
