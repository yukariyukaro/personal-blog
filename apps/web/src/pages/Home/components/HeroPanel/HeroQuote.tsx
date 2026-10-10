import { useEffect, useState, useSyncExternalStore } from 'react'

const TYPE_DURATION = 3500
const START_DELAY = 2000
const getReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const getServerReducedMotion = () => true

function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export default function HeroQuote({ text, isReady }: { text: string; isReady: boolean }) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, getServerReducedMotion)
  const [typedLength, setTypedLength] = useState(0)

  useEffect(() => {
    if (!isReady || reducedMotion || !text.length) return

    let interval = 0
    const delay = window.setTimeout(() => {
      let length = 0
      interval = window.setInterval(() => {
        length += 1
        setTypedLength(length)
        if (length >= text.length) window.clearInterval(interval)
      }, TYPE_DURATION / text.length)
    }, START_DELAY)

    return () => {
      window.clearTimeout(delay)
      window.clearInterval(interval)
    }
  }, [isReady, reducedMotion, text])

  const isComplete = reducedMotion || typedLength >= text.length
  return (
    <p className="home-quote" aria-label={text} data-complete={isComplete}>
      <span className="home-quote__reserve" aria-hidden="true">{text}</span>
      <span className="home-quote-text" aria-hidden="true">{reducedMotion ? text : text.slice(0, typedLength)}</span>
    </p>
  )
}
