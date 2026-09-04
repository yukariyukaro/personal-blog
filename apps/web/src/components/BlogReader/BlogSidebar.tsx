import { Bilibili, Github } from '@lobehub/icons'
import type { ArticleIndexStats, ArticleSummary } from '../../utils/contentApi'
import { resolvePublicAsset } from '../../utils/baseUrl'
import { formatNumber, resolveDisplayImage } from './contentUtils'
import { QQIcon } from '../Icons/QQIcon'

type BlogSidebarProps = {
  side: 'left' | 'right'
  stats: ArticleIndexStats | null
  spotlightArticle: ArticleSummary | null
  now: Date
  copyStatus: 'idle' | 'copied'
  onCopyEmail: () => void
  onFocusSearch: () => void
}

export default function BlogSidebar({
  side,
  stats,
  spotlightArticle,
  now,
  copyStatus,
  onCopyEmail,
  onFocusSearch,
}: BlogSidebarProps) {
  if (side === 'right') {
    return (
      <aside className="blog-sidebar blog-sidebar--right" aria-label="站点信息">
        <section className="blog-card clock-card">
          <div className="clock-header">
            <span>保持好奇，持续输出</span>
            <span className="weather-icon" aria-hidden="true">☼</span>
          </div>
          <div className="clock-time">
            <span className="time-hm">
              {new Intl.DateTimeFormat('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }).format(now)}
            </span>
            <span className="time-date">
              <span className="day">
                {new Intl.DateTimeFormat('en-US', { weekday: 'long' })
                  .format(now)
                  .toUpperCase()}
              </span>
              <span className="date">
                {new Intl.DateTimeFormat('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                }).format(now)}
              </span>
            </span>
          </div>
        </section>

        {spotlightArticle?.coverImage ? (
          <section className="blog-card image-card">
            <img
              src={resolveDisplayImage(spotlightArticle.coverImage)}
              alt={spotlightArticle.title}
              loading="lazy"
              decoding="async"
            />
          </section>
        ) : null}

        {stats ? (
          <section className="blog-card stats-card">
            <h3 className="card-title">
              <span className="title-bar" /> 站点统计
            </h3>
            <ul className="stats-list">
              <li><span className="stat-name">文章</span><span className="stat-val">{formatNumber(stats.articleCount)}</span></li>
              <li><span className="stat-name">分类</span><span className="stat-val">{formatNumber(stats.categoryCount)}</span></li>
              <li><span className="stat-name">标签</span><span className="stat-val">{formatNumber(stats.tagCount)}</span></li>
              <li><span className="stat-name">总字数</span><span className="stat-val">{formatNumber(stats.totalWordCount)}</span></li>
              <li><span className="stat-name">最近更新</span><span className="stat-val">{stats.latestPublishedAt}</span></li>
            </ul>
          </section>
        ) : null}
      </aside>
    )
  }

  return (
    <aside className="blog-sidebar blog-sidebar--left" aria-label="作者信息">
      <section className="blog-card profile-card">
        <div className="profile-card__avatar">
          <img
            src={resolvePublicAsset('home/miku_点赞.jpg')}
            alt="娄宿三"
            loading="lazy"
            decoding="async"
          />
        </div>
        <h2 className="profile-card__name">娄宿三</h2>
        <p className="profile-card__bio">Hamal / 前端开发者</p>
        <div className="profile-card__socials">
          <a href="https://github.com/YukariYukaro" target="_blank" rel="noreferrer" aria-label="GitHub">
            <Github />
          </a>
          <a href="https://space.bilibili.com/39374538" target="_blank" rel="noreferrer" aria-label="Bilibili">
            <Bilibili />
          </a>
          <button type="button" onClick={onCopyEmail} aria-label="复制 QQ 邮箱">
            <QQIcon />
          </button>
        </div>
        <p className="profile-card__copy-status" aria-live="polite">
          {copyStatus === 'copied' ? '邮箱已复制' : null}
        </p>
        {stats ? (
          <div className="profile-card__stats">
            <div className="stat-box">
              <span className="stat-label">文章</span>
              <span className="stat-value">{formatNumber(stats.articleCount)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">字数</span>
              <span className="stat-value">{formatNumber(stats.totalWordCount)}</span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="blog-card welcome-card">
        <h3 className="card-title">
          <span className="title-icon" aria-hidden="true">+</span> 欢迎来访
        </h3>
        <p className="welcome-text">
          这里是一个整理知识、记录项目和保存灵感的个人内容空间。
        </p>
        <button className="welcome-btn" type="button" onClick={onFocusSearch}>
          开始阅读
        </button>
      </section>

      <section className="blog-card quote-card">
        <h3 className="card-title">
          <span className="title-icon" aria-hidden="true">/</span> 今日一言
        </h3>
        <p className="quote-text">“纸上得来终觉浅，绝知此事要躬行。”</p>
        <span className="quote-author">—— 陆游</span>
      </section>
    </aside>
  )
}
