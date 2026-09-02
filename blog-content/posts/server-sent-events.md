---
title: Server-Sent Events
slug: server-sent-events
summary: SSE 的通信模型、协议格式、浏览器接入方式与适用边界。
publishedAt: '2026-08-29'
category: JavaScript
coverImage: /information/background.webp
tags:
  - JavaScript
  - 网络
---

# SSE

SSE，全称是 **Server-Sent Events**，中文通常叫 **服务器发送事件**。

它解决的是一个很常见的问题：

> 服务器有新内容时，如何主动、连续地把数据推给浏览器？

在 AI 应用里，SSE 最典型的场景就是 **流式输出**：

```text
用户提问
  ↓
后端调用大模型
  ↓
大模型一点点生成文本
  ↓
后端通过 SSE 把增量内容持续推给前端
  ↓
前端逐字 / 逐段展示
```

## 1. SSE 是什么

SSE 是一种基于 HTTP 的服务器推送技术。

浏览器向后端发起一个 HTTP 请求，后端不立刻结束响应，而是保持连接打开。之后只要有新数据，后端就继续往这个响应里写入文本。

可以把它理解成：

> 普通 HTTP 是“一问一答”；SSE 是“一次请求，持续回答”。

| 通信方式 | 特点 |
|----------|------|
| 普通 HTTP | 前端请求一次，后端响应一次 |
| 轮询 | 前端每隔一段时间请求一次 |
| SSE | 前端建立连接，后端持续推送 |
| WebSocket | 前后端建立双向通信通道 |

SSE 的核心特点：

| 特点 | 说明 |
|------|------|
| 单向通信 | 只能服务器推给客户端 |
| 基于 HTTP | 不需要 WebSocket 协议升级 |
| 文本协议 | 数据按 UTF-8 文本传输 |
| 浏览器原生支持 | 原生 `EventSource` 可以接收 SSE |
| 自动重连 | 连接断开后，浏览器通常会自动重连 |

## 2. SSE 解决什么问题

如果没有 SSE，前端想知道“后端有没有新数据”，通常只能轮询：

```text
前端：有新数据吗？
后端：没有。

过 1 秒

前端：有新数据吗？
后端：没有。

过 1 秒

前端：有新数据吗？
后端：有，这里是结果。
```

轮询的问题是：

| 问题 | 说明 |
|------|------|
| 浪费请求 | 没有新数据时，请求也是无效消耗 |
| 延迟不稳定 | 取决于轮询间隔 |
| 后端压力大 | 大量客户端会产生大量重复请求 |
| 体验不自然 | AI 生成内容时，用户希望看到“正在生成”的过程 |

SSE 的方式是：

```text
前端：我建立一条连接，你有新内容就直接发给我。
后端：好。
后端：第 1 段来了。
后端：第 2 段来了。
后端：第 3 段来了。
后端：结束。
```

适合 SSE 的场景：

| 场景 | 为什么适合 |
|------|------------|
| AI 流式回答 | 后端持续产生 token / 文本片段 |
| 通知中心 | 服务器有新通知时推给页面 |
| 任务进度 | 文件上传、报告生成、构建任务进度 |
| 日志输出 | 后端持续产生日志，前端实时展示 |
| 实时看板 | 指标变化后推送到页面 |

不适合 SSE 的场景：

| 场景 | 更适合 |
|------|--------|
| 聊天室双向通信 | WebSocket |
| 协同编辑 | WebSocket |
| 游戏状态同步 | WebSocket |
| 很少变化的数据 | 普通 HTTP 或低频轮询 |
| 二进制数据传输 | WebSocket 或普通下载接口 |

## 3. SSE 的技术原理

SSE 的本质是：

> 后端返回一个 `Content-Type: text/event-stream` 的 HTTP 响应，并不断向响应体写入符合格式的文本块。

### 3.1 请求流程

```text
浏览器
  ↓ 发起 HTTP 请求
SSE 接口
  ↓ 返回 text/event-stream 响应头
后端保持连接不关闭
  ↓
后端持续 res.write(...)
  ↓
浏览器不断收到 message 事件
```

### 3.2 响应头

一个 SSE 接口通常需要这些响应头：

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

含义：

| Header | 作用 |
|--------|------|
| `Content-Type: text/event-stream` | 告诉浏览器这是 SSE 流 |
| `Cache-Control: no-cache` | 避免中间缓存影响实时性 |
| `Connection: keep-alive` | 尽量保持连接 |

生产环境如果经过 Nginx、网关或 CDN，还要注意关闭响应缓冲，否则数据可能被攒成一批后才发到浏览器。

### 3.3 消息格式

SSE 消息是纯文本，最常见格式是：

```text
data: hello

```

注意结尾必须有一个空行，也就是 `\n\n`。这个空行表示一条事件结束。

常见字段：

| 字段 | 作用 |
|------|------|
| `data:` | 事件数据 |
| `event:` | 自定义事件名 |
| `id:` | 事件 ID，断线重连时可用于续传 |
| `retry:` | 告诉浏览器重连间隔，单位毫秒 |
| `:` | 注释，常用于心跳保活 |

示例：

```text
event: message
id: 1
data: {"content":"你好"}

event: message
id: 2
data: {"content":"，我是 AI。"}

: keep-alive

```

浏览器收到后，会把 `data:` 后面的内容交给前端事件处理函数。

### 3.4 自动重连

SSE 的一个重要能力是自动重连。

如果连接断开，浏览器会尝试重新连接同一个 SSE 地址。如果服务端发送过 `id:` 字段，浏览器重连时会通过 `Last-Event-ID` 请求头告诉后端最后收到的事件 ID。

```text
服务端发送：
id: 10
data: hello

连接断开
  ↓
浏览器重连时携带：
Last-Event-ID: 10
```

是否真正“续传”，取决于后端有没有保存事件历史。SSE 只提供机制，不自动保存业务数据。

## 4. 前端如何接收 SSE

浏览器原生提供了 `EventSource`。

```js
const source = new EventSource('/api/events');

source.onmessage = event => {
  console.log('收到消息：', event.data);
};

source.onerror = error => {
  console.error('SSE 连接异常：', error);
};

// 不需要时主动关闭
// source.close();
```

如果后端发送了自定义事件：

```text
event: progress
data: {"percent":50}

```

前端可以这样监听：

```js
source.addEventListener('progress', event => {
  const data = JSON.parse(event.data);
  console.log(data.percent);
});
```

原生 `EventSource` 的限制：

| 限制 | 影响 |
|------|------|
| 只能发 GET 请求 | 不适合请求体很复杂的 AI 对话 |
| 不能自定义请求头 | 不方便携带 `Authorization` |
| 重试策略控制较弱 | 复杂业务需要自己补充控制 |

所以在 AI 场景里，前端经常使用基于 `fetch` 的 SSE 客户端库。

## 5. 示例：Express + fetch-event-source

这个例子使用：

| 位置 | 技术 |
|------|------|
| 后端 | `express` |
| 前端 | `@microsoft/fetch-event-source` |

选择 `@microsoft/fetch-event-source` 的原因是：它兼容 SSE 消息格式，但基于 `fetch`，可以使用 `POST`、自定义请求头和请求体，更贴近 AI 对话接口。

### 5.1 后端：Express SSE 接口

安装：

```bash
npm install express cors
```

后端代码：

```js
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const text = `你刚才说：${message}。这是一段模拟 AI 流式输出。`;
  let index = 0;

  const timer = setInterval(() => {
    const chunk = text[index];

    if (!chunk) {
      res.write('event: done\n');
      res.write('data: [DONE]\n\n');
      clearInterval(timer);
      res.end();
      return;
    }

    res.write('event: message\n');
    res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
    index += 1;
  }, 80);

  req.on('close', () => {
    clearInterval(timer);
  });
});

app.listen(3000, () => {
  console.log('SSE server is running at http://localhost:3000');
});
```

关键点：

| 代码 | 作用 |
|------|------|
| `text/event-stream` | 声明这是 SSE 响应 |
| `res.write(...)` | 持续向客户端写入数据 |
| `\n\n` | 表示一条 SSE 消息结束 |
| `req.on('close')` | 客户端断开后清理定时器，避免内存泄漏 |
| `event: done` | 用自定义事件告诉前端流结束 |

### 5.2 前端：fetch-event-source 接收流

安装：

```bash
npm install @microsoft/fetch-event-source
```

前端代码：

```js
import { fetchEventSource } from '@microsoft/fetch-event-source';

const output = document.querySelector('#output');
const controller = new AbortController();

await fetchEventSource('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: '请介绍一下 SSE',
  }),
  signal: controller.signal,
  onmessage(event) {
    if (event.data === '[DONE]') {
      return;
    }

    const data = JSON.parse(event.data);
    output.textContent += data.delta;
  },
  onerror(error) {
    console.error('SSE 连接出错：', error);
    throw error;
  },
});

// 用户点击“停止生成”时，可以中断请求
// controller.abort();
```

如果你只需要 GET 请求，也不需要自定义请求头，原生 `EventSource` 更简单：

```js
const source = new EventSource('/api/events');

source.onmessage = event => {
  console.log(event.data);
};
```

## 6. SSE 和 WebSocket 的区别

| 对比 | SSE | WebSocket |
|------|-----|-----------|
| 通信方向 | 服务端 -> 客户端 | 双向 |
| 底层协议 | HTTP | WebSocket 协议 |
| 浏览器 API | `EventSource` | `WebSocket` |
| 自动重连 | 原生支持一部分 | 通常需要自己实现 |
| 数据格式 | UTF-8 文本 | 文本或二进制 |
| 适合场景 | AI 流式输出、通知、进度、日志 | 聊天、协同编辑、游戏、双向实时通信 |

判断方法：

| 需求 | 选择 |
|------|------|
| 只需要服务器持续推送 | SSE |
| 前端也要频繁向后端实时发送消息 | WebSocket |
| 只是偶尔查一次状态 | 普通 HTTP / 轮询 |

## 7. 常见坑

| 问题 | 原因 | 处理 |
|------|------|------|
| 前端一直收不到消息 | 后端没有写 `\n\n` | 每条消息用空行结束 |
| 浏览器当成普通响应 | 缺少 `text/event-stream` | 设置正确 `Content-Type` |
| 线上不实时，攒一批才返回 | 网关或代理缓冲 | 关闭代理缓冲，避免响应被压缩或缓存 |
| 页面关闭后后端还在跑 | 没监听断开 | 用 `req.on('close')` 清理资源 |
| 多标签页连接受限 | HTTP/1.1 同域连接数有限 | 尽量复用连接，或使用 HTTP/2 |
| 需要传请求体 / 鉴权头 | 原生 `EventSource` 不支持 | 使用 `fetch-event-source` 或改用普通 fetch 流 |

## 8. 面试表达

可以这样说：

> SSE 是一种基于 HTTP 的服务器推送技术。前端建立一次长连接，后端以 `text/event-stream` 格式持续写入文本事件，浏览器通过 `EventSource` 或基于 fetch 的库持续接收。它适合 AI 流式输出、通知、进度和日志这类“服务端单向推送”的场景。如果需要真正双向通信，就应该考虑 WebSocket。

## 参考资料

| 类型 | 资料 |
|------|------|
| 标准 | [HTML Living Standard: Server-sent events](https://html.spec.whatwg.org/dev/server-sent-events.html) |
| 文档 | [MDN: Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) |
| 文档 | [MDN: EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) |
| 前端库 | [Azure/fetch-event-source](https://github.com/Azure/fetch-event-source) |
| 后端库 | [Express](https://expressjs.com/) |
