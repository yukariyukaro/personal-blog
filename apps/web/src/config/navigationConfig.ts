export type NavigationItem = {
  id: string
  label: string
  shortLabel: string
  path: string
  groupId?: string
}

export const navigationItems = [
  { id: 'home', label: 'INDEX', shortLabel: '首页', path: '/Home' },
  {
    id: 'information',
    label: 'INFORMATION',
    shortLabel: '介绍',
    path: '/Information',
  },
  {
    id: 'portfolio',
    label: 'PORTFOLIO',
    shortLabel: '作品',
    path: '/Portfolio',
  },
] as const satisfies readonly NavigationItem[]

export type NavigationItemId = (typeof navigationItems)[number]['id']
