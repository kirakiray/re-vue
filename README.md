# re-vue

把vue少部分重构一下，了解vue原理，只在浏览器端实现vue的demo功能。

## 当前完成的进度

完成基础的 obs 对象的模拟；

完成[官网](https://cn.vuejs.org/v2/guide/index.html)的6个基础功能介绍的，包括:

- [{{dataKey}} 文本节点的渲染](https://kirakiray.github.io/re-vue/demo/01_render.html)
- [v-bind](https://kirakiray.github.io/re-vue/demo/02_bind_title.html)
- [v-if](https://kirakiray.github.io/re-vue/demo/03if.html)
- [v-for](https://kirakiray.github.io/re-vue/demo/04for.html)
- [v-on 和 methods](https://kirakiray.github.io/re-vue/demo/05methods.html)
- [v-model](https://kirakiray.github.io/re-vue/demo/06model.html)

## 大概原理

通过使用 [Proxy API](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy) 和 [Object.defineProperty](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) 来监听对象的改动，动态的修正数据；

本来打算只用 `Object.defineProperty` 来实现所有监听的功能，但 `Proxy` 的性能更好，并且未来的 `Vue 3.0` 也将使用 `Proxy API`，所以这里重构也使用了这个api，也使代码更简洁了；
