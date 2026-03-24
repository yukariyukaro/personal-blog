import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom'
import routes from '~react-pages'
import '@radix-ui/themes/styles.css'
import { Theme } from '@radix-ui/themes'
import AppBootstrap from './AppBootstrap'
import { BASE_URL } from './utils/baseUrl'
import './index.css'

const router = createBrowserRouter(routes, {
  basename: BASE_URL,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme appearance="dark" accentColor="teal" grayColor="slate" radius="large">
      <Suspense fallback={<p>Loading...</p>}>
        <AppBootstrap>
          <RouterProvider router={router} />
        </AppBootstrap>
      </Suspense>
    </Theme>
  </StrictMode>,
)
