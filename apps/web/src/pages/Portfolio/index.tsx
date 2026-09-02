import DetailPanel from '../../components/HomePanels/DetailPanel'
import PanelPageLayout from '../../components/PanelPageLayout'

function Portfolio() {
  return (
    <PanelPageLayout currentIndex={2}>
      <section className="home-panel home-panel--current" aria-label="home detail panel">
        <DetailPanel />
      </section>
    </PanelPageLayout>
  )
}

export default Portfolio
