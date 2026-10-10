import PanelPageLayout from '../../components/PanelPageLayout'
import PortfolioStage from './components/PortfolioStage'
import usePortfolioController from './hooks/usePortfolioController'
import './styles/PortfolioPage.css'

function Portfolio() {
  const controller = usePortfolioController()

  return (
    <PanelPageLayout currentIndex={2}>
      <PortfolioStage controller={controller} />
    </PanelPageLayout>
  )
}

export default Portfolio
