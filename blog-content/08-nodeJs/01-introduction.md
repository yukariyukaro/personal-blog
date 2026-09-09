## introduction
### 1. nodejs是什么？
- nodejs是一个基于javascript的运行环境，用于在服务器端运行javascript代码。
- nodejs不是Web框架，与springboot等Web框架不同。

### 2. 架构
![Nodejs架构图](https://picx.zhimg.com/v2-6b52c363de57fc7e48c113d1bbc562f1_r.jpg)
底层：
- v8引擎：chromium浏览器的javascript引擎，用于执行javascript代码。
- libuv：异步事件循环，用于处理异步事件。
- 其他
### 3.工作机制
我们通常说NodeJS是单线程的，在单线程的情况下NodeJs通过事件循环来处理异步事件。
总的来讲，NodeJS的事件循环与一般JS类似，但更加细致，参考：https://juejin.cn/post/7209698674905382973
