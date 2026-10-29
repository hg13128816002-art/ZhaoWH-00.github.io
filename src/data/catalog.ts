import { works } from './works';
import { covers } from './covers';
import { redact } from './classified';

export const collections = [
  { id: 'interactive', label: '交互与游戏' },
  { id: 'spatial', label: '装置与空间' },
  { id: 'film', label: '影像' },
  { id: 'visual', label: '视觉作品' },
] as const;
export type Collection = typeof collections[number]['id'];

const entries: {id: string; source: number; collection: Collection; summary: string; action?: string; actionHref?: string}[] = [
  {id:'synesthesia-canvas', source:4, collection:'interactive', summary:'在画布上画出颜色与形状，听见它们变成音乐。', action:'打开互动作品', actionHref:'https://synesthesia.zhaowenhao.design'},
  {id:'never-extinguished', source:1, collection:'interactive', summary:'走进一间 90 年代的东北车间，通过修复性的工作，让记忆中的空间重新亮起。', action:'观看游戏演示', actionHref:'/omni#never-extinguished'},
  {id:'stare-ewsn', source:0, collection:'spatial', summary:'当磁场成为舆论场：一组关于吸引、立场与群体关系的艺术装置。', action:'观看装置影像', actionHref:'/omni#stare-ewsn'},
  {id:'liminal', source:5, collection:'film', summary:'当算法不断制造虚构，我们如何辨认真实？一场关于边界的影像实验。', action:'观看短片', actionHref:'/omni#liminal'},
  {id:'miao-generator', source:3, collection:'interactive', summary:'组合苗绣图腾、构图与色彩，创作属于自己的数字纹样。', action:'打开互动作品', actionHref:'https://miao.zhaowenhao.design/'},
  {id:'nazhou-ar', source:2, collection:'interactive', summary:'跟随 AR 线索探索那洲村，在寻找文化碎片的过程中认识一个地方。', action:'观看体验演示', actionHref:'/omni#nazhou-ar'},
  {id:'synthetic-silence', source:7, collection:'visual', summary:'雨后的砖块与白色几何体，一次关于日常空间中异物感的观察。', action:'查看原图', actionHref:'/dual#synthetic-silence'},
  {id:'yuan', source:6, collection:'film', summary:'从片段、节奏与情绪出发，探索影像的叙事氛围。', action:'观看短片', actionHref:'/omni#yuan'},
  {id:'land-temple', source:10, collection:'spatial', summary:'一次小尺度的空间更新，记录场地、材料与地方信仰之间的关系。', action:'观看改造记录', actionHref:'/omni#land-temple'},
  {id:'self-portrait', source:8, collection:'visual', summary:'以自己的形象为观察对象，保留凝视与自我拆解的痕迹。', action:'查看原图', actionHref:'/dual#self-portrait'},
  {id:'landscape', source:9, collection:'visual', summary:'在现场观察中，记录自然的结构、色块与空间关系。', action:'查看原图', actionHref:'/dual#landscape'},
];
export const catalog = [
  {id:'flesh-factory', classified:false, title:'血肉工厂 / Flesh Factory', titleEn:'Flesh Factory', collection:'film' as Collection,
    collectionLabel:'影像', era:'AI 影像 / 2026', kind:'video' as const,
    description:'由骨肉组成的机器在流水线上工作，制造出一条最终替代自身的机械流水线。',
    summary:'一条血肉流水线制造出机械流水线，并最终被自己的产物替代。',
    image:covers.fleshFactory, imageAlt:'血肉工厂：血肉机器组成的工业流水线', href:'/works/flesh-factory/',
    action:undefined, actionHref:undefined,
  },
  // Follow the committed works list; homepage selections have their own order below.
  ...entries.slice().sort((a, b) => a.source - b.source).map(({source, ...entry}) => ({
    ...works[source], ...entry,
    ...(works[source].classified ? {summary:redact(entry.summary), action:undefined, actionHref:undefined} : {}),
    href:`/works/${entry.id}/`,
    collectionLabel:collections.find(c => c.id === entry.collection)!.label,
  })),
  {id:'shadow-shell', classified:false, title:'Shadow Shell', titleEn:'', collection:'spatial' as Collection,
    collectionLabel:'装置与空间', era:'建筑模型 / 2026', kind:'image' as const,
    description:'围绕光影、遮蔽与临时结构展开的建筑模型实验。',
    summary:'用结构捕捉光影，探索一个临时空间如何形成庇护。',
    image:covers.shadowShell, imageAlt:'Shadow Shell 建筑模型', href:'/works/shadow-shell/',
    action:undefined, actionHref:undefined,
  },
];
export type CatalogWork = typeof catalog[number];
const mainWorkIds = ['liminal', 'stare-ewsn', 'flesh-factory', 'never-extinguished', 'nazhou-ar', 'miao-generator', 'synesthesia-canvas', 'shadow-shell'];
export const mainWorks = mainWorkIds.map(id => catalog.find(work => work.id === id)!);
export const otherWorks = catalog.filter(work => !mainWorkIds.includes(work.id));
export const featuredWorks = ['stare-ewsn', 'liminal', 'synesthesia-canvas', 'never-extinguished']
  .map(id => catalog.find(work => work.id === id)!);
export const detailedIds = ['flesh-factory','never-extinguished','liminal','stare-ewsn','nazhou-ar','miao-generator','shadow-shell','synesthesia-canvas'];
