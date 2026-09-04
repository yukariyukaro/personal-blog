export type SiteProfile = {
  readonly name: string
  readonly handle?: string
  readonly role?: string
  readonly email?: string
  readonly githubUrl?: string
  readonly bilibiliUrl?: string
  readonly avatarPath?: string
  readonly statusMessage?: string
  readonly welcome?: {
    readonly title: string
    readonly message: string
    readonly actionLabel?: string
  }
  readonly quote?: {
    readonly title: string
    readonly text: string
    readonly author?: string
  }
}

export const siteProfile: SiteProfile = {
  name: '娄宿三',
  handle: 'Hamal',
  role: '前端开发者',
  email: '1981805808@qq.com',
  githubUrl: 'https://github.com/YukariYukaro',
  bilibiliUrl: 'https://space.bilibili.com/39374538',
  avatarPath: 'home/miku_点赞.jpg',
  statusMessage: '保持好奇，持续输出',
  welcome: {
    title: '欢迎来访',
    message: '这里是一个整理知识、记录项目和保存灵感的个人内容空间。',
    actionLabel: '开始阅读',
  },
  quote: {
    title: '今日一言',
    text: '“纸上得来终觉浅，绝知此事要躬行。”',
    author: '陆游',
  },
}
