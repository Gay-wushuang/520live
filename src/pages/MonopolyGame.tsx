import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DiceBox from '../components/DiceBox';
import EventWheel from '../components/EventWheel';
import FigureWheel from '../components/FigureWheel';
import GameBoard from '../components/GameBoard';
import {
  ADVENTURE_EVENTS,
  generateChaosWheel,
  MISFORTUNE_EVENTS,
  SPECIAL_EFFECTS,
  TRUTH_EVENTS,
} from '../data/eventConfigs';
import { EVENT_CONFIGS, useMonopolyStore } from '../stores/monopolyStore';
import type { ActiveEffect, BoardEventType, MonopolyLogEntry } from '../types/monopoly';

const EVENT_WHEEL_PROPS: Record<
  Exclude<BoardEventType, 'lottery' | 'figure'>,
  { title: string; icon: string; events: string[]; color: string }
> = {
  misfortune: {
    title: '厄运事件轮盘',
    icon: '厄',
    events: MISFORTUNE_EVENTS,
    color: EVENT_CONFIGS.misfortune.color,
  },
  adventure: {
    title: '冒险事件轮盘',
    icon: '冒',
    events: ADVENTURE_EVENTS,
    color: EVENT_CONFIGS.adventure.color,
  },
  truth: {
    title: '真心话事件轮盘',
    icon: '真',
    events: TRUTH_EVENTS,
    color: EVENT_CONFIGS.truth.color,
  },
  special: {
    title: '特殊效果变化轮盘',
    icon: '效',
    events: SPECIAL_EFFECTS,
    color: EVENT_CONFIGS.special.color,
  },
  chaos: {
    title: '混乱轮盘',
    icon: '混',
    events: [], // 动态生成
    color: EVENT_CONFIGS.chaos.color,
  },
};

const MONOPOLY_LOG_TYPE_LABEL: Record<MonopolyLogEntry['type'], string> = {
  archive: '档案',
  player: '观众',
  dice: '骰子',
  move: '移动',
  event: '事件',
  effect: '效果',
  turn: '回合',
  reset: '重置',
};

function formatLogTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function formatMonopolyLogsForCopy(logs: MonopolyLogEntry[]): string {
  const header = ['时间', '类型', '档案', '观众', '详情'].join('\t');
  const rows = logs.map((log) =>
    [
      formatLogTime(log.createdAt),
      MONOPOLY_LOG_TYPE_LABEL[log.type],
      log.archiveName,
      log.playerName ?? '',
      log.details,
    ].join('\t')
  );

  return [header, ...rows].join('\n');
}

function getEffectFromText(effect: string): ActiveEffect | null {
  if (effect.includes('+1 骰子')) {
    return {
      type: 'extra_dice',
      remainingUses: 1,
      description: '下次掷骰 +1 骰',
    };
  }

  if (effect.includes('经过积分抽奖格')) {
    return {
      type: 'auto_lottery',
      remainingUses: 1,
      description: '经过积分格也抽奖',
    };
  }

  if (effect.includes('再次掷骰子')) {
    return {
      type: 'reroll',
      remainingUses: 1,
      description: '本回合结束后再掷一次',
    };
  }

  if (effect.includes('免疫下一次厄运')) {
    return {
      type: 'misfortune_immunity',
      remainingUses: 1,
      description: '免疫下一次厄运',
    };
  }

  if (effect.includes('选择移动方向')) {
    return {
      type: 'choose_direction',
      remainingUses: 1,
      description: '下次掷骰可选择前进或后退',
    };
  }

  return null;
}

function isSpecialEffectText(event: string): boolean {
  return SPECIAL_EFFECTS.some((effect) => event.includes(effect));
}

function parseViewerNames(value: string): string[] {
  return value
    .split(/[\n,，;；]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export default function MonopolyGame() {
  const [activeEventModal, setActiveEventModal] = useState<BoardEventType | null>(null);
  const [activeEventResolved, setActiveEventResolved] = useState(false);
  const [continueTurnAfterEvent, setContinueTurnAfterEvent] = useState(false);
  const [lastEventResult, setLastEventResult] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [importText, setImportText] = useState('');
  const [archiveMessage, setArchiveMessage] = useState('已自动读取本地观众档案');
  const navigate = useNavigate();

  const {
    currentArchiveId,
    archiveSlots,
    players,
    currentPlayerIndex,
    currentTurn,
    isRollingDice,
    lastDiceResult,
    lastDiceValues,
    rollingDiceValues,
    pendingEvent,
    lastEffectMessage,
    logs,
    gamePhase,
    rollDice,
    movePlayer,
    movePlayerByEffect,
    nextTurn,
    continueCurrentTurn,
    resetGame,
    applyEffect,
    setMoveDirection,
    addPlayer,
    renamePlayer,
    removePlayer,
    setCurrentPlayer,
    importPlayers,
    createArchive,
    switchArchive,
    saveCurrentArchive,
  } = useMonopolyStore();

  const currentPlayer = players[currentPlayerIndex];
  const displayDiceValues = isRollingDice ? rollingDiceValues : lastDiceValues;
  const currentArchive = archiveSlots.find((archive) => archive.id === currentArchiveId);
  const canChooseDirection = Boolean(
    currentPlayer?.activeEffects.some((effect) => effect.type === 'choose_direction')
  );
  const canReroll = Boolean(currentPlayer?.activeEffects.some((effect) => effect.type === 'reroll'));

  const handleDiceRoll = useCallback(async () => {
    if (isRollingDice || gamePhase !== 'waiting') return;

    const direction = currentPlayer?.moveDirection ?? 1;
    const result = await rollDice();
    movePlayer(result * direction);
  }, [currentPlayer?.moveDirection, gamePhase, isRollingDice, movePlayer, rollDice]);

  const finishEvent = useCallback((event: string) => {
    setLastEventResult(event);
    setActiveEventResolved(true);
  }, []);

  const handleEventComplete = useCallback(
    (event: string) => {
      if (activeEventModal === 'special' || isSpecialEffectText(event)) {
        if (event.includes('直接前进 3 格')) {
          movePlayerByEffect(3);
          finishEvent(`${event}（已执行）`);
          return;
        }

        const effect = getEffectFromText(event);

        if (effect) {
          applyEffect(effect);
          setContinueTurnAfterEvent(effect.type === 'reroll');
          finishEvent(`${event}（已生效）`);
          return;
        }
      }

      finishEvent(event);
    },
    [activeEventModal, applyEffect, finishEvent, movePlayerByEffect]
  );

  const handlePendingEvent = useCallback(() => {
    if (!pendingEvent) return;

    const eventType = pendingEvent.position.type;

    if (eventType === 'lottery') {
      nextTurn();
      navigate('/card-wheel?from=monopoly');
      return;
    }

    setActiveEventResolved(false);
    setContinueTurnAfterEvent(false);
    setActiveEventModal(eventType);
  }, [navigate, nextTurn, pendingEvent]);

  const handleWheelClose = useCallback(() => {
    const shouldAdvanceTurn = activeEventResolved;
    const shouldContinueTurn = continueTurnAfterEvent || canReroll;

    setActiveEventModal(null);
    setActiveEventResolved(false);
    setContinueTurnAfterEvent(false);

    if (shouldAdvanceTurn) {
      if (shouldContinueTurn) {
        continueCurrentTurn();
      } else {
        nextTurn();
      }
    }
  }, [activeEventResolved, canReroll, continueCurrentTurn, continueTurnAfterEvent, nextTurn]);

  const handleAddPlayer = useCallback(() => {
    addPlayer(newPlayerName);
    setArchiveMessage(`已添加观众：${newPlayerName.trim() || `观众 ${players.length + 1}`}`);
    setNewPlayerName('');
  }, [addPlayer, newPlayerName, players.length]);

  const handleImportPlayers = useCallback(() => {
    const names = parseViewerNames(importText);
    if (names.length === 0) {
      setArchiveMessage('请先粘贴观众昵称，每行一个或用逗号分隔');
      return;
    }

    importPlayers(names);
    setArchiveMessage(`已导入 ${names.length} 位观众`);
    setImportText('');
  }, [importPlayers, importText]);

  const handleReadArchive = useCallback(async () => {
    setArchiveMessage('读取中...');

    try {
      await useMonopolyStore.persist.rehydrate();
      setArchiveMessage(`已读取本地观众档案 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`);
    } catch {
      setArchiveMessage('读取失败，请检查浏览器本地存储权限');
    }
  }, []);

  const handleCreateArchive = useCallback(() => {
    const archiveName = `观众档案 ${archiveSlots.length + 1}`;
    createArchive(archiveName);
    setArchiveMessage(`已新建并切换到 ${archiveName}`);
  }, [archiveSlots.length, createArchive]);

  const handleSwitchArchive = useCallback(
    (archiveId: string) => {
      const archive = archiveSlots.find((item) => item.id === archiveId);
      const switched = switchArchive(archiveId);
      setArchiveMessage(switched ? `已切换到 ${archive?.name ?? '目标档案'}` : '切换失败，未找到目标档案');
    },
    [archiveSlots, switchArchive]
  );

  const handleSaveArchive = useCallback(() => {
    saveCurrentArchive();
    setArchiveMessage(`已保存 ${currentArchive?.name ?? '当前观众档案'}`);
  }, [currentArchive?.name, saveCurrentArchive]);

  const handleCopyMonopolyLogs = useCallback(async () => {
    if (logs.length === 0) {
      setArchiveMessage('暂无大富翁日志可复制');
      return;
    }

    try {
      await navigator.clipboard.writeText(formatMonopolyLogsForCopy(logs));
      setArchiveMessage(`已复制 ${logs.length} 条大富翁日志`);
    } catch {
      setArchiveMessage('复制失败，请检查浏览器剪贴板权限');
    }
  }, [logs]);

  const activeEventConfig =
    activeEventModal && activeEventModal !== 'lottery' && activeEventModal !== 'figure'
      ? EVENT_WHEEL_PROPS[activeEventModal]
      : null;
  const activeWheelEvents = useMemo(() => {
    if (!activeEventModal || activeEventModal === 'lottery' || activeEventModal === 'figure') {
      return [];
    }

    return activeEventModal === 'chaos' ? generateChaosWheel() : EVENT_WHEEL_PROPS[activeEventModal].events;
  }, [activeEventModal]);

  return (
    <main className="cute-font min-h-screen bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-yellow-200 md:text-4xl">大富翁互动系统</h1>
            <p className="mt-2 text-sm text-slate-300">28 格棋盘，七类轮盘各 4 格，按中心对称分布。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/card-wheel"
              className="rounded-lg border border-amber-300/50 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-400/20"
            >
              打开积分抽奖
            </Link>
            <button
              type="button"
              onClick={resetGame}
              className="rounded-lg border border-red-300/40 bg-red-400/10 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-400/20"
            >
              重置棋盘
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="order-2 space-y-4 lg:order-1">
            <section className="rounded-2xl border border-violet-300/20 bg-white/10 p-5 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-violet-100">观众档案</h2>
                <span className="rounded-full bg-violet-300/[0.14] px-3 py-1 text-xs font-bold text-violet-100">
                  {players.length} 位
                </span>
              </div>
              <div className="mt-4 rounded-xl border border-violet-300/20 bg-slate-950/50 p-4">
                <input
                  value={currentPlayer?.name ?? ''}
                  onChange={(event) => {
                    if (currentPlayer) {
                      renamePlayer(currentPlayer.id, event.target.value);
                    }
                  }}
                  className="w-full rounded-lg border border-violet-300/20 bg-white/10 px-3 py-2 text-2xl font-black text-white outline-none transition focus:border-violet-200"
                  aria-label="当前观众昵称"
                />
                <p className="mt-2 text-sm text-slate-300">回合：{currentTurn + 1}</p>
                <p className="text-sm text-slate-300">位置：第 {(currentPlayer?.position ?? 0) + 1} 格</p>
                <p className="text-sm text-slate-300">下次骰子数：{currentPlayer?.diceCount ?? 1}</p>
                <p className="text-sm text-slate-300">
                  移动方向：{(currentPlayer?.moveDirection ?? 1) === 1 ? '前进' : '后退'}
                </p>
              </div>

              {currentPlayer?.activeEffects.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentPlayer.activeEffects.map((effect, index) => (
                    <span key={`${effect.type}-${index}`} className="rounded-full bg-cyan-300/[0.15] px-3 py-1 text-xs font-bold text-cyan-100">
                      {effect.description}
                    </span>
                  ))}
                </div>
              )}

              {canChooseDirection && (
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-cyan-200/20 bg-cyan-200/10 p-2">
                  <button
                    type="button"
                    onClick={() => setMoveDirection(1)}
                    className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                      currentPlayer?.moveDirection === 1 ? 'bg-cyan-200 text-slate-950' : 'bg-white/10 text-cyan-100 hover:bg-white/15'
                    }`}
                  >
                    前进
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveDirection(-1)}
                    className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                      currentPlayer?.moveDirection === -1 ? 'bg-cyan-200 text-slate-950' : 'bg-white/10 text-cyan-100 hover:bg-white/15'
                    }`}
                  >
                    后退
                  </button>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <select
                  value={currentArchiveId}
                  onChange={(event) => handleSwitchArchive(event.target.value)}
                  className="h-10 w-full rounded-lg border border-violet-300/20 bg-slate-950/70 px-3 text-sm font-bold text-violet-50 outline-none focus:border-violet-200"
                  aria-label="切换观众档案"
                >
                  {archiveSlots.map((archive) => (
                    <option key={archive.id} value={archive.id}>
                      {archive.name} · {archive.players.length} 位 · 第 {archive.currentTurn + 1} 回合
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleSaveArchive}
                    className="h-10 rounded-lg bg-violet-300 px-3 text-sm font-black text-slate-950 transition hover:bg-violet-200"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={handleReadArchive}
                    className="h-10 rounded-lg border border-violet-200/30 bg-white/10 px-3 text-sm font-black text-violet-50 transition hover:bg-white/15"
                  >
                    读取
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateArchive}
                    className="h-10 rounded-lg border border-violet-200/30 bg-white/10 px-3 text-sm font-black text-violet-50 transition hover:bg-white/15"
                  >
                    新档案
                  </button>
                </div>
                <p className="text-xs font-bold text-violet-200/80">{archiveMessage}</p>
              </div>

              <div className="mt-4 space-y-2">
                <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                  {players.map((player, index) => (
                    <div key={player.id} className="grid grid-cols-[1fr_auto] gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPlayer(index)}
                        className={`min-w-0 rounded-lg border px-3 py-2 text-left text-sm font-bold transition ${
                          index === currentPlayerIndex
                            ? 'border-yellow-200 bg-yellow-200 text-slate-950'
                            : 'border-white/10 bg-white/10 text-slate-100 hover:bg-white/15'
                        }`}
                      >
                        <span className="block truncate">{player.name}</span>
                        <span className="text-xs opacity-75">第 {player.position + 1} 格 · 骰 {player.diceCount}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removePlayer(player.id)}
                        className="h-full rounded-lg border border-red-300/20 bg-red-400/10 px-3 text-sm font-black text-red-100 transition hover:bg-red-400/20"
                        aria-label={`删除 ${player.name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    value={newPlayerName}
                    onChange={(event) => setNewPlayerName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handleAddPlayer();
                      }
                    }}
                    className="h-10 min-w-0 rounded-lg border border-violet-300/20 bg-slate-950/70 px-3 text-sm font-bold text-white outline-none focus:border-violet-200"
                    placeholder="新增观众昵称"
                    aria-label="新增观众昵称"
                  />
                  <button
                    type="button"
                    onClick={handleAddPlayer}
                    className="h-10 rounded-lg bg-cyan-300 px-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
                  >
                    添加
                  </button>
                </div>

                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  className="h-20 w-full resize-none rounded-lg border border-violet-300/20 bg-slate-950/70 px-3 py-2 text-sm font-bold text-white outline-none focus:border-violet-200"
                  placeholder="批量导入观众：每行一个昵称，或用逗号分隔"
                  aria-label="批量导入观众"
                />
                <button
                  type="button"
                  onClick={handleImportPlayers}
                  className="h-10 w-full rounded-lg border border-cyan-200/40 bg-cyan-300/15 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20"
                >
                  导入观众名单
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-cyan-300/20 bg-white/10 p-5 shadow-xl backdrop-blur">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-cyan-100">下播核对日志</h2>
                  <p className="mt-1 text-xs font-bold text-cyan-100/70">记录观众、骰子、移动、事件和效果</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyMonopolyLogs}
                  className="rounded-lg border border-cyan-200/40 bg-cyan-300/15 px-3 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/20"
                >
                  复制
                </button>
              </div>

              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {logs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-cyan-200/25 bg-cyan-300/10 px-3 py-3 text-xs font-bold text-cyan-100">
                    暂无日志，开始行动后会自动记录。
                  </div>
                ) : (
                  logs.slice(0, 8).map((log) => (
                    <div key={log.id} className="rounded-lg border border-white/10 bg-slate-950/[0.45] px-3 py-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-black text-cyan-100">
                        <span>{MONOPOLY_LOG_TYPE_LABEL[log.type]} · {log.playerName ?? '系统'}</span>
                        <span className="text-cyan-200/70">{formatLogTime(log.createdAt)}</span>
                      </div>
                      <p className="mt-1 font-bold text-slate-300">{log.details}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-xl backdrop-blur">
              <h2 className="text-lg font-bold text-slate-100">轮盘说明</h2>
              <div className="mt-3 space-y-2">
                {Object.entries(EVENT_CONFIGS).map(([type, config]) => (
                  <div key={type} className="grid grid-cols-[18px_1fr_auto] items-center gap-2 text-sm">
                    <span className="h-4 w-4 rounded" style={{ backgroundColor: config.color }} />
                    <span className="truncate text-slate-200">{config.name}</span>
                    <span className="text-xs text-slate-400">{config.positions.length} 格</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="order-1 rounded-2xl border border-violet-300/20 bg-white/5 p-4 shadow-xl backdrop-blur lg:order-2">
            <div className="mb-4 grid gap-4 xl:grid-cols-[260px_1fr]">
              <div className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 p-3 shadow-xl shadow-yellow-900/10 backdrop-blur">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-black text-yellow-100">六面骰</h2>
                  {lastDiceResult !== null && (
                    <span className="rounded-full bg-yellow-200 px-3 py-1 text-sm font-black text-slate-950">
                      点数 {lastDiceResult}
                    </span>
                  )}
                </div>
                <DiceBox isRolling={isRollingDice} values={displayDiceValues} />
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-violet-300/20 bg-white/10 px-4 py-3">
                    <p className="text-xs font-bold text-slate-400">当前观众</p>
                    <p className="mt-1 truncate text-2xl font-black text-white">{currentPlayer?.name ?? '观众'}</p>
                  </div>
                  <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
                    <p className="text-xs font-bold text-cyan-100/70">位置</p>
                    <p className="mt-1 text-2xl font-black text-cyan-100">第 {(currentPlayer?.position ?? 0) + 1} 格</p>
                  </div>
                  <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3">
                    <p className="text-xs font-bold text-amber-100/70">下次移动</p>
                    <p className="mt-1 text-2xl font-black text-amber-100">
                      {(currentPlayer?.moveDirection ?? 1) === 1 ? '前进' : '后退'} · {currentPlayer?.diceCount ?? 1} 骰
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDiceRoll}
                  disabled={isRollingDice || gamePhase !== 'waiting'}
                  className={`min-h-14 rounded-xl px-6 py-4 text-xl font-black transition ${
                    isRollingDice || gamePhase !== 'waiting'
                      ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                      : 'bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/20 hover:bg-yellow-300'
                  }`}
                >
                  {isRollingDice ? '掷骰中...' : '掷骰子前进'}
                </button>
              </div>
            </div>

            <GameBoard />

            {pendingEvent && gamePhase === 'event' && !activeEventModal && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={handlePendingEvent}
                  className="rounded-xl bg-fuchsia-500 px-8 py-4 text-lg font-black text-white shadow-xl shadow-fuchsia-500/20 transition hover:bg-fuchsia-400"
                >
                  触发事件：{EVENT_CONFIGS[pendingEvent.position.type].name}
                </button>
              </div>
            )}

            {lastEventResult && (
              <div className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-center text-sm font-bold text-emerald-100">
                上次事件：{lastEventResult}
              </div>
            )}

            {lastEffectMessage && (
              <div className="mt-3 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-center text-sm font-bold text-cyan-100">
                系统提示：{lastEffectMessage}
              </div>
            )}
          </section>
        </div>
      </div>

      {activeEventConfig && (
        <EventWheel
          title={activeEventConfig.title}
          icon={activeEventConfig.icon}
          events={activeWheelEvents}
          color={activeEventConfig.color}
          onComplete={handleEventComplete}
          onClose={handleWheelClose}
        />
      )}

      {activeEventModal === 'figure' && (
        <FigureWheel
          onComplete={(figure) => finishEvent(`获得 ${figure.name}`)}
          onClose={handleWheelClose}
        />
      )}
    </main>
  );
}
