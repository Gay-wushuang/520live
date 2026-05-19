export const MISFORTUNE_EVENTS = [
  '下一条弹幕必须押韵',
  '用五个字安利今天的直播间',
  '给主播写一句反派登场台词',
  '用三个关键词形容当前直播氛围',
  '给主播起一个中二但可爱的称号',
  '写一句可当直播间口号的弹幕',
];

export const ADVENTURE_EVENTS = [
  '主播用反派声线读一句弹幕',
  '主播为当前观众生成专属入场词',
  '主播用新闻播报口吻复盘刚才的骰子',
  '主播即兴唱 20 秒指定关键词小曲',
  '主播接下来 5 分钟维持指定人设',
  '主播给当前观众授予一个奇妙头衔',
];

export const TRUTH_EVENTS = [
  '你最喜欢的虚拟主播是？',
  '你最喜欢主播哪种直播状态？',
  '你希望直播间增加什么互动玩法？',
  '哪一个直播瞬间让你最有印象？',
  '你最想看主播挑战什么企划？',
  '给主播一句不超过 12 字的建议',
];

export const SPECIAL_EFFECTS = [
  '再 +1 骰子（下次掷骰）',
  '经过积分抽奖格自动抽奖',
  '直接前进 3 格',
  '再次掷骰子',
  '免疫下一次厄运',
  '选择移动方向',
];

export const FIGURE_OPTIONS = [
  { name: '维什戴尔 Q版3D模型', icon: 'W', rarity: 'SSR' },
  { name: '凯尔希 Q版3D模型', icon: 'K', rarity: 'SR' },
  { name: '阿米娅 Q版3D模型', icon: 'A', rarity: 'SR' },
] as const;

function getRandomEvents<T>(events: T[], count: number): T[] {
  const shuffled = [...events].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const ALL_EVENTS = [
  ...MISFORTUNE_EVENTS,
  ...ADVENTURE_EVENTS,
  ...TRUTH_EVENTS,
  ...SPECIAL_EFFECTS,
  ...FIGURE_OPTIONS.map((figure) => `手办抽取：${figure.name}`),
];

export function generateChaosWheel(): string[] {
  return getRandomEvents(ALL_EVENTS, 8);
}
