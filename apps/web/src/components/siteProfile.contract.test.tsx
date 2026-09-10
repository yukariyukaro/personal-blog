import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { SiteProfile } from '../config/siteProfile'
import BlogSidebar from './BlogReader/BlogSidebar'
import IntroPanel from './HomePanels/IntroPanel'

vi.mock('@lobehub/icons', () => ({
  Bilibili: () => <span />,
  Github: () => <span />,
}))

const minimalProfile: SiteProfile = {
  name: '最小资料用户',
}

const completeProfile: SiteProfile = {
  name: '完整资料用户',
  handle: 'fixture-handle',
  role: 'fixture-role',
  email: 'fixture@example.com',
  githubUrl: 'https://github.com/profile-fixture',
  bilibiliUrl: 'https://space.bilibili.com/123456',
  avatarPath: 'fixtures/avatar.webp',
  originDescription: 'fixture-origin-description',
  bio: 'fixture-profile-bio',
  statusMessage: 'fixture-status',
  welcome: {
    title: 'fixture-welcome-title',
    message: 'fixture-welcome-message',
    actionLabel: 'fixture-welcome-action',
  },
  quote: {
    title: 'fixture-quote-title',
    text: 'fixture-quote-text',
    author: 'fixture-quote-author',
  },
}

const renderBlogSidebar = (profile: SiteProfile) =>
  renderToStaticMarkup(
    <BlogSidebar
      profile={profile}
      side="left"
      stats={null}
      spotlightArticle={null}
      now={new Date('2026-01-01T00:00:00Z')}
      copyStatus="idle"
      onCopyEmail={vi.fn()}
      onFocusSearch={vi.fn()}
    />,
  )

describe('BlogSidebar site profile contract', () => {
  it('仅渲染最小资料中的名称', () => {
    const html = renderBlogSidebar(minimalProfile)

    expect(html).toContain(minimalProfile.name)
    expect(html).not.toContain('aria-label="GitHub"')
    expect(html).not.toContain('aria-label="Bilibili"')
    expect(html).not.toContain('aria-label="复制邮箱"')
    expect(html).not.toContain('profile-card__avatar')
    expect(html).not.toContain('profile-card__bio')
  })

  it('渲染完整 fixture 中的真实字段', () => {
    const html = renderBlogSidebar(completeProfile)

    expect(html).toContain(completeProfile.name)
    expect(html).toContain('fixture-handle / fixture-role')
    expect(html).toContain(`href="${completeProfile.githubUrl}"`)
    expect(html).toContain(`href="${completeProfile.bilibiliUrl}"`)
    expect(html).toContain('aria-label="复制邮箱"')
    expect(html).toContain('fixtures/avatar.webp')
    expect(html).toContain('fixture-welcome-message')
    expect(html).toContain('fixture-quote-text')
  })
})

describe('IntroPanel site profile contract', () => {
  it('仅渲染最小资料中的名称', () => {
    const html = renderToStaticMarkup(<IntroPanel profile={minimalProfile} />)

    expect(html).toContain(minimalProfile.name)
    expect(html).not.toContain('aria-label="GitHub"')
    expect(html).not.toContain('aria-label="Bilibili"')
    expect(html).not.toContain('aria-label="复制邮箱"')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('ID ORIGIN')
    expect(html).not.toContain('INTERESTS')
  })

  it('渲染完整 fixture 中的真实字段', () => {
    const html = renderToStaticMarkup(<IntroPanel profile={completeProfile} />)

    expect(html).toContain(completeProfile.name)
    expect(html).toContain('fixture-handle')
    expect(html).toContain('fixture-origin-description')
    expect(html).toContain('fixture-profile-bio')
    expect(html).toContain(`href="${completeProfile.githubUrl}"`)
    expect(html).toContain(`href="${completeProfile.bilibiliUrl}"`)
    expect(html).toContain('aria-label="复制邮箱"')
    expect(html).toContain('fixtures/avatar.webp')
  })
})
