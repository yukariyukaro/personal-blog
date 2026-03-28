import Navbar from './components/Navbar'
import { Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'

export type AppContextType = {
  activeStateIndex: number
  setActiveStateIndex: (index: number) => void
}

function App() {
  const location = useLocation()
  const pathname = location.pathname.toLowerCase()
  const showNavbar = pathname === '/' || pathname.startsWith('/home')
  
  const [activeStateIndex, setActiveStateIndex] = useState(0)

  return (
    <>
      <Navbar visible={showNavbar} activeIndex={activeStateIndex} onNavigate={setActiveStateIndex} />
      <Outlet context={{ activeStateIndex, setActiveStateIndex } satisfies AppContextType} />
    </>
  )
}

export default App
