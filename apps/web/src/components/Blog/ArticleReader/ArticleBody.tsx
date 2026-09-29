import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { resolveDisplayImage } from '../contentUtils'
import type { ArticleHeading } from '../types'

type ArticleBodyProps = {
  content: string
  articleHeadings: ArticleHeading[]
  onActiveHeadingChange: (id: string) => void
}

/**
 * 正文渲染器：唯一持有 react-markdown + remark-gfm 的模块，
 * 通过 ArticleDocument 内的 React.lazy 按需加载，使 markdown 解析器独立成 chunk。
 */
export default function ArticleBody({
  content,
  articleHeadings,
  onActiveHeadingChange,
}: ArticleBodyProps) {
  const headingsByLine = new Map(
    articleHeadings.map((heading) => [heading.line, heading]),
  )

  // 标题的滚动高亮由真正渲染标题的组件负责观察，避免在懒加载完成前就去 document 里查找节点
  useEffect(() => {
    if (articleHeadings.length === 0) {
      return
    }

    const headingElements = articleHeadings
      .map(({ id }) => document.getElementById(id))
      .filter((heading): heading is HTMLElement => Boolean(heading))
    if (headingElements.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleHeading = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top,
          )[0]
        if (visibleHeading) {
          onActiveHeadingChange(visibleHeading.target.id)
        }
      },
      { rootMargin: '-112px 0px -68% 0px', threshold: 0 },
    )

    headingElements.forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [articleHeadings, onActiveHeadingChange])

  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children, node }) => {
            const heading = headingsByLine.get(node?.position?.start.line ?? 0)
            return (
              <h2 id={heading?.id} data-article-heading>
                {children}
              </h2>
            )
          },
          h3: ({ children, node }) => {
            const heading = headingsByLine.get(node?.position?.start.line ?? 0)
            return (
              <h3 id={heading?.id} data-article-heading>
                {children}
              </h3>
            )
          },
          a: ({ href, ...props }) => {
            const isExternal = href?.startsWith('http')
            return (
              <a
                {...props}
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer' : undefined}
              />
            )
          },
          img: ({ src, ...props }) => (
            <img
              {...props}
              src={src ? resolveDisplayImage(src) : undefined}
              loading="lazy"
              decoding="async"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
