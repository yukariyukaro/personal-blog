import Navbar from './components/Navbar'
import Live2DWidget from './components/Live2DWidget'
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { navigationItems } from './app/navigation/navigationConfig'
import { updateSEO } from './utils/seo'

function App() {
  const location = useLocation()
  const pathname = location.pathname.toLowerCase()
  const activeNavigationItem = navigationItems.find(
    (item) => item.path.toLowerCase() === pathname,
  )
  const showNavbar = pathname === '/' || Boolean(activeNavigationItem)

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
      <Navbar visible={showNavbar} activeItemId={activeNavigationItem?.id} />
      <Outlet />
      <Live2DWidget />
    </>
  )
}

export default App
