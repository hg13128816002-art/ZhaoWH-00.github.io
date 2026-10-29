import { asset } from './assets';
import { covers, reelVideos } from './covers';

interface ProjectVideo { title: string; src: string; poster: string; }

export const projectVideos: Partial<Record<string, ProjectVideo[]>> = {
  'never-extinguished': [{
    title: '未曾熄灭的 · 游戏演示',
    src: asset('videos/VR严肃游戏《未曾熄灭的》PV.mp4'),
    poster: covers.neverExtinguished,
  }],
  'stare-ewsn': [
    { title: 'starE', src: asset('videos/starE.mp4'), poster: asset('posters/starE封面.png') },
    { title: '任尔 EWSN 风？', src: asset('videos/任尔EWSN风？.mp4'), poster: asset('posters/任尔EWSN风？封面.png') },
  ],
  'nazhou-ar': [{
    title: '画意那洲·文化寻根 · 体验演示',
    src: asset('videos/那洲村AR小游戏Demo演示.mp4'),
    poster: covers.nazhou,
  }],
  'shadow-shell': [{
    title: '影壳 / Shadow Shell · 作品影像',
    src: asset('videos/087cb193a217b693444d7e8c3a5074dc.mp4'),
    poster: covers.shadowShell,
  }],
  yuan: [{ title: '缘', src: reelVideos.yuan, poster: covers.yuan }],
  'land-temple': [{ title: '清迈良园土地庙微改造', src: reelVideos.landTemple, poster: covers.landTemple }],
};
