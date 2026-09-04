import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import routes from '~react-pages'
import App from './App'
import AppBootstrap from './AppBootstrap'
import './index.css'

let storedTheme: string | null = null
try {
  storedTheme = window.localStorage.getItem('blog-theme')
} catch {
  storedTheme = null
}
const initialTheme =
  storedTheme === 'light' || storedTheme === 'dark'
    ? storedTheme
    : window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
document.documentElement.dataset.theme = initialTheme

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: routes,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<p>Loading...</p>}>
      <AppBootstrap>
        <RouterProvider router={router} />
      </AppBootstrap>
    </Suspense>
  </StrictMode>,
)
