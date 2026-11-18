# Lab 2 验收操作

本版本使用老师 starter 的三个页面，不使用自定义单页应用。

1. 手机和电脑都打开 GitHub Pages，优先使用 HTTPS。
2. 插入耳机，先把系统音量调低。
3. 在每个页面按 **Turn On DSP**；iPhone 再按 **Request Permission** 并允许运动传感器。
4. 使用导航栏依次打开三个 interaction 页面。

| 页面 | 动作 | 声音 |
| --- | --- | --- |
| `index.html` | 握稳手机，短促地来回摇动 | 英式教堂钟声；由 `deviceShaken()` 触发一次 gate |
| `sound2.html` | 将 movement threshold 调到合适值，做一次明显的大动作 | 雷声；小动作应低于阈值 |
| `sound3.html` | 让手机平放在手中，左右滚转 | 黄铜乐器；滚转角连续控制 blower pressure |

电脑上可用鼠标触发 `mousePressed()` 做声音排查，但这不能证明手机传感器工作。验收时要说明：

- 前端文件来自老师 starter：`index.html`、`sound2.html`、`sound3.html`、`sketch.js`、`helpers.js`、`styles.css`、`dsp.js`；
- 我们只在 `interaction-1.js`、`interaction-2.js`、`interaction-3.js` 中完成映射；
- 声音是 Faust 示例通过 WASM 合成，不是录音；
- 三个动作与声音的设计动机分别是手铃、暴风雨的强动作和气流/吹奏压力。

手机无声时检查浏览器音量、耳机连接、iPhone 静音模式和传感器权限；不要把 USB 连接误认为能把手机传感器转发给电脑网页。
