import { readFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'

/**
 * 从 Playwright trace.zip 中读取测试级动作时间线。
 * 只依赖 zip 中央目录与 Playwright 的 JSONL 事件流；任何解析失败都退化为空结果，
 * 由调用方回退为「只给 trace 路径」，绝不让报告生成影响测试运行。
 */

type ZipEntry = {
  name: string
  offset: number
  compressedSize: number
  method: number
}

type TraceEvent = {
  type?: string
  class?: string
  method?: string
  callId?: string
  title?: string
  subtitle?: string
  startTime?: number
  endTime?: number
  error?: { message?: string }
}

export type TimelineStep = {
  index: number
  at: number
  duration: number
  title: string
  detail?: string
  error?: string
}

/** ESC 序列用字符扫描剔除，避免在正则字面量里写控制字符。报告产物不应含终端转义码。 */
export const stripAnsi = (value: string) => {
  let output = ''
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 27) {
      index += 1
      while (index < value.length && !/[A-Za-z]/.test(value[index])) index += 1
      continue
    }
    output += value[index]
  }
  return output
}

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50
const EOCD_MIN_SIZE = 22
const MAX_COMMENT = 0xffff

const readCentralDirectory = (buffer: Buffer): ZipEntry[] => {
  let eocd = -1
  const lowest = Math.max(0, buffer.length - EOCD_MIN_SIZE - MAX_COMMENT)

  for (let cursor = buffer.length - EOCD_MIN_SIZE; cursor >= lowest; cursor -= 1) {
    if (buffer.readUInt32LE(cursor) === EOCD_SIGNATURE) {
      eocd = cursor
      break
    }
  }
  if (eocd < 0) return []

  const total = buffer.readUInt16LE(eocd + 10)
  let pointer = buffer.readUInt32LE(eocd + 16)
  const entries: ZipEntry[] = []

  for (let index = 0; index < total; index += 1) {
    if (pointer + 46 > buffer.length || buffer.readUInt32LE(pointer) !== CENTRAL_SIGNATURE) break
    const nameLength = buffer.readUInt16LE(pointer + 28)
    entries.push({
      method: buffer.readUInt16LE(pointer + 10),
      compressedSize: buffer.readUInt32LE(pointer + 20),
      offset: buffer.readUInt32LE(pointer + 42),
      name: buffer.subarray(pointer + 46, pointer + 46 + nameLength).toString('utf8'),
    })
    pointer += 46 + nameLength + buffer.readUInt16LE(pointer + 30) + buffer.readUInt16LE(pointer + 32)
  }

  return entries
}

const readEntry = (buffer: Buffer, entry: ZipEntry): Buffer | null => {
  if (entry.offset + 30 > buffer.length || buffer.readUInt32LE(entry.offset) !== LOCAL_SIGNATURE) return null
  const nameLength = buffer.readUInt16LE(entry.offset + 26)
  const extraLength = buffer.readUInt16LE(entry.offset + 28)
  const start = entry.offset + 30 + nameLength + extraLength
  const data = buffer.subarray(start, start + entry.compressedSize)
  if (entry.method === 0) return data
  if (entry.method !== 8) return null
  try {
    return inflateRawSync(data)
  } catch {
    return null
  }
}

const parseEvents = (raw: Buffer): TraceEvent[] =>
  raw
    .toString('utf8')
    .split('\n')
    .flatMap(line => {
      if (!line.trim()) return []
      try {
        return [JSON.parse(line) as TraceEvent]
      } catch {
        return []
      }
    })

const round = (value: number) => Math.round(value * 100) / 100

export function readTraceTimeline(tracePath: string): TimelineStep[] {
  try {
    const buffer = readFileSync(tracePath)
    const entry = readCentralDirectory(buffer).find(candidate => candidate.name === 'test.trace')
    if (!entry) return []

    const raw = readEntry(buffer, entry)
    if (!raw) return []

    const events = parseEvents(raw)
    const endTimes = new Map<string, { endTime: number; error?: string }>()
    for (const event of events) {
      if (event.type === 'after' && event.callId) {
        endTimes.set(event.callId, {
          endTime: event.endTime ?? event.startTime ?? 0,
          error: event.error?.message ? stripAnsi(event.error.message).split('\n')[0] : undefined,
        })
      }
    }

    const origin = events.find(event => typeof event.startTime === 'number')?.startTime ?? 0
    const steps: TimelineStep[] = []

    for (const event of events) {
      if (event.type !== 'before' || !event.callId) continue
      // class 恒为 "Test"，动作类型在 method：hook / fixture / pw:api / expect。
      // hook 与 fixture 属于测试框架噪声，报告只保留用户动作与断言。
      const method = event.method ?? ''
      if (method !== 'pw:api' && method !== 'expect') continue
      const settled = endTimes.get(event.callId)
      const startTime = event.startTime ?? origin
      steps.push({
        index: steps.length + 1,
        at: round((startTime - origin) / 1000),
        duration: round(Math.max(0, (settled?.endTime ?? startTime) - startTime)),
        title: event.title ?? method ?? 'action',
        detail: event.subtitle,
        error: settled?.error,
      })
    }

    return steps
  } catch {
    return []
  }
}
