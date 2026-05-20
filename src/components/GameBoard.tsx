import { useMemo } from 'react';
import { EVENT_CONFIGS, useMonopolyStore } from '../stores/monopolyStore';
import type { BoardEventType } from '../types/monopoly';

interface GameBoardProps {
  onPositionClick?: (positionIndex: number) => void;
}

const TARGET_LABELS = {
  audience: '观众',
  streamer: '主播',
  both: '全员',
};

const BOARD_LABELS: Record<BoardEventType, string> = {
  misfortune: '厄运',
  adventure: '冒险',
  truth: '真心',
  lottery: '积分',
  special: '效果',
  figure: '周边',
  chaos: '混乱',
};

export default function GameBoard({ onPositionClick }: GameBoardProps) {
  const { boardPositions, players, pendingEvent } = useMonopolyStore();

  const positionCounts = useMemo(() => {
    const counts: Record<BoardEventType, number> = {
      misfortune: 0,
      adventure: 0,
      truth: 0,
      lottery: 0,
      special: 0,
      figure: 0,
      chaos: 0,
    };

    boardPositions.forEach((position) => {
      counts[position.type] += 1;
    });

    return counts;
  }, [boardPositions]);

  return (
    <section className="w-full">
      <div className="relative mx-auto aspect-square w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/80 bg-white/75 shadow-[0_22px_50px_rgba(180,83,9,0.14)]">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100/35 via-pink-100/20 to-sky-100/30" />
        <img
          src="/大富翁棋盘.png"
          alt="大富翁棋盘"
          className="absolute inset-0 h-full w-full object-contain"
        />

        {boardPositions.map((position) => {
          const config = EVENT_CONFIGS[position.type];
          const isHighlighted = pendingEvent?.position.id === position.id;

          return (
            <button
              key={position.id}
              type="button"
              onClick={() => onPositionClick?.(position.index)}
              title={`${position.index + 1}. ${position.name}（${TARGET_LABELS[position.target]}）`}
              className={`cute-font absolute flex flex-col items-center justify-center rounded-xl border text-[9px] font-black leading-tight shadow-sm transition-all sm:text-[11px] ${
                isHighlighted
                  ? 'z-30 border-yellow-200 ring-4 ring-yellow-200/70'
                  : 'z-10 border-white/[0.35] hover:border-white/80'
              }`}
              style={{
                left: `${position.bounds.x}%`,
                top: `${position.bounds.y}%`,
                width: `${position.bounds.width}%`,
                height: `${position.bounds.height}%`,
                backgroundColor: 'transparent',
                color: config.color,
                textShadow: '0 1px 0 rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.9)',
              }}
            >
              <span className="text-[11px] sm:text-sm">{BOARD_LABELS[position.type]}</span>
              <span className="text-[8px] opacity-80 sm:text-[9px]">#{position.index + 1}</span>
            </button>
          );
        })}

        {players.map((player, playerIndex) => {
          const position = boardPositions.find((item) => item.index === player.position);

          if (!position) {
            return null;
          }

          return (
            <div
              key={player.id}
              className={`pointer-events-none absolute z-40 transition-[left,top] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                player.isMoving ? 'piece-hop' : ''
              }`}
              style={{
                left: `${position.coordinates.x}%`,
                top: `${position.coordinates.y}%`,
              }}
            >
              <div className="relative flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-pink-200 via-white to-sky-200 text-[11px] font-black text-violet-700 shadow-[0_8px_18px_rgba(88,28,135,0.35)] sm:h-11 sm:w-11 sm:text-xs">
                <span className="cute-font">P{playerIndex + 1}</span>
                <span className="absolute -bottom-1 h-2 w-7 rounded-full bg-violet-900/20 blur-[2px]" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-7">
        {Object.entries(EVENT_CONFIGS).map(([type, config]) => (
          <div key={type} className="flex items-center gap-2 rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-amber-900 shadow-sm">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: config.color }} />
            <span className="min-w-0 flex-1 truncate">{config.name}</span>
            <span className="font-black text-amber-600">{positionCounts[type as BoardEventType]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
