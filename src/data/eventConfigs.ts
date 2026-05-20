export const MISFORTUNE_EVENTS = [
  '指定本场直播发的弹幕结尾必须带有指定字',
  '直播间分享到班级、家族或好友群，并宣告：我是无双的狗',
  '小黑屋体验3分钟',
  '给VX/QQ最上面的异性发送：“520快乐”',
  '给无双写一封100字极其肉麻的情书供大家欣赏',
  '给大家献歌一首',
];

export const ADVENTURE_EVENTS = [
  '给无双发送一段文本，录制指定音声',
  '给观众画一幅抽象头像画',
  '主播用新闻播报/雌小鬼口吻复盘刚才的骰子',
  '主播即兴唱 20 秒指定关键词小曲',
  '主播接下来 5 分钟维持指定人设',
  '接下来10分钟主播随机切换声线',
];

export const TRUTH_EVENTS = [
  '分享自己的暗恋经历',
  '你最后一次撒谎是什么时候？为什么要撒谎？',
  '你最尴尬的一次经历是什么',
  '你曾经被别人误解过吗？说一下详情',
  '你对异性的体型要求是多少？',
  '你最喜欢的一位二次元异性角色是？什么魅力吸引了你',
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
  { name: '活动海报', icon: '海', rarity: '实体周边' },
  { name: '夏秋双面折扇', icon: '扇', rarity: '实体周边' },
  { name: '春冬双面抱枕', icon: '枕', rarity: '实体周边' },
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
  ...FIGURE_OPTIONS.map((figure) => `周边抽取：${figure.name}`),
];

export function generateChaosWheel(): string[] {
  return getRandomEvents(ALL_EVENTS, 8);
}
