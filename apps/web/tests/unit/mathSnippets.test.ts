import { describe, expect, it } from 'vitest'
import {
  MATH_SNIPPETS,
  buildMathMarkup,
} from '../../src/components/MarkdownEditor/lib/mathSnippets'

describe('buildMathMarkup', () => {
  it('行内公式用单美元包裹', () => {
    expect(buildMathMarkup('E=mc^2', 'inline')).toBe('$E=mc^2$')
  })

  it('块级公式用独立段落包裹', () => {
    expect(buildMathMarkup('\\int_0^1 x^2\\,dx', 'block')).toBe(
      '\n$$\n\\int_0^1 x^2\\,dx\n$$\n',
    )
  })
})

describe('MATH_SNIPPETS', () => {
  it('每个片段都有标签与 LaTeX', () => {
    expect(
      MATH_SNIPPETS.every(
        (snippet) => snippet.label !== '' && snippet.latex !== '',
      ),
    ).toBe(true)
  })

  it('标签唯一，便于作为列表 key', () => {
    const labels = MATH_SNIPPETS.map((snippet) => snippet.label)

    expect(new Set(labels).size).toBe(labels.length)
  })
})
