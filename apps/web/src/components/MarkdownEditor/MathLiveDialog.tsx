import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import type { MathfieldElement } from 'mathlive'
import 'mathlive'
import 'mathlive/fonts.css'
import 'mathlive/static.css'
import { MATH_SNIPPETS, type MathKind } from './lib/mathSnippets'

type MathLiveDialogProps = {
  onClose: () => void
  onInsert: (latex: string, kind: MathKind) => void
}

type MathVirtualKeyboardHost = Window & {
  mathVirtualKeyboard?: { hide(): void }
}

export default function MathLiveDialog({
  onClose,
  onInsert,
}: MathLiveDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const fieldRef = useRef<MathfieldElement | null>(null)
  const [latex, setLatex] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [])

  useEffect(() => {
    const field = fieldRef.current
    if (!field) {
      return
    }

    const handleInput = () => setLatex(field.value)
    field.mathVirtualKeyboardPolicy = 'auto'
    field.addEventListener('input', handleInput)

    return () => {
      field.removeEventListener('input', handleInput)
      ;(window as MathVirtualKeyboardHost).mathVirtualKeyboard?.hide()
    }
  }, [])

  const requestClose = () => {
    const dialog = dialogRef.current
    if (dialog?.open) {
      // close 事件会回调 onClose，保证关闭路径只有一处出口。
      dialog.close()
      return
    }
    onClose()
  }

  const insertSnippet = (snippet: string) => {
    const field = fieldRef.current
    if (!field) {
      return
    }

    field.focus()
    field.insert(snippet)
    setLatex(field.value)
  }

  const handleInsert = (kind: MathKind) => {
    const value = latex.trim()
    if (value === '') {
      return
    }

    onInsert(value, kind)
    requestClose()
  }

  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) {
      requestClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="md-math-dialog"
      onClose={onClose}
      onClick={handleDialogClick}
    >
      <div className="md-math-dialog__panel">
        <header className="md-math-dialog__header">
          <div>
            <p className="md-math-dialog__eyebrow">FORMULA</p>
            <h2 className="md-math-dialog__title">公式精编</h2>
          </div>
          <button
            type="button"
            className="md-icon-button"
            aria-label="关闭公式弹窗"
            onClick={requestClose}
          >
            ×
          </button>
        </header>

        <div className="md-math-dialog__snippets" aria-label="常用公式片段">
          {MATH_SNIPPETS.map((snippet) => (
            <button
              key={snippet.label}
              type="button"
              className="md-chip"
              onClick={() => insertSnippet(snippet.latex)}
            >
              {snippet.label}
            </button>
          ))}
        </div>

        <math-field ref={fieldRef} className="md-math-field" />

        <p className="md-math-dialog__hint">
          也可以直接手写 LaTeX：<code>{latex || '$a^2 + b^2 = c^2$'}</code>
        </p>

        <footer className="md-math-dialog__actions">
          <button type="button" className="md-button" onClick={requestClose}>
            取消
          </button>
          <button
            type="button"
            className="md-button"
            disabled={latex.trim() === ''}
            onClick={() => handleInsert('inline')}
          >
            插入行内公式
          </button>
          <button
            type="button"
            className="md-button md-button--primary"
            disabled={latex.trim() === ''}
            onClick={() => handleInsert('block')}
          >
            插入块级公式
          </button>
        </footer>
      </div>
    </dialog>
  )
}
