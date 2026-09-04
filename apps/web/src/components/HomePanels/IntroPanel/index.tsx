import { useState } from 'react'
import { resolvePublicAsset } from '../../../utils/baseUrl'
import { Github, Bilibili } from '@lobehub/icons'
import { siteProfile } from '../../../config/siteProfile'
import type { SiteProfile } from '../../../config/siteProfile'
import { QQIcon } from '../../Icons/QQIcon'
import './IntroPanel.css'

type IntroPanelProps = {
  profile?: SiteProfile
}

function IntroPanel({ profile = siteProfile }: IntroPanelProps) {
  const bgImage = resolvePublicAsset('information/background.webp')
  const avatarImage = profile.avatarPath
    ? resolvePublicAsset(profile.avatarPath)
    : null
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const hasSocialLinks = Boolean(
    profile.githubUrl ||
    profile.bilibiliUrl ||
    profile.email,
  )

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!profile.email) {
      return
    }

    navigator.clipboard
      .writeText(profile.email)
      .then(() => {
        setCopyStatus('copied')
        setTimeout(() => {
          setCopyStatus('idle')
        }, 2000)
      })
      .catch(() => undefined)
  }

  return (
    <section className="intro-panel" aria-label="introduction panel">
      {/* Left side background image */}
      <div 
        className="intro-panel__bg"
        style={{ backgroundImage: `url(${bgImage})` }}
        aria-hidden="true"
      />

      {/* Diagonal slice overlay and card container */}
      <div className="intro-panel__card-wrapper">
        <div className="intro-panel__card">
          <div className="intro-panel__header">
            <div className="intro-panel__header-top">
              <span className="intro-panel__label">PROFILE ://</span>
              <h2 className="intro-panel__title">{profile.name}</h2>
              {profile.handle ? (
                <span className="intro-panel__subtitle">{profile.handle}</span>
              ) : null}
            </div>
            {avatarImage ? (
              <div className="intro-panel__avatar-container">
                <div className="intro-panel__avatar-orbit"></div>
                <div className="intro-panel__avatar">
                  <img src={avatarImage} alt={profile.name} />
                </div>
                <div className="intro-panel__avatar-planet"></div>
              </div>
            ) : null}
          </div>

          <div className="intro-panel__content">
            {profile.originDescription ? (
              <div className="intro-panel__section">
                <div className="intro-panel__section-title">
                  <span className="intro-panel__icon">✦</span>
                  <h3>ID ORIGIN</h3>
                </div>
                <p className="intro-panel__text">
                  {profile.originDescription}
                </p>
              </div>
            ) : null}

            {profile.bio ? (
              <div className="intro-panel__section">
                <div className="intro-panel__section-title">
                  <span className="intro-panel__icon">✦</span>
                  <h3>INTERESTS & PATH</h3>
                </div>
                <p className="intro-panel__text">{profile.bio}</p>
              </div>
            ) : null}
          </div>

          {hasSocialLinks ? (
            <div className="intro-panel__footer">
              <div className="intro-panel__social-links">
                {profile.githubUrl ? (
                  <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="GitHub">
                    <span className="social-icon"><Github /></span>
                    <span className="social-text">GitHub</span>
                  </a>
                ) : null}
                {profile.bilibiliUrl ? (
                  <a href={profile.bilibiliUrl} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Bilibili">
                    <span className="social-icon"><Bilibili /></span>
                    <span className="social-text">Bilibili</span>
                  </a>
                ) : null}
                {profile.email ? (
                  <button
                    onClick={handleCopyEmail}
                    className="social-link social-button"
                    aria-label="复制邮箱"
                    title="复制邮箱"
                    type="button"
                  >
                    <span className={`social-icon ${copyStatus === 'copied' ? 'social-icon--success' : ''}`}>
                      {copyStatus === 'copied' ? (
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <QQIcon style={{ fontSize: '14px', fill: '#fff' }} />
                      )}
                    </span>
                    <span className="social-text">{copyStatus === 'copied' ? '已复制邮箱' : '邮箱'}</span>
                  </button>
                ) : null}
              </div>
              <div className="intro-panel__decoration-line"></div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default IntroPanel
