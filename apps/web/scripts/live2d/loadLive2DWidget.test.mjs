import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loadLive2DWidget,
  startLive2DLoadAttempt,
  waitForLive2DModel,
  withTimeout,
} from '../../src/components/Live2DWidget/loadLive2DWidget.ts'

const immediateScheduler = {
  setTimeout(callback) {
    queueMicrotask(callback)
    return 1
  },
  clearTimeout() {},
}

const createWidget = (destroy) => {
  let notifyLoaded = () => {}

  return {
    widget: {
      destroy,
      l2d: {
        getCanvas: () => null,
        on: (_event, listener) => {
          notifyLoaded = listener
        },
      },
      sleep() {},
    },
    notifyLoaded: () => notifyLoaded(),
  }
}

test('脚本超时后移除旧节点并允许重试', async (context) => {
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const scripts = []
  let currentScript = null

  context.after(() => {
    if (previousWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = previousWindow
    }
    if (previousDocument === undefined) {
      delete globalThis.document
    } else {
      globalThis.document = previousDocument
    }
  })

  globalThis.window = {}
  globalThis.document = {
    querySelector: () => currentScript,
    createElement: () => {
      const script = new EventTarget()
      script.dataset = {}
      script.remove = () => {
        if (currentScript === script) {
          currentScript = null
        }
      }
      return script
    },
    head: {
      appendChild: (script) => {
        currentScript = script
        scripts.push(script)
      },
    },
  }

  await assert.rejects(
    loadLive2DWidget(10_000, immediateScheduler),
    /Live2D 脚本加载超时/,
  )
  assert.equal(currentScript, null)

  let timeoutCleared = false
  const retryScheduler = {
    setTimeout: () => 2,
    clearTimeout: () => {
      timeoutCleared = true
    },
  }
  const api = { createWidget: () => {} }
  const retry = loadLive2DWidget(10_000, retryScheduler)
  globalThis.window.L2D_WIDGET = api
  currentScript.dispatchEvent(new Event('load'))

  assert.equal(await retry, api)
  assert.equal(scripts.length, 2)
  assert.equal(timeoutCleared, true)
})

test('超时后完成清理再返回失败', async () => {
  const events = []
  const operation = new Promise(() => {})

  await assert.rejects(
    withTimeout(
      operation,
      10_000,
      '加载超时',
      async () => {
        events.push('cleanup')
      },
      immediateScheduler,
    ),
    /加载超时/,
  )
  assert.deepEqual(events, ['cleanup'])
})

test('模型等待超时后销毁实例且不会重复销毁', async () => {
  let destroyCount = 0
  const { widget } = createWidget(() => {
    destroyCount += 1
  })

  await assert.rejects(
    waitForLive2DModel(widget, 15_000, immediateScheduler),
    /Live2D 模型加载超时/,
  )
  assert.equal(destroyCount, 1)

  await startLive2DLoadAttempt(widget, async () => 'retry')
  assert.equal(destroyCount, 1)
})

test('模型 loaded 后取消超时且保留实例', async () => {
  let timeoutCallback = () => {}
  let timeoutCleared = false
  let destroyCount = 0
  const scheduler = {
    setTimeout(callback) {
      timeoutCallback = callback
      return 1
    },
    clearTimeout() {
      timeoutCleared = true
    },
  }
  const { widget, notifyLoaded } = createWidget(() => {
    destroyCount += 1
  })

  const loaded = waitForLive2DModel(widget, 15_000, scheduler)
  notifyLoaded()
  await loaded
  timeoutCallback()

  assert.equal(timeoutCleared, true)
  assert.equal(destroyCount, 0)
})

test('重试先清理旧实例再执行新加载', async () => {
  const events = []
  const { widget } = createWidget(async () => {
    events.push('destroy:start')
    await Promise.resolve()
    events.push('destroy:end')
  })

  const result = await startLive2DLoadAttempt(widget, async () => {
    events.push('load')
    return 'loaded'
  })

  assert.equal(result, 'loaded')
  assert.deepEqual(events, ['destroy:start', 'destroy:end', 'load'])
})
