import type { ReactNode } from 'react'
import ScrollIndicator from '../ScrollIndicator'
import SideIndicator from '../SideIndicator'
import './PanelPageLayout.css'

const PANEL_TITLES = [
  { en: 'HOMEPAGE', zh: '首页' },
  { en: 'INFORMATION', zh: '介绍' },
  { en: 'PORTFOLIO', zh: '作品' },
]

type PanelPageLayoutProps = {
  currentIndex: number
  children: ReactNode
}

function PanelPageLayout({ currentIndex, children }: PanelPageLayoutProps) {
  return (
    <main className="home-container">
      <ScrollIndicator visible={currentIndex < PANEL_TITLES.length - 1} />

      <div className="home-panels">{children}</div>

      <SideIndicator
        currentIndex={currentIndex}
        total={PANEL_TITLES.length}
        titles={PANEL_TITLES}
      />
    </main>
  )
}

export default PanelPageLayout
