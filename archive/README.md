# archive/

未部署到线上的原始素材。

放在这里的文件**不会**进入 `dist/`，也不被任何正式页面引用。

## showcase-bg.mp4（15 MB）

原本位于 `public/showcase-bg.mp4`，只被归档的交互原型
`src/components/interaction-lab/LiquidSurfaceNavHub.astro` 使用。

`public/` 下的所有内容都会在每次 `npm run build` 时被原样复制进 `dist/`，
也就是说这个 15 MB 的视频此前每构建一次就白白多占 15 MB 部署体积
（当时 `dist/` 共 17 MB，它一个人占了 88%）。

现在正式站点已不再需要它，所以移到这里保存；如果以后要重新启用那个原型，
把它复制回 `public/` 即可：

```sh
cp archive/showcase-bg.mp4 public/showcase-bg.mp4
```
