import { useState, useRef, useEffect } from 'react'
import { resolvePublicAsset } from '../../../utils/baseUrl'
import './DetailPanel.css'

// 作品数据
const PROJECTS = [
  {
    id: 'project-triple-uni',
    title: 'Triple Uni',
    bgImage: resolvePublicAsset('home/home.webp'),
    previewImage: resolvePublicAsset('Detail/TripleUni.webp'),
    previewType: 'landscape',
    description: 'Triple Uni 是接通香港大学“HKU噗噗”、香港中文大学“马料水哔哔机”及香港科技大学“科大星尘”的三校匿名树洞社交平台，拥有30K+注册用户和高频的日活跃度，旨在打造港校交流的小宇宙。',
    role: '参与微信小程序端和Web端的开发与日常维护。',
    link: 'https://tripleuni.com/landing/?callback=%2Fhome'
  },
  {
    id: 'project-annual-report',
    title: '2025年度总结',
    bgImage: resolvePublicAsset('information/background.webp'),
    previewImage: resolvePublicAsset('Detail/YearReport.webp'),
    previewType: 'portrait',
    description: '作为 Triple Uni 社区的年终重磅活动，该项目通过抓取和分析用户在过去一年中的树洞发布、评论、私信等互动数据，为每位用户生成专属的年度报告，增强社区粘性与用户归属感。',
    role: '独立负责2025年度总结的前端开发。实现了复杂的动画交互与数据可视化展示。',
    link: 'https://yukariyukaro.github.io/2025EndYearReport/'
  },
  {
    id: 'project-yugong',
    title: '愚公迁移工具',
    bgImage: resolvePublicAsset('home/home.webp'),
    description: '愚公迁移工具是火山引擎 ByteHouse 自研的一站式数据迁移工具，支持将多数据源（如 ClickHouse、Doris、Hologres 等）平滑迁移至 ByteHouse 企业版，提供全量与增量迁移能力，助力企业实现数据迁移全生命周期的规范化管理。',
    role: '独立负责项目前端开发。引入状态机重构了迁移任务的创建流程，实现了可自定义的工作流，减少了过千行重复代码；使用 React + TypeScript 开发了规则管理、SQL迁移助手等核心模块；并使用 Formily 处理复杂表单的动态 Schema，极大优化了渲染性能。',
    link: 'https://www.volcengine.com/docs/6464/1874997'
  },
  {
    id: 'project-bytehouse-web',
    title: '火山引擎ByteHouse 官网',
    bgImage: resolvePublicAsset('information/background.webp'),
    description: 'ByteHouse 是字节跳动火山引擎旗下的一款云原生数据仓库产品，提供极速的交互式分析体验，支撑实时数据分析和海量离线数据分析，具备便捷的弹性扩缩容能力与极致的分析性能。',
    role: '参与官网项目的日常维护，累计修复 20+ Bug 并完成 10+ 业务需求。在此期间，通过引入 React.lazy 和 import() 对项目的大型依赖包进行动态导入，成功将首屏加载速度提升近 30%。同时参与维护了数据平台的 Smart-Table 智能表格组件库。',
    link: 'https://www.volcengine.com/docs/6517/76325?lang=zh'
  }
]

function DetailPanel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const hoverIndexRef = useRef<number | null>(null)

  // 同步 hoverIndex 到 ref 中，以便在 requestAnimationFrame 中读取最新值而不需要重新绑定
  useEffect(() => {
    hoverIndexRef.current = hoverIndex
  }, [hoverIndex])
  
  // 用于追踪鼠标位置和 DOM 的 ref
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const previewRefs = useRef<(HTMLDivElement | null)[]>([])
  
  const targetPosRef = useRef({ x: 0, y: 0 })
  const currentPosRef = useRef({ x: 0, y: 0 })
  const rafIdRef = useRef<number>(0)
  const isFirstHoverRef = useRef(true)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!leftPanelRef.current) return
      
      // 计算鼠标相对于左侧容器的位置
      const rect = leftPanelRef.current.getBoundingClientRect()
      targetPosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      
      // 第一次进入时，将当前位置直接吸附到目标位置，避免从 (0,0) 飞入
      if (isFirstHoverRef.current) {
        currentPosRef.current = { ...targetPosRef.current }
        isFirstHoverRef.current = false
      }
    }

    const panelElement = leftPanelRef.current
    if (panelElement) {
      panelElement.addEventListener('mousemove', handleMouseMove)
    }

    // 独立的动画循环，脱离 React 状态更新，极大提升性能
    const loop = () => {
      // 缓动系数
      const easing = 0.15
      currentPosRef.current.x += (targetPosRef.current.x - currentPosRef.current.x) * easing
      currentPosRef.current.y += (targetPosRef.current.y - currentPosRef.current.y) * easing

      // 直接操作 DOM 元素的 transform
      previewRefs.current.forEach((el, index) => {
        if (el) {
          const isHovered = index === hoverIndexRef.current
          el.style.transform = `translate(${currentPosRef.current.x + 20}px, ${currentPosRef.current.y - 100}px) ${isHovered ? 'scale(1)' : 'scale(0.95)'}`
        }
      })
      
      rafIdRef.current = requestAnimationFrame(loop)
    }
    
    rafIdRef.current = requestAnimationFrame(loop)

    return () => {
      if (panelElement) {
        panelElement.removeEventListener('mousemove', handleMouseMove)
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  // 当鼠标离开所有列表项时，重置 isFirstHoverRef
  useEffect(() => {
    if (hoverIndex === null) {
      isFirstHoverRef.current = true
    }
  }, [hoverIndex])

  // 实际展示的索引：如果处于悬停状态则展示悬停的项目，否则展示当前点击激活的项目
  const displayIndex = hoverIndex !== null ? hoverIndex : activeIndex
  const currentProject = PROJECTS[displayIndex]

  return (
    <section className="detail-panel" aria-label="portfolio detail panel">
      {/* 动态背景层 */}
      <div className="detail-panel__bg-container">
        {PROJECTS.map((project, index) => (
          <div
            key={`bg-${project.id}`}
            className={`detail-panel__bg ${index === displayIndex ? 'is-active' : ''}`}
            style={{ backgroundImage: `url(${project.bgImage})` }}
            aria-hidden="true"
          />
        ))}
        <div className="detail-panel__bg-overlay" />
      </div>

      {/* 左侧：作品列表抽屉 */}
      <div className="detail-panel__left" ref={leftPanelRef}>
        <div className="detail-menu" role="tablist" aria-orientation="vertical">
          {PROJECTS.map((project, index) => {
            const isActive = index === activeIndex

            return (
              <div
                key={project.id}
                role="tab"
                aria-selected={isActive}
                className={`detail-menu__item ${isActive ? 'is-active' : ''}`}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() => setActiveIndex(index)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveIndex(index)
                  }
                }}
              >
                <div className="detail-menu__item-header">
                  <span className="detail-menu__icon">◇</span>
                  <span className="detail-menu__title">{project.title}</span>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* 将预览图容器移出循环，作为独立的跟随鼠标元素 */}
        {PROJECTS.map((project, index) => {
          if (!project.previewImage) {
            return null
          }
          
          const isHovered = index === hoverIndex
          
          return (
            <div 
              key={`preview-${project.id}`}
              ref={(el) => {
                previewRefs.current[index] = el
              }}
              className={`detail-menu__preview-container ${isHovered ? 'is-visible' : ''} type-${project.previewType}`}
            >
              <div className="detail-menu__preview-wrapper">
                <img 
                  src={project.previewImage} 
                  alt={`${project.title} preview`} 
                  className="detail-menu__preview-img"
                />
                <div className="detail-menu__preview-overlay"></div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 右侧：详情卡片 */}
      <div className="detail-panel__right">
        <div className="detail-card-wrapper">
          {/* 使用 key 强制重新渲染以触发动画 */}
          <article className="detail-card" key={currentProject.id}>
            <header className="detail-card__header">
              <span className="detail-card__index">
                {String(displayIndex + 1).padStart(2, '0')}
              </span>
              <div className="detail-card__header-text">
                <span className="detail-card__label">PROJECT FILE</span>
                <h3 className="detail-card__header-title">{currentProject.title}</h3>
              </div>
            </header>

            <div className="detail-card__body">
              <section className="detail-card__section">
                <h4 className="detail-card__section-title">项目背景 / BACKGROUND</h4>
                <p className="detail-card__text">{currentProject.description}</p>
              </section>

              <section className="detail-card__section">
                <h4 className="detail-card__section-title">个人职责 / RESPONSIBILITIES</h4>
                <p className="detail-card__text">{currentProject.role}</p>
              </section>

              {currentProject.link && (
                <div className="detail-card__action">
                  <a 
                    href={currentProject.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="detail-card__btn"
                    aria-label={`了解更多关于 ${currentProject.title} 的信息`}
                  >
                    <span className="detail-card__btn-text">了解详情</span>
                    <span className="detail-card__btn-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </span>
                  </a>
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export default DetailPanel
