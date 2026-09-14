/**
 * 首页「01 / CREATIVE CHRONOLOGY」时间轴的节点数据。
 *
 * 轴是横向的：节点按数组顺序排列，首页几何模块负责不等距间隔与折线转折。
 * 内容数据不包含页面坐标，增删节点时会自动重新排布。
 */
import { covers } from './covers';

export interface TimelineMedia {
  src: string;
  alt: string;
}

export interface TimelineNode {
  /** 左侧时间与类型标签，如 `2026.01 / WORK` */
  meta: string;
  title: string;
  note: string;
  href: string;
  /** 1 张时单独展示，2 张时并排展示 */
  media?: TimelineMedia[];
}

export const timelineNodes: TimelineNode[] = [
  {
    meta: '2007.01.06 / LIFE',
    title: '出生',
    note: '故事从这里开始。',
    href: '/profile',
  },
  {
    meta: '2020.03 / LIFE',
    title: '萌生艺术与设计的想法',
    note: '第一次认真把未来和创作联系在一起。',
    href: '/dual',
    media: [{ src: covers.firstDigitalPainting, alt: '我的第一幅电子绘画作品' }],
  },
  {
    meta: '2021.08 / LIFE',
    title: '正式走上艺术道路',
    note: '与家人协商之后，选择把艺术作为真正要走的方向。',
    href: '/profile',
  },
  {
    meta: '2022-2025 / LIFE + WORKS',
    title: '深圳市盐田高级中学美术班',
    note: '初步接触设计，并完成一些早期视觉作品。',
    href: '/dual',
    media: [
      { src: covers.posterWasteland, alt: '人生是旷野，不是轨道公益海报' },
      { src: covers.posterSolitude, alt: '群体性孤独公益海报' },
    ],
  },
  {
    meta: '2025.09 / LIFE',
    title: '进入北京师范大学珠海校区',
    note: '开始艺术设计学专业的学习。',
    href: '/profile',
  },
  {
    meta: '2025.11 / WORK',
    title: '纪录片《缘》',
    note: '影像练习与叙事氛围的阶段性尝试。',
    href: '/omni#yuan',
    media: [{ src: covers.yuan, alt: '缘短片封面' }],
  },
  {
    meta: '2025.12 / WORK',
    title: '《starE》/《任尔 EWSN 风？》',
    note: '围绕网络舆论场与磁场隐喻展开的装置艺术。',
    href: '/project-detail#stare-ewsn',
    media: [{ src: covers.starE, alt: 'starE 装置作品' }],
  },
  {
    meta: '2026.01 / WORK',
    title: '《Liminal-临近边缘的幻想》',
    note: '关于算法、虚构与真实边界的实验短片。',
    href: '/project-detail#liminal',
    media: [{ src: covers.liminal, alt: 'Liminal 短片封面' }],
  },
  {
    meta: '2026.01 / WORK',
    title: 'VR 游戏《Never Extinguished》',
    note: '以东北下岗潮为背景的 VR 严肃游戏原型。',
    href: '/project-detail#never-extinguished',
    media: [{ src: covers.neverExtinguished, alt: 'Never Extinguished 宣传海报' }],
  },
  {
    meta: '2026.04 / WORK',
    title: 'AR 游戏 Demo《画意那洲·文化寻根》',
    note: '把景区导览转化为带有探索循环的 AR 体验。',
    href: '/project-detail#nazhou-ar',
    media: [{ src: covers.nazhou, alt: '画意那洲 AR 导览 Demo 封面' }],
  },
  {
    meta: '2026.06 / WORK',
    title: '交互网页《施洞苗绣纹样生成器》',
    note: '以非遗纹样为素材的数字共创与交互生成实验。',
    href: '/project-detail#miao-generator',
    media: [{ src: covers.miao, alt: '施洞苗绣纹样生成器界面' }],
  },
  {
    meta: '2026.06 / WORK',
    title: '建筑设计《Shadow Shell》',
    note: '围绕光影、遮蔽与临时结构展开的建筑模型实验。',
    href: '/project-detail#shadow-shell',
    media: [{ src: covers.shadowShell, alt: 'Shadow Shell 建筑模型' }],
  },
];
