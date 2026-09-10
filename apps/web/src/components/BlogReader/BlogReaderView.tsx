import type { CSSProperties } from 'react'
import ArticleCatalog from './ArticleCatalog'
import ArticleDocument from './ArticleDocument'
import BlogSidebar from './BlogSidebar'
import ReadingControls from './ReadingControls'
import type { BlogReaderViewModel } from './types'

type BlogReaderViewProps = {
  viewModel: BlogReaderViewModel
}

export default function BlogReaderView({
  viewModel: {
    articleSectionRef,
    searchInputRef,
    readerBackgroundImage,
    articles,
    visibleArticles,
    selectedArticle,
    spotlightArticle,
    articleContent,
    relatedArticles,
    categories,
    tags,
    stats,
    articleHeadings,
    activeHeadingId,
    activeCategory,
    activeTag,
    searchQuery,
    indexError,
    contentError,
    shareStatus,
    copyStatus,
    now,
    openArticle,
    setActiveCategory,
    setActiveTag,
    setSearchQuery,
    focusSearch,
    copyEmail,
    copyArticleLink,
    navigateToHeading,
  },
}: BlogReaderViewProps) {
  if (indexError) {
    return (
      <section className="blog-hub" aria-label="博客内容">
        <p className="blog-hub__error" role="alert">
          文章目录加载失败，请刷新页面重试。
        </p>
      </section>
    )
  }

  return (
    <section
      className="blog-reader"
      aria-label="博客内容"
      style={{
        '--blog-reader-background': `url(${readerBackgroundImage})`,
      } as CSSProperties}
    >
      <ReadingControls articleSectionRef={articleSectionRef} />

      <div className="blog-dashboard">
        <BlogSidebar
          side="left"
          stats={stats}
          spotlightArticle={spotlightArticle}
          now={now}
          copyStatus={copyStatus}
          onCopyEmail={copyEmail}
          onFocusSearch={focusSearch}
        />
        <ArticleCatalog
          articles={articles}
          categories={categories}
          tags={tags}
          stats={stats}
          activeCategory={activeCategory}
          activeTag={activeTag}
          searchQuery={searchQuery}
          searchInputRef={searchInputRef}
          visibleArticles={visibleArticles}
          onSearchChange={setSearchQuery}
          onCategoryChange={setActiveCategory}
          onTagChange={setActiveTag}
          onOpenArticle={openArticle}
        />
        <BlogSidebar
          side="right"
          stats={stats}
          spotlightArticle={spotlightArticle}
          now={now}
          copyStatus={copyStatus}
          onCopyEmail={copyEmail}
          onFocusSearch={focusSearch}
        />
      </div>

      <section
        ref={articleSectionRef}
        className="blog-document"
        aria-labelledby={selectedArticle ? 'blog-document-title' : undefined}
      >
        <ArticleDocument
          selectedArticle={selectedArticle}
          articleContent={articleContent}
          contentError={contentError}
          articleHeadings={articleHeadings}
          activeHeadingId={activeHeadingId}
          shareStatus={shareStatus}
          onCopyLink={copyArticleLink}
          relatedArticles={relatedArticles}
          onOpenArticle={openArticle}
          onHeadingNavigation={navigateToHeading}
        />
      </section>
    </section>
  )
}
