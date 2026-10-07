import { Bilibili, Github } from '@lobehub/icons'
import { siteProfile } from '../../../config/siteProfile'
import { resolvePublicAsset } from '../../../utils/baseUrl'
import './HeroRail.css'

export default function HeroRail() {
  return (
    <aside className="hero-rail" aria-label="首页个人档案">
      <div className="hero-rail__index" aria-label="00 Homepage">
        <span className="hero-rail__number">00</span>
        <div><span>PERSONAL SPACE</span><strong>HOMEPAGE</strong></div>
      </div>

      <div className="hero-rail__identity">
        {siteProfile.avatarPath && (
          <img className="hero-rail__avatar" src={resolvePublicAsset(siteProfile.avatarPath)}
            alt={`${siteProfile.name}的头像`} width="80" height="80" decoding="async" />
        )}
        <div className="hero-rail__name">
          <span>{siteProfile.handle}</span>
          <h2>{siteProfile.name}</h2>
          <p>{siteProfile.role}</p>
        </div>
      </div>

      {siteProfile.bio && <p className="hero-rail__bio">{siteProfile.bio}</p>}
      <nav className="hero-rail__links" aria-label="联系作者">
        {siteProfile.githubUrl && (
          <a href={siteProfile.githubUrl} target="_blank" rel="noreferrer" aria-label="GitHub 个人主页">
            <Github aria-hidden="true" /><span>GitHub</span><span aria-hidden="true">↗</span>
          </a>
        )}
        {siteProfile.bilibiliUrl && (
          <a href={siteProfile.bilibiliUrl} target="_blank" rel="noreferrer" aria-label="Bilibili 个人主页">
            <Bilibili aria-hidden="true" /><span>Bilibili</span><span aria-hidden="true">↗</span>
          </a>
        )}
        {siteProfile.email && (
          <a href={`mailto:${siteProfile.email}`} aria-label={`邮件联系 ${siteProfile.name}`}>
            <span className="hero-rail__mail" aria-hidden="true">@</span><span>联系我</span><span aria-hidden="true">↗</span>
          </a>
        )}
      </nav>
      <p className="hero-rail__status"><span aria-hidden="true" />{siteProfile.statusMessage}</p>
    </aside>
  )
}
