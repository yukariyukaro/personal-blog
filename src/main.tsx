import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createHashRouter,
  RouterProvider,
} from 'react-router-dom'
import routes from '~react-pages'
import '@radix-ui/themes/styles.css'
import { Theme } from '@radix-ui/themes'
import AppBootstrap from './AppBootstrap'
import './index.css'

const router = createHashRouter(routes)

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
