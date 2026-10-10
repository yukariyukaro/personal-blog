import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import type { FullConfig, FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import { CHECKPOINT_DIR } from './artifacts'
import { readTraceTimeline, stripAnsi } from './traceTimeline'

/**
 * 产出面向 AI 阅读的 Markdown 验收报告。
 *
 * 目的：AI 只需读 output/e2e-report/summary.md（必要时再按报告给出的路径读 trace 文本或关键节点截图），
 * 不需要自己打开页面或通读整页 PNG。
 */

const DEFAULT_REPORT_PATH = 'output/e2e-report/summary.md'
const MAX_ERROR_LINES = 14
const MAX_TIMELINE_STEPS = 24

/** 产物与截图都以运行目录（apps/web）为基准，与 Playwright 的相对路径解析一致。 */
const baseDir = () => process.cwd()

type Attempt = {
  test: TestCase
  result: TestResult
  retry: number
}

const toPortable = (value: string) => value.split('\\').join('/')

const code = (value: string) => `\`${value}\``

const fence = (value: string, language = '') => `\`\`\`${language}\n${value.trimEnd()}\n\`\`\``

const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.round(milliseconds / 1000)
  if (totalSeconds < 60) return `${totalSeconds}s`
  return `${Math.floor(totalSeconds / 60)}m${String(totalSeconds % 60).padStart(2, '0')}s`
}

const formatClock = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const statusOf = (attempt: Attempt) => {
  if (attempt.result.status === 'skipped') return 'skipped'
  return attempt.result.status === 'passed' ? 'passed' : 'failed'
}

/** 一个用例可能重试多次，取最终一次作为判定，重试次数单独记录。 */
const pickFinalAttempts = (attempts: Attempt[]) => {
  const finalAttempts = new Map<TestCase, Attempt>()
  const seen = new Map<TestCase, number>()
  for (const attempt of attempts) {
    finalAttempts.set(attempt.test, attempt)
    seen.set(attempt.test, (seen.get(attempt.test) ?? 0) + 1)
  }
  return { finalAttempts, attemptsPerTest: seen }
}

const stripTestPath = (value: string) => toPortable(value).replace(/^.*\/tests\//, 'tests/')

const collectSkipReason = (result: TestResult, test: TestCase) => {
  const message = result.error?.message ? stripAnsi(result.error.message).split('\n')[0] : ''
  if (message) return message
  const annotation = test.annotations.find(candidate => candidate.type === 'skip')
  return annotation?.description ?? '未说明原因'
}

const formatTimeline = (tracePath: string) => {
  const steps = readTraceTimeline(tracePath)
  if (!steps.length) return null
  const shown = steps.slice(0, MAX_TIMELINE_STEPS)
  const width = String(shown.length).length
  const body = shown
    .map(step => {
      const position = String(step.index).padStart(width, ' ')
      const time = `${step.at.toFixed(2)}s`.padStart(8, ' ')
      const cost = `${Math.round(step.duration)}ms`.padStart(6, ' ')
      const marker = step.error ? '✗' : ' '
      const detail = step.detail ? `  ${step.detail}` : ''
      const failure = step.error ? `\n      ↳ ${step.error}` : ''
      return `${marker} ${position} ${time} ${cost}  ${step.title}${detail}${failure}`
    })
    .join('\n')
  const rest = steps.length > shown.length ? `\n… 其余 ${steps.length - shown.length} 步见 trace` : ''
  return `${body}${rest}`
}

const cleanError = (result: TestResult) => {
  const message = result.error?.message
  if (!message) return ''
  const lines = stripAnsi(message).split('\n').filter(line => line.trim())
  const shown = lines.slice(0, MAX_ERROR_LINES).join('\n')
  return lines.length > MAX_ERROR_LINES ? `${shown}\n… 其余 ${lines.length - MAX_ERROR_LINES} 行见 trace` : shown
}

const formatTraceHint = (tracePath: string) => {
  const portable = toPortable(tracePath)
  return [
    `pnpm exec playwright trace open ${portable}`,
    'pnpm exec playwright trace actions   # 或 errors / console / screenshot <id>',
  ]
}

export default class AcceptanceReport implements Reporter {
  private readonly attempts: Attempt[] = []
  private config: FullConfig | null = null

  onBegin(config: FullConfig) {
    this.config = config
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.attempts.push({ test, result, retry: result.retry })
  }

  onEnd(result: FullResult) {
    try {
      this.write(result)
    } catch (error) {
      // 报告生成失败不能影响测试结论。
      console.error(`[acceptance-report] 生成报告失败：${(error as Error).message}`)
    }
  }

  private write(runResult: FullResult) {
    const config = this.config
    if (!config) return

    const { finalAttempts, attemptsPerTest } = pickFinalAttempts(this.attempts)
    const final = [...finalAttempts.values()].sort((left, right) =>
      left.test.titlePath().join(' › ').localeCompare(right.test.titlePath().join(' › ')),
    )

    const passed = final.filter(attempt => statusOf(attempt) === 'passed')
    const failed = final.filter(attempt => statusOf(attempt) === 'failed')
    const skipped = final.filter(attempt => statusOf(attempt) === 'skipped')

    const reportPath = resolve(baseDir(), process.env.E2E_REPORT_PATH ?? DEFAULT_REPORT_PATH)
    const lines: string[] = []

    lines.push('# E2E 验收报告', '')
    lines.push(`- 生成时间：${formatClock(new Date())}`)
    lines.push(`- 运行命令：${code(`pnpm exec playwright ${process.argv.slice(2).join(' ') || 'test'}`)}`)
    lines.push(`- 视口档位：${config.projects.map(project => {
      const viewport = project.use?.viewport
      const size = viewport && typeof viewport === 'object' ? `${viewport.width}×${viewport.height}` : '默认'
      return `${project.name} ${size}`
    }).join('、')}`)
    lines.push(`- 总耗时：${formatDuration(runResult.duration)}`)
    lines.push(`- 本次结论：${failed.length ? '❌ 未通过' : '✅ 全部通过'}`, '')

    lines.push('| 结果 | 数量 |', '| --- | --- |')
    lines.push(`| 通过 | ${passed.length} |`)
    lines.push(`| 失败 | ${failed.length} |`)
    lines.push(`| 跳过 | ${skipped.length} |`, '')

    lines.push('## 失败项', '')
    if (!failed.length) {
      lines.push('无。', '')
    } else {
      failed.forEach((attempt, index) => {
        const titlePath = attempt.test.titlePath().slice(1)
        const retries = (attemptsPerTest.get(attempt.test) ?? 1) - 1
        const location = attempt.test.location
        lines.push(`### ${index + 1}. ${titlePath.slice(2).join(' › ')} · ${titlePath[0]}`, '')
        lines.push(`- 位置：${code(`${stripTestPath(location.file)}:${location.line}`)}`)
        if (retries > 0) lines.push(`- 重试：${retries} 次后仍失败`)
        lines.push('')
        const error = cleanError(attempt.result)
        if (error) {
          lines.push('**错误**', '', fence(error), '')
        }
        const trace = attempt.result.attachments.find(attachment => attachment.name === 'trace' && attachment.path)
        if (trace?.path) {
          const timeline = formatTimeline(trace.path)
          if (timeline) {
            lines.push('**动作时间线**（摘自 trace，✗ 表示该步失败）', '', fence(timeline), '')
          }
          lines.push('**复现与深入排查**', '', fence(formatTraceHint(trace.path).join('\n'), 'bash'), '')
        }
        // 关键节点截图在下方的独立表格里按稳定路径列出，这里不再重复哈希副本。
        const extraAttachments = attempt.result.attachments.filter(
          attachment => attachment.path && attachment !== trace && !attachment.name.startsWith('checkpoint:'),
        )
        if (extraAttachments.length) {
          lines.push('**其他产物**', '')
          for (const attachment of extraAttachments) {
            const path = resolve(baseDir(), attachment.path!)
            lines.push(`- ${attachment.name}：${code(toPortable(relative(baseDir(), path)))}`)
          }
          lines.push('')
        }
      })
    }

    lines.push('## 跳过项', '')
    if (!skipped.length) {
      lines.push('无。', '')
    } else {
      lines.push('| 用例 | 视口 | 原因 |', '| --- | --- | --- |')
      for (const attempt of skipped) {
        const titlePath = attempt.test.titlePath().slice(1)
        lines.push(`| ${titlePath.slice(1).join(' › ')} | ${titlePath[0]} | ${collectSkipReason(attempt.result, attempt.test)} |`)
      }
      lines.push('')
    }

    const checkpointNames = new Map<string, string[]>()
    for (const attempt of final) {
      const project = attempt.test.titlePath()[1]
      for (const attachment of attempt.result.attachments) {
        if (!attachment.name.startsWith('checkpoint:')) continue
        const name = attachment.name.replace('checkpoint:', '')
        checkpointNames.set(name, [...(checkpointNames.get(name) ?? []), project])
      }
    }
    lines.push('## 关键节点截图', '')
    if (!checkpointNames.size) {
      lines.push('本次运行未采集关键节点截图。', '')
    } else {
      lines.push(`路径规则：${code(`${CHECKPOINT_DIR}/<视口>/<名称>.png`)}。`, '')
      lines.push('按需读取，不必全部读入；截图是定点证据，不是整页通读材料。', '')
      lines.push('| 名称 | 已采集视口 |', '| --- | --- |')
      for (const [name, projects] of [...checkpointNames].sort(([left], [right]) => left.localeCompare(right))) {
        const unique = config.projects
          .map(project => project.name)
          .filter(projectName => projects.includes(projectName))
        lines.push(`| ${name} | ${unique.join(' · ')} |`)
      }
      lines.push('')
    }

    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, `${lines.join('\n').trimEnd()}\n`, 'utf8')
    console.log(`\n[acceptance-report] 验收报告：${toPortable(relative(baseDir(), reportPath))}`)
  }
}
