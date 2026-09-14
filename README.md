# ZHAO WENHAO // PORTFOLIO

赵文浩的个人作品集站点。品牌蓝（`#ACDBFB`）+ 蓝调黑（`#040A10`）的"终端 / HUD"视觉基调，
以 Canvas 粒子、滚动驱动的编年时间轴和全屏作品叠层作为主要交互语言。

本次更新详情见 [更新说明](CHANGELOG.md)。

## 技术栈

| 项 | 说明 |
| --- | --- |
| 框架 | [Astro](https://astro.build) 6（`output: static`，纯静态输出） |
| 样式 | Tailwind CSS v4（经 `@tailwindcss/vite` 插件）+ 各页面手写 CSS |
| 3D | three.js 0.165，通过 `<script type="importmap">` 从 unpkg CDN 加载 |
| 字体 | 自托管 Noto Sans SC 子集（`public/fonts/`，共约 90 KB） |
| 远端素材 | 阿里云 OSS（`zhao-portfolio-assets.oss-cn-beijing.aliyuncs.com`） |

## 命令

```sh
npm install      # 安装依赖
npm run dev      # 本地开发，http://localhost:4321
npm run build    # 生产构建，输出到 ./dist/
npm run preview  # 预览构建结果
```

## 目录结构

```text
archive/                    未部署的原始素材（不会进入 dist/）
public/
├── fonts/                  自托管中文字体子集
├── models/                 lunar-lander.glb（首页 Profile 的 3D 模型）
├── scripts/font-loader.js  字体加载门控，暴露 window.fontsReadyPromise
└── …                       首页与 Profile 用的少量图片
src/
├── data/                   【数据层】作品与资源地址的唯一来源
│   ├── assets.ts           OSS 地址入口：asset('images/xxx.webp')
│   ├── covers.ts           跨页面共用的封面与视频源
│   ├── timeline.ts         首页「创作编年」的 12 个节点
│   └── works.ts            首页「WORKS」的 11 张作品卡与分类
├── layouts/Layout.astro    全站唯一外壳：document 骨架 + 导航 + 转场
├── components/
│   ├── SiteHeader.astro          顶部导航 + 明暗主题切换
│   ├── PureTransition.astro      Z 标志转场 + 站内链接拦截
│   ├── HeroOpening.astro         首页开场动画、音频授权与播放控制
│   ├── HomeSectionNav.astro       首页区块导航
│   ├── BackToTop.astro            返回首屏按钮
│   ├── InfiniteOmniGallery.astro /omni 视频档案（Canvas 无限画布）
│   ├── DualTrackGallery.astro    /dual 图片档案（双轨传送带 + 深度缩放）
│   └── interaction-lab/          未上线的交互原型存档
├── pages/
│   ├── index.astro               首页：粒子宇宙 + 时间轴 + Works + Profile
│   ├── project-detail.astro      7 个项目的详情档案
│   ├── omni.astro / dual.astro   视频档案 / 图片档案
│   ├── profile.astro / contact.astro
│   └── about.astro / hub.astro   旧路径重定向存根
└── styles/global.css       字体声明、主题变量、明暗主题覆盖、滚动条与边框
```

## 开发约定

- **新增或替换远端素材时，只改 `src/data/`。**
  不要在页面里手写百分号编码的 OSS 地址：对象名含中文、空格与全角括号，
  统一交给 `asset('images/施洞苗绣1.webp')` 生成，避免漏改或抄错。
- **页面只负责正文。** `<html>` / `<head>` / `<body>` 以及导航、跨页转场都由
  `src/layouts/Layout.astro` 提供；页面级的 `<head>` 内容（例如首页的 importmap）
  通过 `<slot name="head" />` 注入。
- `window.fontsReadyPromise` 是首屏脚本的统一等待点（由
  `public/scripts/font-loader.js` 提供，带 2 秒 fail-open 兜底）。
  新增首屏动画请复用它，不要各自监听 `document.fonts`。
- 移动端（时间线 `max-width: 900px`）会关闭首页的滚动驱动动画与 3D 模型，
  切换为静态降级布局；改动首页交互时注意 `isMobileHomeFallback()` 这条分支。
