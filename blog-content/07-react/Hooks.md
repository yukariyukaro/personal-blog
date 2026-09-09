参考视频：https://www.bilibili.com/video/BV1s6oNYgEin/?spm_id_from=333.1391.0.0&vd_source=7d9c555f22ae63576d8b3953e2062ec3
[hooks介绍](https://juejin.cn/post/7492238013192454170)
[hooks使用规则与原理](https://juejin.cn/post/7020811068955951135)
## 背景知识：1.函数组件

- 函数组件是一个JavaScript函数，它的特殊之处在于：返回值是一段JSX（描述界面结构）
- 可以简单理解为：函数组件 = 输入数据 → 输出界面
## 2.命令式UI和声明式UI

- 命令式UI：关注的是“如何”实现某个功能，开发者命令式（手动）去获取元素、修改元素（操作DOM） 
- 命令式UI：
```js
let count = 0;
document.getElementById('btn').addEventListener('click', () => {
  count++;
  document.getElementById('display').innerText = count;
});
```
- 声明式UI：开发者描述UI最终状态，框架自动渲染对应的界面
```js
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```
react当中，基本不需要你自己手动获取元素操作DOM，因为react内部已经帮你封装好了，你只需要关注业务逻辑即可
### 3. How？
jsx->vdom->dom
所以，重新执行函数组件修改jsx，react会根据jsx的变化，自动更新dom
## 一、hooks是什么

`Hook` 是 React 16.8 的新增特性。它可以让你在不编写 `class` 的情况下使用 `state` 以及其他的 `React` 特性（hook的出现代表着react全面拥抱函数式编程）
至于为什么引入`hook`，官方给出的动机是解决长时间使用和维护`react`过程中常遇到的问题，例如：

- 难以重用和共享组件中的与状态相关的逻辑
- 逻辑复杂的组件难以开发与维护，当我们的组件需要处理多个互不相关的 local state 时，每个生命周期函数中可能会包含着各种互不相关的逻辑在里面
- 类组件中的this增加学习成本，类组件在基于现有工具的优化上存在些许问题
- 由于业务变动，函数组件不得不改为类组件等等

在以前，函数组件也被称为无状态的组件，只负责渲染的一些工作

因此，现在的函数组件也可以是有状态的组件，内部也可以维护自身的状态以及做一些逻辑方面的处理


## 二、有哪些

上面讲到，`Hooks`让我们的函数组件拥有了类组件的特性，例如组件内的状态、生命周期

最常见的`hooks`有如下：useState、useEffect、useContext、useReducer、useCallback、useMemo、useRef、useLayoutEffect...


### useState
## 首先：什么是状态？
- 状态（state）：组件内部维护的数据，用于描述组件的当前状态。
- 前面说到，函数组件一开始是没有状态的：因为函数内部定义的变量在函数销毁后会被重置。
- 而类组件维护类的属性，不会被重置。
### 所以，useState做了什么？
- React 在组件的 Fiber 数据结构里为每个 Hook 维护一个“状态存储单元”。
- 当你调用 useState(initialValue) 时，React 会在内部记录这个状态，并返回 [state, setState]。
- 当你调用 setState(newValue) 时，React 会：
1. 更新内部存储的值
2. 触发组件重新渲染
3. 在重新渲染时，把最新的值传给 state
给出一个例子，如下：

```js
import React, { useState } from 'react';

function Example() {
  // 声明一个叫 "count" 的 state 变量
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p >
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

在函数组件中通过`useState`实现函数内部维护`state`，参数为`state`默认的值，返回值是一个数组，第一个值为当前的`state`，第二个值为更新`state`的函数

该函数组件等价于的类组件如下：

```js
class Example extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      count: 0
    };
  }

  render() {
    return (
      <div>
        <p>You clicked {this.state.count} times</p >
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>
          Click me
        </button>
      </div>
    );
  }
}
```

从上述两种代码分析，可以看出两者区别：
- state声明方式：在函数组件中通过 useState 直接获取，类组件通过constructor 构造函数中设置
- state读取方式：在函数组件中直接使用变量，类组件通过`this.state.count`的方式获取
- state更新方式：在函数组件中通过 setCount 更新，类组件通过this.setState()
总的来讲，useState 使用起来更为简洁，减少了`this`指向不明确的情况
#### 与useState类似但有区别：useReducer、useRef


### useEffect
#### 1.什么是副作用？
- 纯函数：函数的返回结果只依赖于其参数，并且在执行过程中不会产生任何 observable side effect（例如修改全局变量、网络请求、DOM 操作等）。
- 非纯函数：与纯函数相反，非纯函数的返回结果可能会依赖于外部状态或环境，或者在执行过程中会产生 observable side effect。
副作用（Side Effect）：指的是在函数执行过程中，除了返回值以外，还对外部环境产生了影响。这些影响可能包括修改全局变量、修改参数、触发事件、访问或修改 DOM 等。
##### 2.useEffect的作用？
简单来讲，useEffect模拟了类组件的生命周期方法。
| 类组件生命周期方法 | 函数组件（useEffect）实现 | 说明 |
|----------------|---------------------|-----|
| `componentDidMount` | `useEffect(() => { ... }, [])` | 依赖数组为空，只在挂载时执行 |
| `componentDidUpdate` | `useEffect(() => { ... }, [dep1, dep2])` | 依赖项变化时执行 |
| `componentWillUnmount` | `useEffect(() => { return () => { ... } }, [])` | 返回的函数在卸载时执行 |
| `shouldComponentUpdate` | 通过`React.memo`或条件渲染实现 | 用于优化组件渲染 |

`useEffect`可以让我们在函数组件中进行一些带有副作用的操作

同样给出一个计时器示例：

```js
class Example extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      count: 0
    };
  }

  componentDidMount() {
    document.title = `You clicked ${this.state.count} times`;
  }
  componentDidUpdate() {
    document.title = `You clicked ${this.state.count} times`;
  }

  render() {
    return (
      <div>
        <p>You clicked {this.state.count} times</p >
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>
          Click me
        </button>
      </div>
    );
  }
}
```
从上面可以看见，组件在加载和更新阶段都执行同样操作
而如果使用`useEffect`后，则能够将相同的逻辑抽离出来，这是类组件不具备的方法
对应的`useEffect`示例如下：

```jsx
import React, { useState, useEffect } from 'react';
function Example() {
  const [count, setCount] = useState(0);
 
  useEffect(() => {    document.title = `You clicked ${count} times`;  });
  return (
    <div>
      <p>You clicked {count} times</p >
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
```

`useEffect`第一个参数接受一个回调函数，默认情况下，`useEffect`会在第一次渲染和更新之后都会执行，相当于在`componentDidMount`和`componentDidUpdate`两个生命周期函数中执行回调

如果某些特定值在两次重渲染之间没有发生变化，你可以跳过对 effect 的调用，这时候只需要传入第二个参数，如下：

```js
useEffect(() => {
  document.title = `You clicked ${count} times`;
}, [count]); // 仅在 count 更改时更新
```

上述传入第二个参数后，如果 `count` 的值是 `5`，而且我们的组件重渲染的时候 `count` 还是等于 `5`，React 将对前一次渲染的 `[5]` 和后一次渲染的 `[5]` 进行比较，如果是相等则跳过`effects`执行

回调函数中可以返回一个清除函数，这是`effect`可选的清除机制，相当于类组件中`componentwillUnmount`生命周期函数，可做一些清除副作用的操作，如下：

```jsx
useEffect(() => {
    function handleStatusChange(status) {
        setIsOnline(status.isOnline);
    }

    ChatAPI.subscribeToFriendStatus(props.friend.id, handleStatusChange);
    return () => {
        ChatAPI.unsubscribeFromFriendStatus(props.friend.id, handleStatusChange);
    };
});
```

所以， `useEffect`相当于`componentDidMount`，`componentDidUpdate` 和 `componentWillUnmount` 这三个生命周期函数的组合



### 


## 三、解决什么

通过对上面的初步认识，可以看到`hooks`能够更容易解决状态相关的重用的问题：

- 每调用useHook一次都会生成一份独立的状态

- 通过自定义hook能够更好的封装我们的功能

编写`hooks`为函数式编程，每个功能都包裹在函数中，整体风格更清爽，更优雅

`hooks`的出现，使函数组件的功能得到了扩充，拥有了类组件相似的功能，在我们日常使用中，使用`hooks`能够解决大多数问题，并且还拥有代码复用机制，因此优先考虑`hooks`

## 四、hooks的规则
https://zh-hans.react.dev/reference/rules/rules-of-hooks?utm_source=copilot.com
### 为什么要遵循规则？
https://cloud.tencent.com/developer/article/1894850
## 参考文献

- https://zh-hans.reactjs.org/docs/hooks-state.html
- https://zh-hans.reactjs.org/docs/hooks-effect.html
- https://www.cnblogs.com/lalalagq/p/9898531.html
