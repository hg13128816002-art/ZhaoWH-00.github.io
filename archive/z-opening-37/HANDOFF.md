# Opening 37 · 网站线程对接

## 本轮边界

用户已授权两个现有线程合作，最新基准以本包 Opening 37 为准。用户保留“动画具体怎么嵌入网页”的决定权。本轮仅准备原版快照、外置资源、检查页和对接说明，不修改网站路由、首页、导航或上线状态。

没有默认批准的自动播放、首次访问、缩短版、静音、跳过按钮、滚动锁定、移动端重排或片尾目标。检查页保留原预览的点击播放机制，仅用于检查。

## 源码中已经确认的情况

1. 绘制采用原生 SVG + JavaScript，自定义字形为 path / use；不依赖 GSAP、React 或 Remotion。
2. 画面由 `draw(t)` 按时间计算，Bézier 曲线、伪随机乱码和相机抖动均可重现。原始脚本是立即执行函数，尚未公开组件 API。
3. 当前播放用 `audio.currentTime` 作主时钟。即使静音也仍依赖音频播放，缺少独立的无声时钟；这不能等同于生产网页可直接自动播放的实现。
4. 原脚本处理页面隐藏与减少动态效果，但缺少可供网站调用的 `destroy`、资源释放和完整事件注销。减少动态效果当前会停在第 1080 帧姓名画面，而非自动结束网站开屏。
5. SVG 的 `zo-*` ID 与原片段根 ID 固定，多实例同时挂载前需要隔离；剪裁、mask 与 use 引用必须同步处理，不能只改容器 ID。
6. 原始几何基于 1280 × 534。完整姓名、Z 与标语另有内部 640 × 360 计算空间。不能用非等比 scale 改画幅。
7. `data-next-content` 是 SVG 内部容器，当前只放纯蓝矩形。它不能直接当作任意 HTML 首页容器使用。网页揭幕需要另外对齐 DOM 层级、遮罩和可见性。
8. 片尾遮罩行程目前按设计画板四角计算。若改为全屏盖住真实网页，必须按实际视口覆盖范围重新计算，避免宽屏或竖屏留下黑边、残片。

## 建议的接口边界（提案，未实现）

网站负责触发时机与页面状态；动画负责根据时间绘制、发送里程碑、释放自身资源。不要把网站访问策略写死在动画里。

```ts
type OpeningCue =
  | 'z-split'
  | 'lockup-invert'
  | 'name-cut'
  | 'outro-start'
  | 'outro-reveal-start'
  | 'outro-reveal-complete';

interface OpeningController {
  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  setMuted(muted: boolean): void;
  destroy(): void;
}

// mount 配置与最终导出名称待网站线程协商，不是现成可调用 API。
// onCue(cue, seconds) / onAudioEnded() / onError(error) 分开通知。
```

需要单独设计无声时钟、音频时钟切换、音频加载失败及减少动态效果下的退出行为。用户决定是否需要跳过后，再定义相应行为与回调，不可直接等同于销毁 DOM。

片尾节点：`outro-start` 19.333333 s；`outro-reveal-start` 19.833333 s；`outro-reveal-complete` 20.333333 s；音乐结束 24.624 s。网站 Canvas 应能与开场的可见状态协调，避免两个不可见场景同时持续绘制；揭幕期间是否逐渐启用网站动效由最终方案决定。

## 网站线程已确认的现状（2026-09-14 回传）

- 项目目录：`/Users/zhaowenhao/Work space/ZWH Website`。
- Astro **6.3.2** 静态输出，Tailwind CSS **4.3.0** / `@tailwindcss/vite`，原生 TypeScript，无 React。Node 要求 >=22.12.0，远端当前 26.8.1。
- 首页：`src/pages/index.astro`。公共布局：`src/layouts/Layout.astro`，含全局 CSS、字体加载、SiteHeader、PureTransition 和 head 插槽。
- `public/` 原样进入构建产物；已有 `fonts/`、`models/`、`scripts/`。`archive/` 不进入构建。
- 首屏 Canvas / 主要交互以 <=899px 为移动端；首页小导航 <=1100px，公共导航 <=760px；另有 900/901px、620px。适配动画不能假设网站已有统一的一个断点。
- 首屏原生 Canvas 2D / RAF / CSS / SVG，未发现 GSAP、Motion、Lottie、Remotion。首页下方 3D 使用 Three.js 0.165.0。
- `src/scripts/hero-universe.ts` 导出 `initHeroUniverse(canvas)`；30fps 上限、1x 画布、字形图集缓存；IntersectionObserver 观察 `.hero-stage` 控制离屏暂停，页面隐藏时暂停；移动端或减少动态效果时静态绘制。
- **Canvas 没有外部暂停/恢复接口。只用开屏遮罩盖住它，并不会令它停止绘制。** 后续需要网站线程实现或暴露生命周期控制，再与动画适配线程对接。
- 布局同步加载 `public/scripts/font-loader.js`，通过 `window.fontsReadyPromise` 等待本地 Noto Sans SC Regular/Bold/Black，2 秒后允许继续；完成时添加 `html.fonts-loaded` 并派发 `fontsloaded`。Canvas 在字体就绪后生成图集。
- 首页现有 **Preloader** 按 sessionStorage 每会话显示一次；公共 **PureTransition** 等字体后揭开，并处理跨页切片。它们与 Z 开场的关系需用户决定，不能默认叠加、替换或沿用其会话策略。

信息来源：网站线程「了解项目架构」直接回传。本地未读取远端完整源码；网页线程确认未因本次对接修改网站、未收到文件并独立验证资源。

## 响应式实施前的检查点

- 沙漏、Z 与细斜线维持几何比例和光学补偿。
- 开头特写保留固定机位与已有非对称构图意图；按镜头决定裁切位置。
- 拼贴逐镜头处理留白、大小与明度层级；不引入倒置文字。
- Z 与标语的对齐、完整姓名的可读性必须在手机上单独审看。
- 片尾遮罩覆盖实际视口，揭开真实目标与音乐结束分别处理。
- 最终需测真实移动设备、Safari、后台切换、音频拒绝、重复挂载和资源释放。当前 Windows Chromium 检查不能代替这些验证。

## 传输

本包采用相对路径，移动整个目录即可本地预览。原片段作为 `baseline/` 归档；正式接入时只取所需运行资源。

网站线程建议接收目录：`/Users/zhaowenhao/Work space/ZWH Website/archive/z-opening-37/`。该目录尚未创建，仅为接收建议。

两台主机间尚未验证可用的文件传输通道。请用户将交接压缩包转交网站线程；它收到后先解压至上述归档目录，并按 `SHA256SUMS.txt` 验证文件，再打开 `review.html` 复核，不做生产接入。可以用 `shasum -a 256 -c SHA256SUMS.txt` 在解压目录校验。

请勿将包放到公共 CDN 或公开仓库来绕过文件传输。
