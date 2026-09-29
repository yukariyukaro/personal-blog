import type { MathfieldElement } from 'mathlive'
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

/**
 * React 19 已把 JSX 命名空间收进 react 模块，因此这里用模块扩展而非
 * 全局 JSX 声明，让 <math-field> 在内联 JSX 中可用。
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': DetailedHTMLProps<
        HTMLAttributes<MathfieldElement>,
        MathfieldElement
      >
    }
  }
}
