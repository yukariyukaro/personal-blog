# Streaming SSR

> 来源：<https://bytedance.larkoffice.com/wiki/GRwgwDetpic32BkIexwcMXaGnkd>  
> 飞书文档版本：2156

## Stream 为何物

在古早的 web 环境中，没有动态数据，一切都是在访问页面那一刻确定。之后，为了能够让网页“动”起来，W3C 制订了 [AJAX](https://en.wikipedia.org/wiki/Ajax_(programming)) 技术。但是 AJAX 解决了 “动” 的问题，但随着业务发展，逐渐凸显出大体积数据场景下不得不长时间等待的问题。

慢慢地，当用户在一些存在大量数据场景下，不再能忍受长时间的数据返回等待。此时，[Stream API 技术](https://streams.spec.whatwg.org/#intro)应运而生。

![图片展示了 Stream API 的数据处理流程。从左侧云朵图标开始，数据从网络获取（Fetch from network），以多个 data 小块形式出现，接着进入中间齿轮状图标代表的数据处理环节（Process Data），处理后的数据仍以小块形式，最终到达右侧的展示框，进行数据渲染（Render Data）。此图直观呈现了 Stream 将大量数据拆分为小数据单位（chunk），逐个返回并处理、渲染的过程，与文中对 Stream API 的原理介绍相契合。](https://feishu.cn/file/IEb4bsDGuoSqWexmrPLcZTxSnfh)

相比于 AJAX 技术一次性返回所有数据的形式，Stream 标准定义了一套底层 IO 原语，基于该原语可在上层实现包括但不限于 [socket](https://nodejs.org/docs/latest/api/net.html#class-netsocket)、[fetch](https://fetch.spec.whatwg.org/) 等上层 API。**Stream 强调将大量数据拆分为尽可能小的数据单位（一个数据单位称为 chunk），逐个返回给客户端——排着队的数据块**。当前 Stream 在数据压缩、音视频播放、图片编解码、文件转换等场景存在广泛应用。

综上，在 Web 经历高速发展的背景下，业务更加关注 UI 交互的丰富性，进而对数据的诉求提出更高要求，Stream API 的主要优势是：

1. 不用等数据完全下载好，就可以读取，可更快实现交互。
2. 基于以 chunk 粒度的数据读取，可以实现更小的内存使用，即不需要将所有数据加载到内存中。提升中低端设备交互性能。

## Web/Node 生态中的 Stream

<table><colgroup><col/><col/><col/></colgroup><tbody><tr><td>类型</td><td>使用场景</td><td>示例</td></tr><tr><td>ReadableStream</td><td>出现在数据消费端，对数据仅有读取场景，不会写入任何数据。<br/>一般情况下，是作为 push/pull 架构下的客户端数据传输实现存在</td><td><pre lang="TypeScript"><code>import { createReadStream } from 'fs';<br/>const reader = createReadStream('input.txt');<br/><br/>for await (const chunk of reader) {<br/>  // 接受可读流中的每一个 chunk 数据<br/>  console.log("current buffer", chunk)<br/>}</code></pre></td></tr><tr><td>WritableStream</td><td>出现在数据生产者端，对数据仅有写入场景，不会读取任何数据<br/>一般情况下，作为 push/pull 架构下服务端数据传输实现存在</td><td><pre lang="TypeScript"><code>import { createWriteStream } from 'fs';<br/><br/>const writer = createWriteStream('output.txt');<br/><br/>for await (const chunk of readerStream) {<br/>    writer.write(chunk)<br/>}<br/><br/>writer.end()</code></pre><pre lang="TypeScript"><code>const { createGzip } = require('node:zlib');<br/>const { pipeline } = require('node:stream');<br/>const {<br/>  createReadStream,<br/>  createWriteStream,<br/>} = require('node:fs');<br/><br/>const gzip = createGzip();<br/>const source = createReadStream('input.txt');<br/>const destination = createWriteStream('input.txt.gz');<br/><br/>pipeline(source, gzip, destination, (err) =&gt; {<br/>  if (err) {<br/>    console.error('An error occurred:', err);<br/>    process.exitCode = 1;<br/>  }<br/>});</code></pre></td></tr><tr><td>Transform/Duplex Stream</td><td>双工流，本质是即可读亦可写流</td><td><pre lang="TypeScript"><code>// streams.mjs<br/>import { pipeline } from 'node:stream/promises';<br/>import { createReadStream, createWriteStream } from 'node:fs';<br/>import { createGzip } from 'node:zlib';<br/><br/>// ensure you have a `package.json` file for this test!<br/>await pipeline<br/>(<br/>  createReadStream('package.json'),<br/>  createGzip(),<br/>  createWriteStream('package.json.gz')<br/>);<br/><br/>// run with `node streams.mjs`</code></pre></td></tr></tbody></table>

## React 中的 Stream

<figure view-type="Preview"><source name="streaming_ssr.webm" mime="video/webm" origin-height="1080.000000" origin-width="1920.000000" size="524523" token="JliwbSoEwo4BO2xLFZHcFxykn9s"/></figure>

<table><colgroup><col/><col/><col/></colgroup><tbody><tr><td>API</td><td>描述</td><td>使用环境</td></tr><tr><td><a href="https://github.com/facebook/react/blob/9f2eebd807bf53b7d9901cf0b768762948224cae/packages/react-dom/src/server/ReactDOMFizzServerBrowser.js#L71-L160">renderToReadableStream</a></td><td>renders a React tree to a <a href="https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream">Readable Web Stream</a></td><td>用于边缘函数运行时，如 deno，cloudflare worker，与 renderToPipeableStream 的主要差异是此 API 是基于 Web Stream API 实现的</td></tr><tr><td><a href="https://github.com/facebook/react/blob/3b551c82844bcfde51f0febb8e42c1a0d777df2c/packages/react-dom/src/server/ReactDOMFizzServerNode.js#L123-L158">renderToPipeableStream</a></td><td>renders a React tree to a pipeable <a href="https://nodejs.org/api/stream.html">Node.js Stream</a></td><td rowspan="2">用于常规 Node.js 运行时中的 Streaming SSR 场景</td></tr><tr><td>renderToNodeStream</td><td>renders a React tree to a <a href="https://nodejs.org/api/stream.html#readable-streams">Node.js Readable Stream</a>，已废弃，本质上是提供了一个 Readable Stream，而不是像 renderToPipableStream 那样基于依赖注入使用外部 stream 实例</td></tr><tr><td>renderToString</td><td>renders a React tree to an HTML string</td><td>用于常规 Node.js 运行时中的常规 String SSR 场景</td></tr></tbody></table>

### Streaming SSR VS SSR

<grid>
<column width-ratio="0.500000">

![图片展示了 Server Rendering 的时间线，涉及 Network 和 JavaScript 两部分。在 Network 部分，有黄色的 GET / 和红色的 GET / assets/ 请求；在 JavaScript 部分，有粉色的 render(app) 操作。图中标注了 FCP（First Contentful Paint，首次内容绘制）和 TTI（Time To Interactive，可交互时间）两个关键时间节点。该图与上下文相关，直观呈现了 Streaming SSR 相较于常规 SSR 在时间线上的优势，即用户能更快看到部分内容。](https://feishu.cn/file/XcVcbEOlrohq4jxpaPcc1uMxnyf)

</column>
<column width-ratio="0.500000">

![图片展示了 Streaming Server Rendering 的相关内容。画面中，上方有绿色文字 Streaming Server Rendering。下方分为 Network 和 JavaScript 两部分，Network 部分有黄色的 GET / 和红色的 GET /data，JavaScript 部分有粉色的 render (seg) 及多个粉色方块。图中还有 FCP 和 TTI 标识。该图与上下文相关，直观呈现了 Streaming SSR 在网络请求与 JavaScript 渲染等方面的流程，辅助说明其渐进式渲染的特点。](https://feishu.cn/file/KPLFbbhmeoh36zxST3pcUBcun2d)

</column>
</grid>

以上，Streaming SSR 相较于常规 SSR 的最大优势是不用等所有数据渲染完成即可分批开始返回数据给客户端，本质上是提供了一种**渐进式渲染方案**。在时间线上，用户只需要等待**更短的时间即可看到部分内容。**

### MVP - Streaming SSR

<readonly-block token="7360594784250265604" type="isv"></readonly-block>

<grid>
<column width-ratio="0.175610">

SSR 服务端伪代码

</column>
<column width-ratio="0.824390">

```TypeScript
import { renderToPipeableStream } from 'react-dom/server';
import App from './App';

// The route handler syntax depends on your backend framework
app.use('/', (request, response) => {
    const { pipe } = renderToPipeableStream(<App />, {
      bootstrapScripts: ['/main.js'],
      onShellReady() {
        response.statusCode = 200;
        response.setHeader('content-type', 'text/html');
        pipe(response);
      },
      onShellError(error) {
        response.statusCode = 500;
        response.setHeader('content-type', 'text/html');
        response.send('<h1>Something went wrong</h1>'); 
      },
      onError(error) {
        logServerCrashReport(error);
      }
    });
});
```

</column>
</grid>

<grid>
<column width-ratio="0.176829">

SSR 客户端代码

</column>
<column width-ratio="0.823171">

```TypeScript
import { hydrateRoot } from 'react-dom/client';
import App from './App';

hydrateRoot(document, <App />);
```

</column>
</grid>

如上是 React Streaming SSR 的 MVP，本质上核心在于通过 renderToPipeableStream API 搭建与浏览器通信的数据流。

<grid>
<column width-ratio="0.600000">

![图片展示的是 React Streaming SSR 的 MVP 中 renderToPipeableStream 函数的服务端伪代码。代码中定义了函数接收的参数，内部有对数据传输状态的判断和处理，如通过 hasStartedFlowing 变量判断是否已开始传输，若已开始则报错。还包含对传输过程中各种事件（如 drain、error、close）的监听及相应处理函数的调用，如 createDrainHandler、createErrorHandler、createCancelHandler 等，实现与浏览器通信的数据流搭建。](https://feishu.cn/file/XRmEbxqtJosqgGxvOl6cER0mnif)

</column>
<column width-ratio="0.400000">

1. 仅暴露 pipe 和 abort 方法，pipe 用于实时持续写入 chunk 数据，abort 用于放弃 stream 传输，并返回 fallback HTML 给前端。
2. 内部实现了 request 实例（内部自定义功能类），主要挂载 streaming 状态数据。同时基于 writable stream 各种事件监听，进行相应恢复/终止数据传输。

</column>
</grid>

### Streaming SSR in PIA

<grid>
<column width-ratio="0.600000">

![图片展示了 PIA Streaming SSR 核心实现逻辑的代码片段，位于 /packages/universal/src/server/node/stream.js 文件中。代码导入了 React 等模块，定义了 getServerRender 函数。函数内设置了预取相关逻辑，调用了 renderToPipeableStream API 建立流式数据传输通道，并通过 injectContentToStream 将 writeable stream 转换成可读可写流等。代码与上下文紧密相关，是对 PIA Streaming SSR 核心实现逻辑叙述的具体代码呈现，直观展示了相关逻辑的代码实现方式。](https://feishu.cn/file/Y6eSbPprDord1SxQOewcP7fZnLg)

</column>
<column width-ratio="0.400000">

以下摘录了 PIA Streaming SSR 的核心实现逻辑，可见主要是依赖底层 renderToPipeableStream API 去建立与浏览器的流式数据传输通道。

如前文所述，本质上此处使用的是 writable stream（此处一般是 Response 实例）。在 PIA 中基于 injectContentToStream 通过 Transfom stream 可将 writeable stream 转换成可读可写流，并写入了 PIA 框架特定的运行时代码，如 PIA prefetch 端外降级逻辑等框架逻辑。

</column>
</grid>

基于先前 <cite doc-id="FfIFdgg1Zo9BZqxUjiTckvu9nDV" file-type="docx" title="探索 PIA SSR" type="doc"></cite> 的分享，关键结论是 PIA 本质上是帮我们统一创建了 server 实例，且额外创建统一的 SSR 运行时通用胶水代码，开发者关注业务数据逻辑即可。结合前文叙述，getServerRender 在 SSR 运行时被调用，如下：

<grid>
<column width-ratio="0.517073">

<img name="image.png" alt="图片展示了一段代码，核心内容为 PIA SSR 相关的 getServerEntry 函数。代码中用红色箭头指向了关键部分，一处是“pia 配置文件中声明的 ssr 请求文件地址”，另一处是“PIA SSR 接入成本低的入水点代码被指定到根目录，并将该地址在编译配置的 entry 中声明”。这段代码与上文提到的 PIA Streaming SSR 核心实现逻辑相关，体现了在 SSR 运行时 getServerRender 被调用时的部分代码逻辑，展示了 PIA 在创建 server 实例及相关代码配置方面的情况。" mime="image/png" scale="1.000000" src="Y2vEbIlNsoyHbXxJPOLcwdrrndb"/>

</column>
<column width-ratio="0.482927">

<whiteboard token="WuTWwkTlKhsWh7benLjcXUs6nse"></whiteboard>

</column>
</grid>
