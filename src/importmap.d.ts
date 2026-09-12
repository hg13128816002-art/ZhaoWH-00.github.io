// three 与 three/addons/* 是通过 index.astro 里那段
// <script type="importmap"> 从 unpkg 加载的运行时依赖，没有写进 package.json，
// 所以 node_modules 里根本没有 three —— 编辑器和 tsc 解析不到这两个裸模块名，
// 会在 import('three') 那几行报「Cannot find module 'three' or its corresponding
// type declarations」（TS2307）。这里补一份环境模块声明兜底：
// 类型上当作 any，但不再报「找不到模块」。
//
// 注意：本文件里不能出现 import / export。一旦变成模块文件，下面的 declare module
// 会被当成「模块增强」，反而会因为找不到原模块而报 TS2664。

declare module 'three';
declare module 'three/addons/*';
