import { describe, expect, it } from 'vitest'
import type { ArticleSummary } from '../../src/utils/contentApi'
import type { Frontmatter } from '../../src/components/MarkdownEditor/lib/frontmatter'
import {
  composeMarkdown,
  createEmptyFrontmatter,
  fromArticleSummary,
  parseFrontmatter,
  serializeFrontmatter,
  toSlug,
  validateFrontmatter,
} from '../../src/components/MarkdownEditor/lib/frontmatter'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const sample: Frontmatter = {
  title: '计算机是什么',
  slug: 'computer',
  summary: '从输入、处理、存储和输出理解计算机如何执行程序。',
  publishedAt: '2026-08-29',
  category: '计算机基础',
  tags: ['Web 基础', '计算机'],
}

const articleSummary: ArticleSummary = {
  slug: 'computer',
  title: '计算机是什么',
  summary: '从输入、处理、存储和输出理解计算机如何执行程序。',
  publishedAt: '2026-08-29',
  category: '计算机基础',
  tags: ['Web 基础', '计算机'],
  wordCount: 1200,
  readingMinutes: 6,
  contentPath: 'content/articles/computer.md',
}

describe('serializeFrontmatter / parseFrontmatter', () => {
  it('序列化后可原样解析回来', () => {
    const markdown = composeMarkdown(sample, '## 正文\n\n内容')
    const parsed = parseFrontmatter(markdown)

    expect(parsed.data).toEqual(sample)
    expect(parsed.body).toBe('## 正文\n\n内容')
  })

  it('日期使用引号包裹，避免被 YAML 解析为日期对象', () => {
    expect(serializeFrontmatter(sample)).toContain("publishedAt: '2026-08-29'")
  })

  it('空值字段被省略', () => {
    const text = serializeFrontmatter({
      ...sample,
      category: '',
      coverImage: '   ',
    })

    expect(text).not.toContain('category:')
    expect(text).not.toContain('coverImage:')
  })

  it('含冒号的标量仍可还原', () => {
    const parsed = parseFrontmatter(
      composeMarkdown({ ...sample, summary: '一句话: 说明' }, '正文'),
    )

    expect(parsed.data.summary).toBe('一句话: 说明')
  })

  it('tags 以列表形式写出', () => {
    expect(serializeFrontmatter(sample)).toContain('tags:\n  - Web 基础\n  - 计算机')
  })
})

describe('parseFrontmatter 的保守回退', () => {
  it('没有 frontmatter 时整体按正文处理', () => {
    const markdown = '## 标题\n\n正文'
    const parsed = parseFrontmatter(markdown)

    expect(parsed.data).toEqual({})
    expect(parsed.body).toBe(markdown)
  })

  it('折叠标量结构整体回退且不改写原文', () => {
    const markdown = '---\ntitle: 测试\nsummary: |\n  多行\n  文本\n---\n\n正文'
    const parsed = parseFrontmatter(markdown)

    expect(parsed.data).toEqual({})
    expect(parsed.body).toBe(markdown)
  })

  it('未收录字段整体回退', () => {
    const markdown = '---\ntitle: 测试\nupdatedAt: 2026-01-01\n---\n\n正文'
    const parsed = parseFrontmatter(markdown)

    expect(parsed.data).toEqual({})
    expect(parsed.body).toBe(markdown)
  })

  it('draft: false 不产生 draft 字段', () => {
    const parsed = parseFrontmatter('---\ntitle: 测试\ndraft: false\n---\n\n正文')

    expect(parsed.data.draft).toBeUndefined()
    expect(parsed.data.title).toBe('测试')
  })
})

describe('toSlug', () => {
  it.each([
    'Math Homework',
    '第三章 积分',
    '  Mixed_Case--Name  ',
    'Café résumé',
    '',
  ])('对「%s」产出满足 slugPattern 的结果', (input) => {
    expect(toSlug(input)).toMatch(SLUG_PATTERN)
  })

  it('英文标题转成可读 slug', () => {
    expect(toSlug('Math Homework')).toBe('math-homework')
  })

  it('中文标题回退为 post-日期', () => {
    expect(toSlug('第三章 积分')).toMatch(/^post-\d{8}$/)
  })
})

describe('validateFrontmatter', () => {
  it('完整数据没有错误', () => {
    expect(validateFrontmatter(sample)).toEqual([])
  })

  it('缺失必填项与非法值都会报错', () => {
    const errors = validateFrontmatter({
      title: '',
      slug: 'Math Homework',
      summary: '',
      publishedAt: '2026-13-01',
      category: '',
      tags: [],
    })

    expect(errors).toContain('标题不能为空')
    expect(errors).toContain('slug 只能包含小写字母、数字与连字符')
    expect(errors).toContain('发布日期需为合法的 YYYY-MM-DD')
    expect(errors).toContain('至少需要一个标签')
  })
})

describe('createEmptyFrontmatter', () => {
  it('使用今天作为默认发布日期', () => {
    expect(createEmptyFrontmatter().publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('fromArticleSummary', () => {
  it('用线上文章索引重建的 frontmatter 可通过校验', () => {
    expect(validateFrontmatter(fromArticleSummary(articleSummary))).toEqual([])
  })

  it('不共享入参的 tags 数组', () => {
    const frontmatter = fromArticleSummary(articleSummary)
    frontmatter.tags.push('额外标签')

    expect(articleSummary.tags).toEqual(['Web 基础', '计算机'])
  })
})
