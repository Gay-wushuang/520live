import type { GiftAuditLogEntry, Season } from '../stores/gameStore';
import type { MonopolyLogEntry } from '../types/monopoly';

const SEASON_COLOR_MARKS: Record<Season, { label: string; hex: string }> = {
  spring: { label: '春季粉', hex: '#F9A8D4' },
  summer: { label: '夏季金', hex: '#FBBF24' },
  autumn: { label: '秋季橙', hex: '#FB923C' },
  winter: { label: '冬季蓝', hex: '#93C5FD' },
};

const GIFT_LOG_TYPE_LABELS: Record<GiftAuditLogEntry['type'], string> = {
  card_spin: '积分卡抽奖',
  reward_unlocked: '奖励解锁',
  reward_claimed: '奖励领取',
  archive: '档案操作',
  reset: '重置',
};

const GIFT_REWARD_STATUS_LABELS: Record<NonNullable<GiftAuditLogEntry['rewardStatus']>, string> = {
  none: '未触发奖励',
  wallpaper: '配对奖励',
  ultimate: '终极大奖',
};

const MONOPOLY_LOG_TYPE_LABELS: Record<MonopolyLogEntry['type'], string> = {
  archive: '档案',
  player: '观众',
  dice: '骰子',
  move: '移动',
  event: '事件',
  effect: '效果',
  turn: '回合',
  reset: '重置',
};

const MONOPOLY_LOG_TYPE_ICONS: Record<MonopolyLogEntry['type'], string> = {
  archive: '[档]',
  player: '[人]',
  dice: '[骰]',
  move: '[移]',
  event: '[轮]',
  effect: '[效]',
  turn: '[回]',
  reset: '[重]',
};

function formatLogTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function makeTimestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '_',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

function csvEscape(value: string | number | undefined): string {
  const normalized = value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function toCsv(rows: Array<Array<string | number | undefined>>): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

function downloadCsv(filename: string, rows: Array<Array<string | number | undefined>>): void {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function buildCardAuditCsvRows(logs: GiftAuditLogEntry[]): Array<Array<string | number | undefined>> {
  return [
    ['时间', '日志类型', '玩家', '存档', '季节', '季节颜色', '季节色值', '积分卡', '奖励', '奖励状态', '进度', '备注'],
    ...logs.map((log) => {
      const colorMark = log.season ? SEASON_COLOR_MARKS[log.season] : undefined;

      return [
        formatLogTime(log.createdAt),
        GIFT_LOG_TYPE_LABELS[log.type],
        log.playerName,
        log.archiveName,
        log.seasonName,
        colorMark?.label,
        colorMark?.hex,
        log.cardLabel,
        log.rewardLabel,
        log.rewardStatus ? GIFT_REWARD_STATUS_LABELS[log.rewardStatus] : '',
        log.cardCount === undefined ? '' : `${log.cardCount}/2`,
        log.note,
      ];
    }),
  ];
}

export function buildMonopolyCsvRows(logs: MonopolyLogEntry[]): Array<Array<string | number | undefined>> {
  return [
    ['时间', '事件类型图标', '事件类型', '观众', '档案', '详情'],
    ...logs.map((log) => [
      formatLogTime(log.createdAt),
      MONOPOLY_LOG_TYPE_ICONS[log.type],
      MONOPOLY_LOG_TYPE_LABELS[log.type],
      log.playerName ?? '系统',
      log.archiveName,
      log.details,
    ]),
  ];
}

export function mergeLogsById<T extends { id: string; createdAt: string }>(...sources: T[][]): T[] {
  const logsById = new Map<string, T>();

  sources.flat().forEach((log) => {
    logsById.set(log.id, log);
  });

  return [...logsById.values()].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

export function exportAuditCsvFiles({
  cardLogs,
  monopolyLogs,
}: {
  cardLogs: GiftAuditLogEntry[];
  monopolyLogs: MonopolyLogEntry[];
}): void {
  const timestamp = makeTimestamp();

  downloadCsv(`Sheet1_积分卡抽奖明细_${timestamp}.csv`, buildCardAuditCsvRows(cardLogs));
  downloadCsv(`Sheet2_大富翁操作日志_${timestamp}.csv`, buildMonopolyCsvRows(monopolyLogs));
}
