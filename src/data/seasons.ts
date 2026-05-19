export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonInfo {
  index: number;
  season: Season;
  name: string;
  emoji: string;
  cardImage: string;
  wallpaperImage: string;
  cardLabel: string;
  wallpaperLabel: string;
}

export const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_INFO: Record<Season, SeasonInfo> = {
  spring: {
    index: 0,
    season: 'spring',
    name: '春季',
    emoji: '🌸',
    cardImage: '/春-积分卡.png',
    wallpaperImage: '/春-壁纸.png',
    cardLabel: '春季积分卡',
    wallpaperLabel: '春季壁纸',
  },
  summer: {
    index: 1,
    season: 'summer',
    name: '夏季',
    emoji: '☀️',
    cardImage: '/夏-积分卡.png',
    wallpaperImage: '/夏-壁纸.png',
    cardLabel: '夏季积分卡',
    wallpaperLabel: '夏季壁纸',
  },
  autumn: {
    index: 2,
    season: 'autumn',
    name: '秋季',
    emoji: '🍁',
    cardImage: '/秋-积分卡.png',
    wallpaperImage: '/秋-壁纸.png',
    cardLabel: '秋季积分卡',
    wallpaperLabel: '秋季壁纸',
  },
  winter: {
    index: 3,
    season: 'winter',
    name: '冬季',
    emoji: '❄️',
    cardImage: '/冬-积分卡.png',
    wallpaperImage: '/冬-壁纸.png',
    cardLabel: '冬季积分卡',
    wallpaperLabel: '冬季壁纸',
  },
};

export const SEASON_LIST = SEASON_ORDER.map((season) => SEASON_INFO[season]);
export const COMPUTER_WALLPAPER_IMAGE = '/电脑壁纸.png';
export const DYNAMIC_WALLPAPER_VIDEO = '/动态壁纸.mp4';

export function getSeasonByIndex(index: number): SeasonInfo {
  if (!Number.isFinite(index)) {
    return SEASON_INFO[SEASON_ORDER[0]];
  }

  const normalizedIndex = ((Math.trunc(index) % SEASON_ORDER.length) + SEASON_ORDER.length) % SEASON_ORDER.length;
  return SEASON_INFO[SEASON_ORDER[normalizedIndex]];
}

export function getSeasonInfo(season: Season): SeasonInfo {
  return SEASON_INFO[season];
}
