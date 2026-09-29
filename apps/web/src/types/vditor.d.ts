/* eslint-disable @typescript-eslint/triple-slash-reference */
/**
 * vditor/dist/index.d.ts 内部用的是 `/// <reference types="./types" />`，
 * 而 `types=` 只接受包名，导致 dist/types/index.d.ts 里声明的
 * IOptions / IMenuItem / IMath 等全局类型实际没有被加载。
 * 这里用 path 引用显式引入，保证编辑器配置拥有准确类型。
 */
/// <reference path="../../node_modules/vditor/dist/types/index.d.ts" />
