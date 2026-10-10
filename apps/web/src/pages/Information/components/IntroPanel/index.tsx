import { useEffect, useRef, useState } from 'react'
import { Github, Bilibili } from '@lobehub/icons'
import { resolvePublicAsset } from '../../../../utils/baseUrl'
import { siteProfile } from '../../../../config/siteProfile'
import type { SiteProfile } from '../../../../config/siteProfile'
import './IntroPanel.css'

type IntroPanelProps = { profile?: SiteProfile }

function IntroPanel({ profile = siteProfile }: IntroPanelProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSocialLinks = Boolean(profile.githubUrl || profile.bilibiliUrl || profile.email)
  const artwork = resolvePublicAsset('information/background.webp')

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  const handleCopyEmail = async () => {
    if (!profile.email) return
    try {
      await navigator.clipboard.writeText(profile.email)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      setCopyStatus('copied')
      copyTimer.current = setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      setCopyStatus('idle')
    }
  }

  return (
    <section className="intro-panel" aria-label="introduction panel">
      <div className="intro-panel__ghost-bg" style={{ backgroundImage: `url(${artwork})` }} aria-hidden="true" />
      <span className="intro-panel__ghost-name" aria-hidden="true">{profile.handle?.toUpperCase() ?? 'PROFILE'}</span>
      <div className="intro-panel__visual" aria-hidden="true">
        <div className="intro-panel__bg" style={{ backgroundImage: `url(${artwork})` }} />
        <div className="intro-panel__visual-frame" />
        <div className="intro-panel__visual-top"><span>PERSONAL CONSTELLATION</span><span>✦</span></div>
        <svg className="intro-panel__star-map" viewBox="0 0 400 400" fill="none">
          <path d="M200 24 376 200 200 376 24 200Z M200 70 330 200 200 330 70 200Z" stroke="currentColor" />
          <path d="M200 0V400 M0 200H400" stroke="currentColor" strokeDasharray="3 8" />
          <circle cx="200" cy="200" r="103" stroke="currentColor" />
          <path d="m200 156 10 34 34 10-34 10-10 34-10-34-34-10 34-10Z" fill="currentColor" />
        </svg>
        <div className="intro-panel__visual-bottom"><span>每个人，都有自己的轨道。</span><span>01 / IN ORBIT</span></div>
      </div>

      <div className="intro-panel__card">
        <div className="intro-panel__file-label"><span>PERSONAL FILE ://</span><h1>PROFILE</h1></div>
        <div className="intro-panel__header">
          <div className="intro-panel__identity">
            <span className="intro-panel__label">{profile.handle ?? 'HELLO, WORLD.'} / A PERSONAL ARCHIVE</span>
            <h2 className="intro-panel__title">{profile.name}</h2>
            {profile.role ? <p className="intro-panel__subtitle"><span aria-hidden="true">▰</span>{profile.role}<span className="intro-panel__signal" aria-hidden="true" /></p> : null}
          </div>
          {profile.avatarPath ? <div className="intro-panel__avatar"><img src={resolvePublicAsset(profile.avatarPath)} alt={profile.name} /></div> : null}
        </div>

        <div className="intro-panel__content">
          {profile.originDescription ? (
            <section className="intro-panel__section">
              <div className="intro-panel__section-title"><span>01 /</span><h3>名字的来处 <small>ID ORIGIN</small></h3></div>
              <p className="intro-panel__text">{profile.originDescription}</p>
            </section>
          ) : null}
          {profile.bio ? (
            <section className="intro-panel__section">
              <div className="intro-panel__section-title"><span>02 /</span><h3>生活的切片 <small>INTERESTS & PATH</small></h3></div>
              <p className="intro-panel__text">{profile.bio}</p>
            </section>
          ) : null}
        </div>

        {hasSocialLinks ? (
          <div className="intro-panel__footer">
            <span className="intro-panel__label">ELSEWHERE / 在别处找到我</span>
            <div className="intro-panel__social-links">
              {profile.githubUrl ? <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="intro-panel__social" aria-label="GitHub"><Github /><span>GitHub</span><span aria-hidden="true">↗</span></a> : null}
              {profile.bilibiliUrl ? <a href={profile.bilibiliUrl} target="_blank" rel="noopener noreferrer" className="intro-panel__social" aria-label="Bilibili"><Bilibili /><span>Bilibili</span><span aria-hidden="true">↗</span></a> : null}
              {profile.email ? <button type="button" onClick={handleCopyEmail} className="intro-panel__social" aria-label="复制邮箱"><span aria-hidden="true">@</span><span aria-live="polite">{copyStatus === 'copied' ? '已复制邮箱' : '邮箱'}</span><span aria-hidden="true">{copyStatus === 'copied' ? '✓' : '↗'}</span></button> : null}
            </div>
          </div>
        ) : null}
        {profile.statusMessage ? <p className="intro-panel__status"><span aria-hidden="true" />{profile.statusMessage}<small>IN PROGRESS</small></p> : null}
      </div>
    </section>
  )
}

export default IntroPanel
