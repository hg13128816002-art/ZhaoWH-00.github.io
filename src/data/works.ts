/**
 * 首页「02 / WORKS」作品叠层的全部数据。
 *
 * 顺序即叠层顺序（第一张为默认激活项）；分类按钮与滚动进度的计算
 * 都基于这个数组，所以新增作品只要在数组里补一项即可。
 */
import { covers, reelVideos } from './covers';

export type WorkCategoryId = 'digital' | 'film' | 'photo' | 'other';

export interface WorkCategory {
  id: WorkCategoryId;
  index: string;
  label: string;
}

export interface WorkItem {
  category: WorkCategoryId;
  kind: 'image' | 'video';
  /** 卡片左上角的分类与年份，如 `VR 严肃游戏 / 2026` */
  era: string;
  title: string;
  /** 有英文名时标题会渲染成中英双行样式 */
  titleEn?: string;
  description: string;
  image: string;
  imageAlt: string;
  /** 首屏可见的那张用 eager，其余保持 lazy */
  eager?: boolean;
  /** kind 为 video 时的点播源 */
  video?: string;
  /** 视频卡片的按钮无障碍标签 */
  playLabel?: string;
  href: string;
  linkText: string;
  external?: boolean;
  linkLabel?: string;
}

export const workCategories: WorkCategory[] = [
  { id: 'digital', index: '1', label: '数字艺术' },
  { id: 'film', index: '2', label: '短片' },
  { id: 'photo', index: '3', label: '摄影作品' },
  { id: 'other', index: '4', label: '其他' },
];

export const works: WorkItem[] = [
  {
    category: 'digital',
    kind: 'image',
    era: '装置艺术 / 2025',
    title: 'starE / 任尔 EWSN 风？',
    description: '以磁场隐喻网络舆论场，把抽象的公共讨论结构转化为可被观看和感知的实体装置。',
    image: covers.starE,
    imageAlt: 'starE 装置作品',
    eager: true,
    href: '/project-detail#stare-ewsn',
    linkText: '查看项目',
  },
  {
    category: 'digital',
    kind: 'image',
    era: 'VR 严肃游戏 / 2026',
    title: '未曾熄灭的',
    description:
      '以 90 年代末东北车间为沉浸式场景，把历史创伤、怀旧疗法和自然交互整合进一套可体验的游戏叙事。',
    image: covers.neverExtinguished,
    imageAlt: '未曾熄灭的作品海报',
    href: '/project-detail#never-extinguished',
    linkText: '查看项目',
  },
  {
    category: 'digital',
    kind: 'image',
    era: 'AR 导览游戏 / 2026',
    title: '画意那洲·文化寻根',
    description: '把景区导览转译为收集碎片的探索循环，让游客在移动和寻找中进入地方文化叙事。',
    image: covers.nazhou,
    imageAlt: '那洲村 AR 导览游戏 Demo',
    href: '/project-detail#nazhou-ar',
    linkText: '查看项目',
  },
  {
    category: 'digital',
    kind: 'image',
    era: '交互网页 / 2026',
    title: '施洞苗绣纹样生成器',
    description:
      '围绕施洞苗绣传统图腾展开的数字共创网页，用户可以组合纹样、调节构图与色板，并获得 AI 纹样评审反馈。',
    image: covers.miao,
    imageAlt: '施洞苗绣纹样生成器界面',
    href: '/project-detail#miao-generator',
    linkText: '查看项目',
  },
  {
    category: 'digital',
    kind: 'image',
    era: '互动音乐网页 / 2026',
    title: '通感画布',
    titleEn: 'Synesthesia Canvas',
    description:
      '把颜色、形状与位置实时翻译成音乐的浏览器乐器：在无限画布上绘制声音，编排节奏，并分享或导出自己的作品。',
    image: covers.synesthesia,
    imageAlt: '通感画布互动音乐创作界面预览',
    href: 'https://synesthesia.zhaowenhao.design',
    linkText: '打开互动页面 ↗',
    external: true,
    linkLabel: '打开通感画布互动页面（新窗口）',
  },
  {
    category: 'film',
    kind: 'video',
    era: '实验短片 / 2026',
    title: 'Liminal 临近边缘的幻想',
    description: '围绕算法、虚构和真实边界展开的影像实验，讨论当代视觉经验中不断增殖的“非真实”。',
    image: covers.liminal,
    imageAlt: 'Liminal 短片封面',
    video: reelVideos.liminal,
    playLabel: '播放 Liminal',
    href: '/project-detail#liminal',
    linkText: '查看项目',
  },
  {
    category: 'film',
    kind: 'video',
    era: '影像练习',
    title: '缘',
    description: '从片段、节奏和情绪出发的短片作品，作为影像语言与叙事氛围的阶段性练习。',
    image: covers.yuan,
    imageAlt: '缘 短片封面',
    video: reelVideos.yuan,
    playLabel: '播放缘',
    href: '/omni#yuan',
    linkText: '进入视频页',
  },
  {
    category: 'photo',
    kind: 'image',
    era: '摄影作品',
    title: '合成的沉默',
    titleEn: 'Synthetic Silence',
    description:
      '白色的三角几何体富有着一种无机质的情绪，在雨后湿润的、充满生活痕迹的砖块上，它们显得格格不入又极其安静。',
    image: covers.syntheticSilence,
    imageAlt: '《合成的沉默》摄影作品',
    href: '/dual',
    linkText: '进入图片页',
  },
  {
    category: 'other',
    kind: 'image',
    era: '图像档案',
    title: '自画像',
    description: '以个人形象作为观察对象，尝试在静态图像中保留一种冷静、凝视和自我拆解的气质。',
    image: covers.selfPortrait,
    imageAlt: '自画像',
    href: '/dual',
    linkText: '进入图片页',
  },
  {
    category: 'other',
    kind: 'image',
    era: '图像档案',
    title: '风景写生',
    description: '从自然景观和现场观察中提取结构、色块与空间关系，为后续视觉系统积累素材。',
    image: covers.landscape,
    imageAlt: '风景写生',
    href: '/dual',
    linkText: '进入图片页',
  },
  {
    category: 'other',
    kind: 'video',
    era: '空间改造记录',
    title: '清迈良园土地庙微改造',
    description: '围绕小尺度公共空间的更新实践，记录场地、材料和地方信仰之间的关系。',
    image: covers.landTemple,
    imageAlt: '清迈良园土地庙微改造封面',
    video: reelVideos.landTemple,
    playLabel: '播放清迈良园土地庙微改造',
    href: '/omni#land-temple',
    linkText: '进入视频页',
  },
];
