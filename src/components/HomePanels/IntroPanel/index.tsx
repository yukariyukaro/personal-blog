import { useState } from 'react'
import { resolvePublicAsset } from '../../../utils/baseUrl'
import { Github, Bilibili } from '@lobehub/icons'
import { QQIcon } from '../../Icons/QQIcon'
import './IntroPanel.css'

function IntroPanel() {
  const bgImage = resolvePublicAsset('information/background.webp')
  // Using placeholder avatar for now until provided
  const avatarImage = resolvePublicAsset('information/background.webp') 
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')

  const handleCopyQQ = (e: React.MouseEvent) => {
    e.preventDefault()
    navigator.clipboard.writeText('1981805808@qq.com').then(() => {
      setCopyStatus('copied')
      setTimeout(() => {
        setCopyStatus('idle')
      }, 2000)
    })
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
              <h2 className="intro-panel__title">娄宿三</h2>
              <span className="intro-panel__subtitle">Hamal</span>
            </div>
            <div className="intro-panel__avatar-container">
              <div className="intro-panel__avatar-orbit"></div>
              <div className="intro-panel__avatar">
                <img src={avatarImage} alt="Avatar" />
              </div>
              <div className="intro-panel__avatar-planet"></div>
            </div>
          </div>

          <div className="intro-panel__content">
            <div className="intro-panel__section">
              <div className="intro-panel__section-title">
                <span className="intro-panel__icon">✦</span>
                <h3>ID ORIGIN</h3>
              </div>
              <p className="intro-panel__text">
                娄宿三，又称Hamal、白羊座Alpha，是白羊座最亮星。中二病时期起这个名字，大概也有着想要变得kirakiradokidoki的愿望，但实际上，在浩瀚的星空中，娄宿三也只是一颗二等星。
              </p>
            </div>

            <div className="intro-panel__section">
              <div className="intro-panel__section-title">
                <span className="intro-panel__icon">✦</span>
                <h3>INTERESTS & PATH</h3>
              </div>
              <p className="intro-panel__text">
                一个擅长自扰的庸人。二次元&游戏爱好者。
              </p>
            </div>
          </div>

          <div className="intro-panel__footer">
            <div className="intro-panel__social-links">
              <a href="https://github.com/yukariyukaro" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="GitHub">
                <span className="social-icon"><Github size={16} /></span>
                <span className="social-text">GITHUB</span>
              </a>
              <a href="https://space.bilibili.com/39374538?spm_id_from=333.1007.0.0" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Bilibili">
                <span className="social-icon"><Bilibili size={16} /></span>
                <span className="social-text">BILIBILI</span>
              </a>
              <a href="#" onClick={handleCopyQQ} className="social-link" aria-label="Copy QQ">
                <span className="social-icon">
                  {copyStatus === 'copied' ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <QQIcon style={{ fontSize: '14px', fill: '#fff' }} />
                  )}
                </span>
                <span className="social-text">{copyStatus === 'copied' ? '已复制' : '1981805808@qq.com'}</span>
              </a>
            </div>
            <div className="intro-panel__decoration-line"></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default IntroPanel
