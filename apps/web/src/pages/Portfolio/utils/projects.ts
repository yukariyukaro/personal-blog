import { resolvePublicAsset } from '../../../utils/baseUrl'

export type PortfolioProject = {
  id: string
  title: string
  englishTitle: string
  category: string
  code: string
  summary: string
  tags: readonly string[]
  artwork: 'community' | 'report' | 'migration' | 'warehouse'
  description: string
  role: string
  link: string
  linkLabel: string
} & (
  | { image: string; imageType: 'landscape' | 'portrait' }
  | { image?: undefined; imageType?: undefined }
)

export const PROJECTS: readonly PortfolioProject[] = [
  {
    id: 'triple-uni',
    title: 'Triple Uni',
    englishTitle: 'TRIPLE\nUNI',
    category: '社区 / WEB & 小程序',
    code: 'COMMUNITY PLATFORM',
    summary: '三所大学，一个交流的小宇宙。',
    tags: ['社区平台', '微信小程序', 'Web'],
    image: resolvePublicAsset('Detail/TripleUni.webp'),
    imageType: 'landscape',
    artwork: 'community',
    description: 'Triple Uni 是接通香港大学“HKU噗噗”、香港中文大学“马料水哔哔机”及香港科技大学“科大星尘”的三校匿名树洞社交平台，拥有30K+注册用户和高频的日活跃度，旨在打造港校交流的小宇宙。',
    role: '参与微信小程序端和Web端的开发与日常维护。',
    link: 'https://tripleuni.com/landing/?callback=%2Fhome',
    linkLabel: '访问项目',
  },
  {
    id: 'annual-report',
    title: '2025年度总结',
    englishTitle: 'ANNUAL\nREPORT',
    category: '叙事 / DATA & MOTION',
    code: '2025 YEAR IN REVIEW',
    summary: '把一年的互动，写成专属的回忆。',
    tags: ['年度报告', '动画交互', '数据可视化'],
    image: resolvePublicAsset('Detail/YearReport.webp'),
    imageType: 'portrait',
    artwork: 'report',
    description: '作为 Triple Uni 社区的年终重磅活动，该项目通过抓取和分析用户在过去一年中的树洞发布、评论、私信等互动数据，为每位用户生成专属的年度报告，增强社区粘性与用户归属感。',
    role: '独立负责2025年度总结的前端开发。实现了复杂的动画交互与数据可视化展示。',
    link: 'https://yukariyukaro.github.io/2025EndYearReport/',
    linkLabel: '访问项目',
  },
  {
    id: 'yugong',
    title: '愚公迁移工具',
    englishTitle: 'MOVE\nFORWARD',
    category: '工程 / DATA MIGRATION',
    code: 'YUGONG / BYTEHOUSE',
    summary: '让复杂的数据迁移，有迹可循。',
    tags: ['React', 'TypeScript', '状态机', 'Formily'],
    artwork: 'migration',
    description: '愚公迁移工具是火山引擎 ByteHouse 自研的一站式数据迁移工具，支持将多数据源（如 ClickHouse、Doris、Hologres 等）平滑迁移至 ByteHouse 企业版，提供全量与增量迁移能力，助力企业实现数据迁移全生命周期的规范化管理。',
    role: '独立负责项目前端开发。引入状态机重构了迁移任务的创建流程，实现了可自定义的工作流，减少了过千行重复代码；使用 React + TypeScript 开发了规则管理、SQL迁移助手等核心模块；并使用 Formily 处理复杂表单的动态 Schema，极大优化了渲染性能。',
    link: 'https://www.volcengine.com/docs/6464/1874997',
    linkLabel: '查看产品文档',
  },
  {
    id: 'bytehouse',
    title: '火山引擎ByteHouse 官网',
    englishTitle: 'BYTE\nHOUSE',
    category: '产品 / CLOUD WAREHOUSE',
    code: 'CLOUD NATIVE / WEBSITE',
    summary: '面向海量数据，打磨每一次体验。',
    tags: ['官网维护', '动态导入', 'Smart-Table'],
    artwork: 'warehouse',
    description: 'ByteHouse 是字节跳动火山引擎旗下的一款云原生数据仓库产品，提供极速的交互式分析体验，支撑实时数据分析和海量离线数据分析，具备便捷的弹性扩缩容能力与极致的分析性能。',
    role: '参与官网项目的日常维护，累计修复 20+ Bug 并完成 10+ 业务需求。在此期间，通过引入 React.lazy 和 import() 对项目的大型依赖包进行动态导入，成功将首屏加载速度提升近 30%。同时参与维护了数据平台的 Smart-Table 智能表格组件库。',
    link: 'https://www.volcengine.com/docs/6517/76325?lang=zh',
    linkLabel: '查看产品文档',
  },
]

export const getProjectIndex = (id: string | null | undefined) => PROJECTS.findIndex(project => project.id === id)
export const normalizeProjectIndex = (index: number) => ((index % PROJECTS.length) + PROJECTS.length) % PROJECTS.length
export const getFileNumber = (index: number) => String(index + 1).padStart(2, '0')
export const getCardSlot = (index: number, activeIndex: number) => {
  const offset = normalizeProjectIndex(index - activeIndex)
  return offset > PROJECTS.length / 2 ? offset - PROJECTS.length : offset
}
