export type MathKind = 'inline' | 'block'

export type MathSnippet = {
  label: string
  latex: string
}

export const MATH_SNIPPETS: MathSnippet[] = [
  { label: '分式', latex: '\\frac{a}{b}' },
  { label: '根式', latex: '\\sqrt{x}' },
  { label: 'n 次根', latex: '\\sqrt[n]{x}' },
  { label: '上标', latex: 'x^{2}' },
  { label: '下标', latex: 'x_{1}' },
  { label: '求和', latex: '\\sum_{i=1}^{n} a_i' },
  { label: '连乘', latex: '\\prod_{i=1}^{n} a_i' },
  { label: '积分', latex: '\\int_{a}^{b} f(x)\\,dx' },
  { label: '极限', latex: '\\lim_{x \\to \\infty} f(x)' },
  { label: '导数', latex: '\\frac{dy}{dx}' },
  { label: '偏导', latex: '\\frac{\\partial f}{\\partial x}' },
  {
    label: '矩阵',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
  },
  {
    label: '分段函数',
    latex:
      '\\begin{cases} x + y = 1 \\\\ x - y = 3 \\end{cases}',
  },
  { label: '向量', latex: '\\vec{a}' },
  { label: '范数', latex: '\\lVert x \\rVert' },
  { label: '不等式', latex: 'a \\leq b \\leq c' },
]

export const buildMathMarkup = (latex: string, kind: MathKind) =>
  kind === 'inline' ? `$${latex}$` : `\n$$\n${latex}\n$$\n`
