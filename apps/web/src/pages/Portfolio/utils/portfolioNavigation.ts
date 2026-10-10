type NavigationKey = {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

export const hasKeyModifier = (event: NavigationKey) => event.altKey || event.ctrlKey || event.metaKey || event.shiftKey

export function getProjectStep(event: NavigationKey): 1 | -1 | null {
  if (hasKeyModifier(event)) return null
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') return 1
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') return -1
  return null
}
