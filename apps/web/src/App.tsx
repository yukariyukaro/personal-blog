import Navbar from './components/Navbar'
import Live2DWidget from './components/Live2DWidget'
import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { navigationItems } from './config/navigationConfig'
import { updateSEO } from './utils/seo'

function App() {
  const location = useLocation()
  const pathname = location.pathname.toLowerCase()
  const activeNavigationItem = navigationItems.find(
    (item) => item.path.toLowerCase() === pathname,
  )
  // 文章详情页为独立路由，仍需展示导航栏，并让「首页」保持高亮（列表页是它的上级页面）。
  const isArticleRoute = pathname.startsWith('/post/')
  const showNavbar =
    pathname === '/' || Boolean(activeNavigationItem) || isArticleRoute
  // 写作台为全屏沉浸式工作台，左下角不需要 Live2D 挂件遮挡。
  const showLive2D = pathname !== '/editor'

  useEffect(() => {
    const pageSEO = {
      '/home': {
        title: '娄宿三 | 个人博客',
        description: '整理前端、计算机基础与工程实践的个人知识空间。',
        keywords: '个人博客,前端,React,计算机基础,工程实践',
      },
      '/information': {
        title: '关于娄宿三 | 个人博客',
        description: '了解娄宿三的个人经历、兴趣和技术方向。',
        keywords: '娄宿三,个人介绍,前端开发者',
      },
      '/portfolio': {
        title: '作品集 | 娄宿三',
        description: '前端项目、数据产品和交互实验作品集。',
        keywords: '作品集,前端项目,React,数据产品',
      },
    }[pathname as '/home' | '/information' | '/portfolio']

    if (pageSEO) {
      updateSEO(pageSEO)
    }
  }, [pathname])

  return (
    <>
      <Navbar
        visible={showNavbar}
        activeItemId={isArticleRoute ? 'home' : activeNavigationItem?.id}
      />
      <Suspense fallback={<div className="route-fallback" aria-hidden="true" />}>
        <Outlet />
      </Suspense>
      {showLive2D ? <Live2DWidget /> : null}
    </>
  )
}

export default App
