import { describe, expect, expectTypeOf, it } from 'vitest'
import { getCardSlot, getFileNumber, getProjectIndex, normalizeProjectIndex, PROJECTS } from '../../src/pages/Portfolio/utils/projects'
import type { PortfolioProject } from '../../src/pages/Portfolio/utils/projects'
import { getProjectStep, hasKeyModifier } from '../../src/pages/Portfolio/utils/portfolioNavigation'

describe('作品档案目录', () => {
  it('项目ID唯一且详情直达与原外链一致', () => {
    expect(new Set(PROJECTS.map(project => project.id)).size).toBe(4)
    expect(getProjectIndex('triple-uni')).toBe(0)
    expect(getProjectIndex('yugong')).toBe(2)
    expect(getProjectIndex('missing')).toBe(-1)
    expect(getProjectIndex(null)).toBe(-1)
    expect(PROJECTS[1].link).toBe('https://yukariyukaro.github.io/2025EndYearReport/')
  })

  it('有图和无图作品各自有稳定的封面身份', () => {
    expect(PROJECTS[0].image).toContain('TripleUni.webp')
    expect(PROJECTS[1].image).toContain('YearReport.webp')
    expect(PROJECTS[2].image).toBeUndefined()
    expect(PROJECTS[3].image).toBeUndefined()
    expect(PROJECTS[2].artwork).toBe('migration')
    expect(PROJECTS[3].artwork).toBe('warehouse')
  })

  it('项目类型拒绝只有图片或只有方向的配置', () => {
    type TextFields = Omit<PortfolioProject, 'image' | 'imageType'>
    expectTypeOf<TextFields & { image: string }>().not.toExtend<PortfolioProject>()
    expectTypeOf<TextFields & { imageType: 'portrait' }>().not.toExtend<PortfolioProject>()
    expectTypeOf<TextFields & { image: string; imageType: 'landscape' }>().toExtend<PortfolioProject>()
    expectTypeOf<TextFields>().toExtend<PortfolioProject>()
  })

  it('真实图片与方向成对配置，原创封面没有真实图片方向', () => {
    for (const project of PROJECTS) {
      if (project.image) expect(['landscape', 'portrait']).toContain(project.imageType)
      else expect(project.imageType).toBeUndefined()
    }
  })

  it.each([[-1, 3], [4, 0], [-9, 3], [12, 0]])('索引 %i 循环归一到 %i', (index, expected) => {
    expect(normalizeProjectIndex(index)).toBe(expected)
  })

  it('方向键判定放行修饰键和其他原生按键', () => {
    const event = { key: 'ArrowRight', altKey: false, ctrlKey: false, metaKey: false, shiftKey: false }
    expect(getProjectStep(event)).toBe(1)
    expect(getProjectStep({ ...event, key: 'ArrowDown' })).toBe(1)
    expect(getProjectStep({ ...event, key: 'ArrowLeft' })).toBe(-1)
    expect(getProjectStep({ ...event, key: 'ArrowUp' })).toBe(-1)
    expect(getProjectStep({ ...event, key: 'Enter' })).toBeNull()
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const) {
      const modified = { ...event, [modifier]: true }
      expect(hasKeyModifier(modified)).toBe(true)
      expect(getProjectStep(modified)).toBeNull()
    }
  })

  it('循环卡列始终显示中心、左邻与右邻，不重复', () => {
    PROJECTS.forEach((_, activeIndex) => {
      const slots = PROJECTS.map((__, index) => getCardSlot(index, activeIndex))
      expect(slots.filter(slot => Math.abs(slot) <= 1).sort()).toEqual([-1, 0, 1])
      expect(slots[activeIndex]).toBe(0)
    })
    expect(getCardSlot(3, 0)).toBe(-1)
    expect(getCardSlot(0, 3)).toBe(1)
    expect(getFileNumber(0)).toBe('01')
    expect(getFileNumber(3)).toBe('04')
  })
})
