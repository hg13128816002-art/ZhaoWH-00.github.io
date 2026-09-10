/**
 * 跨页面共用的封面 / 媒体地址。
 *
 * 同一张封面往往同时出现在首页时间轴、首页 Works 叠层和项目详情页，
 * 集中在这里之后换图只需要改一行。
 */
import { asset } from './assets';

/** 各作品的主视觉（封面） */
export const covers = {
  synesthesia: '/synesthesia-canvas-cover.svg',
  synesthesiaReal: '/synesthesia-canvas-real.png',
  neverExtinguished: asset('images/VR严肃游戏《未曾熄灭的》宣传海报 拷贝.webp'),
  liminal: asset('posters/Liminal封面.png'),
  nazhou: asset('posters/那洲村AR导览DEMO演示视频封面.png'),
  miao: asset('images/施洞苗绣1.webp'),
  starE: asset('images/艺术装置《starE》- P7.webp'),
  yuan: asset('posters/缘封面.png'),
  shadowShell: asset('images/Shadow Shell 1.webp'),
  landTemple: asset('posters/土地庙改造封面.png'),
  syntheticSilence: asset('images/《合成的沉默》 (Synthetic Silence).webp'),
  selfPortrait: asset('images/赵文浩自画像.webp'),
  landscape: asset('images/风景写生.webp'),
  firstDigitalPainting: asset('images/我的第一幅电子绘画作品.webp'),
  posterWasteland: asset('images/《人生是旷野，不是轨道》工艺海报.webp'),
  posterSolitude: asset('images/《群体性孤独》公益海报.webp'),
} as const;

/** 首页 Works 里点播用的视频源 */
export const reelVideos = {
  liminal: asset('videos/Liminal-临近边缘的幻想.mp4'),
  yuan: asset('videos/缘.mp4'),
  landTemple: asset('videos/清迈良园土地庙微改造.mp4'),
} as const;
