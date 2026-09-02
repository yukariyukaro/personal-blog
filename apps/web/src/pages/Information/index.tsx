import IntroPanel from '../../components/HomePanels/IntroPanel'
import PanelPageLayout from '../../components/PanelPageLayout'

function Information() {
  return (
    <PanelPageLayout currentIndex={1}>
      <section className="home-panel home-panel--current" aria-label="home intro panel">
        <IntroPanel />
      </section>
    </PanelPageLayout>
  )
}

export default Information
