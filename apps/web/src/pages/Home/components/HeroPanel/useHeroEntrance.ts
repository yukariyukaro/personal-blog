import { useSyncExternalStore } from 'react'

const getSnapshot = () => !document.getElementById('global-loading')
const getServerSnapshot = () => false

function subscribe(onChange: () => void) {
  if (getSnapshot()) return () => undefined
  // Loading 的淡出结束并移除后再起播，避免进场被启动遮罩吞掉。
  const observer = new MutationObserver(() => {
    onChange()
    if (getSnapshot()) observer.disconnect()
  })
  observer.observe(document.body, { childList: true })
  return () => observer.disconnect()
}

export function useHeroEntrance() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
