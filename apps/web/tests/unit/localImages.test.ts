import { describe, expect, it } from 'vitest'
import {
  extractImageSources,
  isNonLocalSource,
  normalizeImageKey,
  parseImageReference,
  resolveRelativeSegments,
} from '../../src/components/MarkdownEditor/lib/localImages'

const CDN_HOST = 'cdn.jsdmirror.com'

describe('isNonLocalSource', () => {
  it('线上线下各类非本地来源一律判为 true', () => {
    const nonLocal = [
      '',
      '   ',
      '/images/site-absolute.png',
      '/favicon.svg',
      '#anchor',
      '//cdn.example.com/a.png',
      'https://cdn.example.com/a.png',
      `http://${CDN_HOST}/gh/yukariyukaro/personal-blog@master/a.png`,
      `https://${CDN_HOST}/gh/yukariyukaro/personal-blog@master/a.png`,
      'https://picx.zhimg.com/a.png',
      'data:image/png;base64,iVBORw0KGgo=',
      'blob:http://localhost:5173/abc',
      'file:///D:/notes/a.png',
      'mailto:someone@example.com',
    ]

    for (const src of nonLocal) {
      expect(isNonLocalSource(src), src).toBe(true)
    }
  })

  it('本地相对路径判为 false', () => {
    const local = ['tut4_files/a.png', './a.png', '../pic/a.png', 'a.png', 'tut4_files/图 片.png']

    for (const src of local) {
      expect(isNonLocalSource(src), src).toBe(false)
    }
  })

  it('Windows 盘符路径带 scheme，按非本地处理', () => {
    expect(isNonLocalSource('C:\\notes\\a.png')).toBe(true)
  })
})

describe('extractImageSources', () => {
  it('抽出 Markdown 与 HTML 两种写法', () => {
    const markdown = [
      '![](a.png)',
      '![alt](b.png)',
      '![带标题](c.png "标题")',
      '![带尖括号](<d e.png>)',
      '<img src="e.png" height="180">',
      "<img  src='f.png' />",
      '<img src="g.png?x=1#y" alt="带 query">',
    ].join('\n')

    expect(extractImageSources(markdown).sort()).toEqual(
      ['a.png', 'b.png', 'c.png', 'd e.png', 'e.png', 'f.png', 'g.png?x=1#y'].sort(),
    )
  })

  it('同一行出现两个 <img> 时两个都抽出', () => {
    const markdown =
      '<img src="tut4_files/page05-block07.png" height="160"> <img src="tut4_files/page07-block07.png" height="160">'

    expect(extractImageSources(markdown)).toEqual([
      'tut4_files/page05-block07.png',
      'tut4_files/page07-block07.png',
    ])
  })

  it('非图片语法不误抽', () => {
    const markdown = '# 标题\n\n普通段落 [链接](https://example.com)\n\n```\ncode\n```'

    expect(extractImageSources(markdown)).toEqual([])
  })
})

describe('parseImageReference', () => {
  it('外链 / 站内绝对路径 / data: 一律返回 null', () => {
    expect(parseImageReference('https://cdn.example.com/a.png')).toBeNull()
    expect(parseImageReference('/images/a.png')).toBeNull()
    expect(parseImageReference('data:image/png;base64,iVBORw0KGgo=')).toBeNull()
    expect(parseImageReference('blob:http://localhost:5173/abc')).toBeNull()
  })

  it('保留 query / hash 到 trailing，不进入路径片段', () => {
    expect(parseImageReference('a.png?x=1#y')).toEqual({
      segments: ['a.png'],
      trailing: '?x=1#y',
    })
  })

  it('percent 编码解码后再切分', () => {
    expect(parseImageReference('图%20片/a.png')).toEqual({
      segments: ['图 片', 'a.png'],
      trailing: '',
    })
  })

  it('保留 . 与 .. 交给 resolveRelativeSegments 处理，并折叠重复斜杠', () => {
    expect(parseImageReference('./../pic//a.png')).toEqual({
      segments: ['.', '..', 'pic', 'a.png'],
      trailing: '',
    })
  })

  it('只有 query 没有路径时返回 null', () => {
    expect(parseImageReference('?x=1')).toBeNull()
  })
})

describe('resolveRelativeSegments', () => {
  it('以笔记目录为基准拼接', () => {
    expect(resolveRelativeSegments(['tut'], ['tut4_files', 'a.png'])).toEqual([
      'tut',
      'tut4_files',
      'a.png',
    ])
  })

  it('跳过 "."', () => {
    expect(resolveRelativeSegments(['tut'], ['.', 'a.png'])).toEqual(['tut', 'a.png'])
  })

  it('处理 ".." 弹栈', () => {
    expect(resolveRelativeSegments(['tut'], ['..', 'pic', 'a.png'])).toEqual([
      'pic',
      'a.png',
    ])
  })

  it('越出授权根返回 null', () => {
    expect(resolveRelativeSegments(['tut'], ['..', '..', 'a.png'])).toBeNull()
    expect(resolveRelativeSegments([], ['..', 'a.png'])).toBeNull()
  })

  it('解析结果为空（指向目录自身）返回 null', () => {
    expect(resolveRelativeSegments([], ['.'])).toBeNull()
  })
})

describe('normalizeImageKey', () => {
  it('去 query / hash', () => {
    expect(normalizeImageKey('tut4_files/a.png?x=1#y')).toBe('tut4_files/a.png')
  })

  it('反斜杠转正斜杠并折叠重复斜杠', () => {
    expect(normalizeImageKey('tut4_files\\sub//a.png')).toBe('tut4_files/sub/a.png')
  })

  it('去前导 "./"，但不动 "../"', () => {
    expect(normalizeImageKey('./a.png')).toBe('a.png')
    expect(normalizeImageKey('././a.png')).toBe('a.png')
    expect(normalizeImageKey('../pic/a.png')).toBe('../pic/a.png')
  })

  it('percent 编码解码后与未编码写法归一为同一个 key', () => {
    expect(normalizeImageKey('图%20片/a.png')).toBe(normalizeImageKey('图 片/a.png'))
  })

  it('非法 percent 序列按原文处理，不抛错', () => {
    expect(normalizeImageKey('100%/a.png')).toBe('100%/a.png')
  })

  it('回归：绝对路径与本地同名路径不撞键', () => {
    expect(normalizeImageKey('/images/a.png')).not.toBe(normalizeImageKey('images/a.png'))
  })

  it('回归：同名 CDN 外链不会被本地路径劫持', () => {
    const local = 'images/a.png'
    const external = 'https://cdn.example.com/images/a.png'

    // 外链必须被闸门拦掉，永远不进映射表，因此不可能被本地 blob 覆盖。
    expect(isNonLocalSource(external)).toBe(true)
    expect(parseImageReference(external)).toBeNull()
    expect(isNonLocalSource(local)).toBe(false)
    expect(normalizeImageKey(local)).toBe('images/a.png')
  })
})
