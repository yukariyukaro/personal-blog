import { useId, useState } from 'react'
import type { PortfolioProject } from '../../utils/projects'
import './ProjectArtwork.css'

type ProjectArtworkProps = {
  project: PortfolioProject
  className?: string
  onFallback?: () => void
}

const ARTWORK_CODES = {
  migration: 'SOURCE → DESTINATION',
  warehouse: 'WAREHOUSE / STRATIFIED',
  community: 'COMMUNITY / SHARED ORBITS',
  report: 'REPORT / YEAR IMPRESSIONS',
}

function GraphicArtwork({ project, className = '' }: ProjectArtworkProps) {
  const id = useId()
  const hatch = `url(#${id}-hatch)`
  const dots = `url(#${id}-dots)`

  return (
    <span className={`project-artwork project-artwork--graphic ${className}`} role="img" aria-label={`${project.title}原创几何封面，非产品截图`}>
      <svg className="project-artwork__drawing" viewBox="0 0 480 480" fill="none" aria-hidden="true" focusable="false">
        <defs>
          <pattern id={`${id}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
            <path className="project-artwork__engraving" d="M0 0V7" />
          </pattern>
          <pattern id={`${id}-dots`} width="12" height="12" patternUnits="userSpaceOnUse">
            <circle className="project-artwork__dot" cx="2" cy="2" r="1" />
          </pattern>
        </defs>
        <path className="project-artwork__paper" d="M0 0H480V480H0Z" />
        <path fill={dots} d="M48 56h84v60H48Z M348 354h84v70h-84Z" />
        <g className="project-artwork__registration">
          <path d="M48 144V48h96 M336 432h96v-96 M42 240h12 M48 234v12 M426 240h12 M432 234v12" />
          <path d="M160 48h48 M224 48h8 M48 336v48 M48 400v8 M272 432h48" />
          <circle cx="432" cy="48" r="6" /><path d="M422 48h20 M432 38v20" />
        </g>
        {project.artwork === 'migration' && <>
          <g className="project-artwork__construction">
            <path d="M68 346 382 124 M108 384 416 166 M122 110 362 374" strokeDasharray="3 9" />
            <ellipse cx="248" cy="236" rx="151" ry="97" transform="rotate(-35 248 236)" />
            <ellipse cx="248" cy="236" rx="174" ry="119" transform="rotate(-35 248 236)" strokeDasharray="1 9" />
          </g>
          <path className="project-artwork__orbit" d="M116 289C79 247 100 176 168 139C236 103 333 106 372 148C394 172 393 205 376 233" />
          <path className="project-artwork__shadow" d="m101 303 179-126-22-31 140-17-59 128-22-31-179 126Z" />
          <path className="project-artwork__solid" d="m91 287 179-126-22-31 140-17-59 128-22-31-179 126Z" />
          <path fill={hatch} d="m91 287 179-126 10 14-179 126Z" />
          <path className="project-artwork__incision" d="m123 283 160-113 M277 143l75-9-32 69" />
          <path className="project-artwork__orbit-front" d="M376 233C354 276 309 312 254 331C191 353 142 333 116 289" />
          <g className="project-artwork__fine">
            <path d="m84 320 29 41 M76 328l20 28 M69 338l12 16 M344 105l38-8 M352 88l22-5" />
            <path d="m176 360 9 15 M245 345l2 19 M313 316l10 14" />
            <circle cx="116" cy="289" r="7" /><circle cx="376" cy="233" r="5" />
          </g>
          <path className="project-artwork__solid" d="m73 274 12-8 8 12-12 8Z M144 254l7-5 5 7-7 5Z" />
        </>}
        {project.artwork === 'warehouse' && <>
          <g className="project-artwork__construction">
            <path d="m68 316 174-100 174 100-174 100Z M242 92v324 M98 150v170 M386 150v170" strokeDasharray="3 9" />
            <path d="m86 326 156 90 156-90 M242 416v14 M72 320l14 8 M398 328l14-8" />
          </g>
          {[294, 230, 166].map((y, layer) => <g key={y} transform={`translate(0 ${y})`}>
            <path className="project-artwork__left-face" d="m110 0 132 76v26L110 26Z" />
            <path className="project-artwork__right-face" d="m242 76 132-76v26l-132 76Z" />
            <path fill={hatch} d="m110 0 132 76v26L110 26Z" />
            <path className={layer === 2 ? 'project-artwork__top-face project-artwork__top-face--lit' : 'project-artwork__top-face'} d="m110 0 132-76L374 0 242 76Z" />
            <path className="project-artwork__fine" d="m110 0 132 76L374 0 M242 76v26 M110 26l132 76 132-76" />
            <path className="project-artwork__shelf" d="m132 18 91 53 M260 71l92-53" />
            <path className="project-artwork__construction" d="m143 0 99-57 99 57-99 57Z M176-38l132 76 M209-57l132 76 M143-19l132 76" />
            <path className="project-artwork__solid" d="m301 40 8-5v7l-8 5Z m16-9 8-5v7l-8 5Z" />
          </g>)}
          <path className="project-artwork__solid" d="m209 147 33-19 33 19-33 19Z" />
          <path className="project-artwork__incision" d="m227 147 15-9 15 9 M242 142v12" />
          <g className="project-artwork__fine">
            <path d="M76 180v110 M70 180h12 M70 290h12 M402 242v-96 M396 242h12 M396 146h12" />
            <circle cx="242" cy="416" r="4" />
          </g>
        </>}
        {project.artwork === 'community' && <>
          <g className="project-artwork__construction"><circle cx="240" cy="240" r="151" strokeDasharray="2 9" /><path d="m138 299 102-177 102 177Z" /></g>
          <g className="project-artwork__orbit"><ellipse cx="240" cy="240" rx="145" ry="68" transform="rotate(-30 240 240)" /><ellipse cx="240" cy="240" rx="145" ry="68" transform="rotate(90 240 240)" /><ellipse cx="240" cy="240" rx="145" ry="68" transform="rotate(30 240 240)" /></g>
          <path className="project-artwork__left-face" d="m240 198 36 21v42l-36 21-36-21v-42Z" />
          <path fill={hatch} d="m240 198 36 21v42l-36 21-36-21v-42Z" />
          <g className="project-artwork__solid"><circle cx="240" cy="122" r="9" /><circle cx="138" cy="299" r="9" /><circle cx="342" cy="299" r="9" /></g>
          <path className="project-artwork__fine" d="M240 102v-16 M119 310l-14 8 M361 310l14 8 M230 240h20 M240 230v20" />
        </>}
        {project.artwork === 'report' && <>
          <g className="project-artwork__construction"><circle cx="240" cy="240" r="151" strokeDasharray="2 9" /><path d="M240 72v336 M72 240h336" /></g>
          <path className="project-artwork__left-face" d="m154 136 168 28v196l-168-28Z" />
          <path fill={hatch} d="m154 136 168 28v196l-168-28Z" />
          <path className="project-artwork__right-face" d="m140 120 168 28v196l-168-28Z" />
          <path className="project-artwork__fine" d="m126 104 168 28v196l-168-28Z M140 316l14 16 M308 344l14 16" />
          <circle className="project-artwork__orbit" cx="231" cy="223" r="57" />
          <path className="project-artwork__solid" d="M231 166a57 57 0 0 1 57 57h-57Z" />
          <path className="project-artwork__fine" d="m231 223-40 40 M184 297l70 12 M184 307l38 7 M339 161h31 M355 145v32" />
          <path fill={dots} d="M164 179h36v84h-36Z" />
        </>}
      </svg>
      <span className="project-artwork__code">{ARTWORK_CODES[project.artwork]}</span>
    </span>
  )
}

function ProjectImage({ project, className, src, onFallback }: ProjectArtworkProps & { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <GraphicArtwork project={project} className={className} />
  return (
    <img
      className={`project-artwork ${className || ''} project-artwork--${project.imageType}`}
      src={src}
      alt={`${project.title}项目预览`}
      decoding="async"
      onError={() => { setFailed(true); onFallback?.() }}
    />
  )
}

export default function ProjectArtwork(props: ProjectArtworkProps) {
  const src = props.project.image
  return src ? <ProjectImage key={src} {...props} src={src} /> : <GraphicArtwork {...props} />
}
