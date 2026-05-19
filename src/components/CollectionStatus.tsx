import { useEffect, useState } from 'react';
import { SEASON_LIST } from '../data/seasons';
import { useGameStore, type GiftAuditLogEntry } from '../stores/gameStore';

const GIFT_LOG_TYPE_LABEL: Record<GiftAuditLogEntry['type'], string> = {
  card_spin: '抽卡',
  reward_unlocked: '解锁',
  reward_claimed: '领取',
  archive: '档案',
  reset: '重置',
};

function formatLogTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function formatGiftLogsForCopy(logs: GiftAuditLogEntry[]): string {
  const header = ['时间', '类型', '玩家', '季节', '积分卡', '奖励', '备注'].join('\t');
  const rows = logs.map((log) =>
    [
      formatLogTime(log.createdAt),
      GIFT_LOG_TYPE_LABEL[log.type],
      log.playerName,
      log.seasonName ?? '',
      log.cardLabel ?? '',
      log.rewardLabel ?? '',
      log.note,
    ].join('\t')
  );

  return [header, ...rows].join('\n');
}

export default function CollectionStatus() {
  const {
    currentArchiveId,
    archiveSlots,
    createArchive,
    switchArchive,
    saveCurrentArchive,
    deleteArchive,
    userProfile,
    setNickname,
    cardCollection,
    wallpaperCollection,
    totalSpins,
    cardSpins,
    spinHistory,
    auditLogs,
  } = useGameStore();
  const [nickname, setNicknameDraft] = useState(userProfile.nickname);
  const [archiveMessage, setArchiveMessage] = useState('已自动读取本地存档');

  useEffect(() => {
    setNicknameDraft(userProfile.nickname);
  }, [userProfile.nickname]);

  const currentArchive = archiveSlots.find((archive) => archive.id === currentArchiveId);

  const handleSaveNickname = () => {
    setNickname(nickname);
    setArchiveMessage('已保存玩家名称');
  };

  const handleReadArchive = async () => {
    setArchiveMessage('读取中...');

    try {
      await useGameStore.persist.rehydrate();
      setArchiveMessage(`已读取所有本地存档 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`);
    } catch {
      setArchiveMessage('读取失败，请检查浏览器本地存储权限');
    }
  };

  const handleCreateArchive = () => {
    const nextIndex = archiveSlots.length + 1;
    createArchive(`存档 ${nextIndex}`);
    setArchiveMessage(`已新建并切换到存档 ${nextIndex}`);
  };

  const handleSwitchArchive = (archiveId: string) => {
    const archive = archiveSlots.find((item) => item.id === archiveId);
    const switched = switchArchive(archiveId);
    setArchiveMessage(switched ? `已切换到 ${archive?.name ?? '目标存档'}` : '切换失败，未找到目标存档');
  };

  const handleSaveCurrentArchive = () => {
    saveCurrentArchive();
    setArchiveMessage(`已保存 ${currentArchive?.name ?? '当前存档'}`);
  };

  const handleDeleteArchive = () => {
    const archiveName = currentArchive?.name ?? '当前存档';
    const deleted = deleteArchive(currentArchiveId);
    setArchiveMessage(deleted ? `已删除 ${archiveName}` : '至少需要保留一个存档');
  };

  const handleCopyGiftLogs = async () => {
    if (auditLogs.length === 0) {
      setArchiveMessage('暂无积分卡日志可复制');
      return;
    }

    try {
      await navigator.clipboard.writeText(formatGiftLogsForCopy(auditLogs));
      setArchiveMessage(`已复制 ${auditLogs.length} 条积分卡日志`);
    } catch {
      setArchiveMessage('复制失败，请检查浏览器剪贴板权限');
    }
  };

  return (
    <div className="bg-white/[0.85] backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-amber-200">
      <div className="flex flex-col gap-4 mb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-xl font-bold text-amber-800">📊 玩家收集档案</h3>
          <p className="text-xs text-gray-500 mt-1">
            当前：{currentArchive?.name ?? userProfile.nickname} · ID {userProfile.id.slice(0, 18)}
          </p>
          <p className="text-xs text-amber-700 mt-1">{archiveMessage}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[520px]">
          <select
            value={currentArchiveId}
            onChange={(event) => handleSwitchArchive(event.target.value)}
            className="h-10 rounded-lg border border-amber-200 bg-white px-3 text-sm font-semibold text-amber-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            aria-label="切换存档"
          >
            {archiveSlots.map((archive) => (
              <option key={archive.id} value={archive.id}>
                {archive.name} · {archive.totalSpins} 抽
              </option>
            ))}
          </select>

          <input
            value={nickname}
            onChange={(event) => setNicknameDraft(event.target.value)}
            onBlur={handleSaveNickname}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleSaveNickname();
              }
            }}
            className="h-10 min-w-0 rounded-lg border border-amber-200 bg-white px-3 text-sm font-semibold text-amber-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            maxLength={20}
            aria-label="玩家昵称"
          />

          <button
            onClick={handleSaveNickname}
            className="h-10 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white shadow hover:bg-amber-700"
          >
            保存名称
          </button>
          <button
            onClick={handleSaveCurrentArchive}
            className="h-10 rounded-lg border border-amber-300 bg-white px-4 text-sm font-bold text-amber-700 shadow hover:bg-amber-50"
          >
            保存当前存档
          </button>
          <button
            onClick={handleReadArchive}
            className="h-10 rounded-lg border border-amber-300 bg-white px-4 text-sm font-bold text-amber-700 shadow hover:bg-amber-50"
          >
            读取本地存档
          </button>
          <button
            onClick={handleCreateArchive}
            className="h-10 rounded-lg border border-orange-300 bg-orange-50 px-4 text-sm font-bold text-orange-700 shadow hover:bg-orange-100"
          >
            新建存档
          </button>
          <button
            onClick={handleDeleteArchive}
            className="h-10 rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-600 shadow hover:bg-red-50 sm:col-span-2"
          >
            删除当前存档
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
          <div className="text-xs text-amber-700">总抽取</div>
          <div className="text-2xl font-bold text-amber-900">{totalSpins}</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-center">
          <div className="text-xs text-orange-700">积分卡轮盘</div>
          <div className="text-2xl font-bold text-orange-900">{cardSpins}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SEASON_LIST.map((info) => {
          const cardCount = Math.min(cardCollection[info.season] ?? 0, 2);
          const hasWallpaper = Boolean(wallpaperCollection[info.season]);
          const goalLabel = hasWallpaper ? '终极奖励' : info.wallpaperLabel;
          const progressWidth = `${cardCount * 50}%`;

          return (
            <div
              key={info.season}
              className={`relative rounded-xl border-2 p-3 transition-all duration-300 ${
                hasWallpaper
                  ? 'bg-gradient-to-br from-yellow-100 to-amber-100 border-yellow-400 shadow-lg'
                  : cardCount >= 2
                    ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300'
                    : 'bg-white border-gray-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{info.emoji}</span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-800">{info.name}</div>
                  <div className="text-xs text-gray-500">{info.cardLabel}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <img
                  src={info.cardImage}
                  alt={info.cardLabel}
                  className={`h-16 w-full rounded-lg object-cover border border-amber-200 bg-amber-50 ${
                    cardCount > 0 ? '' : 'grayscale opacity-45'
                  }`}
                />
                <img
                  src={info.wallpaperImage}
                  alt={info.wallpaperLabel}
                  className={`h-16 w-full rounded-lg object-cover border border-amber-200 bg-amber-50 ${
                    hasWallpaper ? '' : 'grayscale opacity-60'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">积分卡</span>
                  <span className={`font-bold ${cardCount >= 2 ? 'text-orange-600' : 'text-gray-800'}`}>
                    {cardCount}/2
                  </span>
                </div>

                <div className="h-2 rounded-full overflow-hidden bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      hasWallpaper ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500' : 'bg-amber-500'
                    }`}
                    style={{ width: progressWidth }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">壁纸</span>
                  <span className={`font-bold ${hasWallpaper ? 'text-yellow-700' : 'text-gray-500'}`}>
                    {hasWallpaper ? '已解锁' : '未解锁'}
                  </span>
                </div>

                <div className="rounded-lg bg-white/70 px-2 py-1 text-xs font-bold text-amber-800">
                  当前目标：{goalLabel}
                </div>
              </div>

              {hasWallpaper && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white text-xs shadow-lg transform rotate-12">
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>

      {spinHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t border-amber-200">
          <div className="flex flex-wrap gap-2">
            {spinHistory.slice(0, 4).map((entry) => (
              <span
                key={entry.id}
                className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
              >
                积分卡 · {entry.label}
                {entry.rewardStatus === 'wallpaper' && ' · 解锁壁纸'}
                {entry.rewardStatus === 'ultimate' && ' · 终极奖励'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-amber-200 pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-amber-900">下播核对日志</h4>
            <p className="text-xs font-bold text-amber-700/70">记录抽卡、奖励解锁、奖励领取和重置</p>
          </div>
          <button
            type="button"
            onClick={handleCopyGiftLogs}
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-700 shadow-sm transition hover:bg-amber-50"
          >
            复制日志
          </button>
        </div>

        <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-3 text-xs font-bold text-amber-700">
              暂无日志，开始抽取后会自动记录。
            </div>
          ) : (
            auditLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="rounded-lg border border-amber-200 bg-white/75 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 font-black text-amber-900">
                  <span>{GIFT_LOG_TYPE_LABEL[log.type]} · {log.playerName}</span>
                  <span className="text-amber-600">{formatLogTime(log.createdAt)}</span>
                </div>
                <p className="mt-1 font-bold text-gray-600">{log.note}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
