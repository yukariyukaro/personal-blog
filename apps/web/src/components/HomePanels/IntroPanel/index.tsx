import { useState } from 'react'
import { resolvePublicAsset } from '../../../utils/baseUrl'
import { Github, Bilibili } from '@lobehub/icons'
import { siteProfile } from '../../../config/siteProfile'
import { QQIcon } from '../../Icons/QQIcon'
import './IntroPanel.css'

function IntroPanel() {
  const bgImage = resolvePublicAsset('information/background.webp')
  const avatarImage = siteProfile.avatarPath
    ? resolvePublicAsset(siteProfile.avatarPath)
    : null
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const hasSocialLinks = Boolean(
    siteProfile.githubUrl ||
    siteProfile.bilibiliUrl ||
    siteProfile.email,
  )

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!siteProfile.email) {
      return
    }

    navigator.clipboard
      .writeText(siteProfile.email)
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
              <h2 className="intro-panel__title">{siteProfile.name}</h2>
              {siteProfile.handle ? (
                <span className="intro-panel__subtitle">{siteProfile.handle}</span>
              ) : null}
            </div>
            {avatarImage ? (
              <div className="intro-panel__avatar-container">
                <div className="intro-panel__avatar-orbit"></div>
                <div className="intro-panel__avatar">
                  <img src={avatarImage} alt={siteProfile.name} />
                </div>
                <div className="intro-panel__avatar-planet"></div>
              </div>
            ) : null}
          </div>

          <div className="intro-panel__content">
            {siteProfile.originDescription ? (
              <div className="intro-panel__section">
                <div className="intro-panel__section-title">
                  <span className="intro-panel__icon">✦</span>
                  <h3>ID ORIGIN</h3>
                </div>
                <p className="intro-panel__text">
                  {siteProfile.originDescription}
                </p>
              </div>
            ) : null}

            {siteProfile.bio ? (
              <div className="intro-panel__section">
                <div className="intro-panel__section-title">
                  <span className="intro-panel__icon">✦</span>
                  <h3>INTERESTS & PATH</h3>
                </div>
                <p className="intro-panel__text">{siteProfile.bio}</p>
              </div>
            ) : null}
          </div>

          {hasSocialLinks ? (
            <div className="intro-panel__footer">
              <div className="intro-panel__social-links">
                {siteProfile.githubUrl ? (
                  <a href={siteProfile.githubUrl} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="GitHub">
                    <span className="social-icon"><Github /></span>
                    <span className="social-text">GitHub</span>
                  </a>
                ) : null}
                {siteProfile.bilibiliUrl ? (
                  <a href={siteProfile.bilibiliUrl} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Bilibili">
                    <span className="social-icon"><Bilibili /></span>
                    <span className="social-text">Bilibili</span>
                  </a>
                ) : null}
                {siteProfile.email ? (
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
