import Navbar from './components/Navbar'
import { Outlet, useLocation } from 'react-router-dom'

const NAV_PATHS = ['/home', '/information', '/portfolio']

function App() {
  const location = useLocation()
  const pathname = location.pathname.toLowerCase()
  const activeIndex = NAV_PATHS.indexOf(pathname)
  const showNavbar = pathname === '/' || activeIndex >= 0

  return (
    <>
      <Navbar visible={showNavbar} activeIndex={Math.max(activeIndex, 0)} />
      <Outlet />
    </>
  )
}

export default App
