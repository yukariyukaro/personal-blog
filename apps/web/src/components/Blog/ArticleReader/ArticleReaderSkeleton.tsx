export function ArticleBodySkeleton() {
  return (
    <div className="blog-document__skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

export function ArticleReaderSkeleton() {
  return (
    <>
      <header className="blog-document__header">
        <div>
          <span>READING</span>
          <span className="blog-skeleton-bar blog-skeleton-bar--headline" />
        </div>
      </header>
      <ArticleBodySkeleton />
    </>
  )
}
