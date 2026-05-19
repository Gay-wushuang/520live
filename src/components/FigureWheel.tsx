import { useEffect, useRef, useState } from 'react';
import { FIGURE_OPTIONS } from '../data/eventConfigs';

type FigureOption = (typeof FIGURE_OPTIONS)[number];

interface FigureWheelProps {
  onComplete: (figure: FigureOption) => void;
  onClose: () => void;
}

export default function FigureWheel({ onComplete, onClose }: FigureWheelProps) {
  const [isSpinning, setIsSpinning] = useState(true);
  const [selectedFigure, setSelectedFigure] = useState<FigureOption | null>(null);
  const [rotation, setRotation] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const selectedIndex = Math.floor(Math.random() * FIGURE_OPTIONS.length);
    const segmentAngle = 360 / FIGURE_OPTIONS.length;
    const finalRotation = 360 * 6 - selectedIndex * segmentAngle - segmentAngle / 2;

    const spinTimer = window.setTimeout(() => {
      setRotation(finalRotation);
    }, 50);

    const completeTimer = window.setTimeout(() => {
      const figure = FIGURE_OPTIONS[selectedIndex];
      setSelectedFigure(figure);
      setIsSpinning(false);
      onCompleteRef.current(figure);
    }, 3300);

    return () => {
      window.clearTimeout(spinTimer);
      window.clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-violet-950/70 p-4 backdrop-blur-lg">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-purple-200 bg-gradient-to-br from-white via-fuchsia-50 to-sky-50 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 h-9 w-9 rounded-full border border-pink-200 bg-white/80 text-lg font-bold text-violet-700 shadow transition hover:bg-pink-50"
          aria-label="关闭手办轮盘"
        >
          ×
        </button>

        <h2 className="cute-font mb-5 pr-10 text-center text-3xl font-black text-purple-700">手办抽取轮盘</h2>

        <div className="relative mx-auto h-80 w-80">
          <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-5">
            <svg width="34" height="76" viewBox="0 0 34 76" aria-hidden="true" className="drop-shadow-lg">
              <path d="M17 74 L8 22 C6 12 9 5 17 2 C25 5 28 12 26 22 Z" fill="#ef4444" stroke="#fff" strokeWidth="3" />
              <circle cx="17" cy="20" r="4" fill="#7f1d1d" />
            </svg>
          </div>

          <div
            className="h-full w-full rounded-full border-4 border-white shadow-2xl"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            }}
          >
            <svg viewBox="0 0 200 200" className="h-full w-full">
              {FIGURE_OPTIONS.map((option, index) => {
                const angle = (360 / FIGURE_OPTIONS.length) * index - 90;
                const nextAngle = (360 / FIGURE_OPTIONS.length) * (index + 1) - 90;
                const midAngle = (angle + nextAngle) / 2;
                const startX = 100 + 96 * Math.cos((angle * Math.PI) / 180);
                const startY = 100 + 96 * Math.sin((angle * Math.PI) / 180);
                const endX = 100 + 96 * Math.cos((nextAngle * Math.PI) / 180);
                const endY = 100 + 96 * Math.sin((nextAngle * Math.PI) / 180);
                const labelX = 100 + 58 * Math.cos((midAngle * Math.PI) / 180);
                const labelY = 100 + 58 * Math.sin((midAngle * Math.PI) / 180);

                return (
                  <g key={option.name}>
                    <path
                      d={`M 100 100 L ${startX} ${startY} A 96 96 0 0 1 ${endX} ${endY} Z`}
                      fill={index === 0 ? '#FDE68A' : index === 1 ? '#DDD6FE' : '#BAE6FD'}
                      stroke="#fff"
                      strokeWidth="2"
                    />
                    <text x={labelX} y={labelY - 5} fill="#6D28D9" fontSize="20" fontWeight="900" textAnchor="middle" style={{ fontFamily: 'var(--cute-font)' }}>
                      {option.icon}
                    </text>
                    <text x={labelX} y={labelY + 14} fill="#7C3AED" fontSize="8" fontWeight="800" textAnchor="middle" style={{ fontFamily: 'var(--cute-font)' }}>
                      {option.rarity}
                    </text>
                  </g>
                );
              })}
              <circle cx="100" cy="100" r="26" fill="#f8fafc" stroke="#7c3aed" strokeWidth="4" />
              <text x="100" y="106" textAnchor="middle" fontSize="18" fontWeight="900" fill="#7c3aed">
                3D
              </text>
            </svg>
          </div>
        </div>

        <div className="mt-6 min-h-24 text-center">
          {isSpinning && (
            <div className="cute-font inline-flex items-center rounded-full border border-purple-200 bg-white/75 px-5 py-2 text-sm font-bold text-purple-700 shadow">
              抽取手办中...
            </div>
          )}

          {selectedFigure && !isSpinning && (
            <div className="cute-font rounded-2xl border border-purple-200 bg-white/75 px-5 py-4 shadow-inner">
              <p className="text-sm font-bold text-purple-500">获得</p>
              <p className="mt-2 text-2xl font-black text-violet-900">
                {selectedFigure.name} · {selectedFigure.rarity}
              </p>
              <p className="mt-2 text-xs font-bold text-violet-400">点击右上角 X 退出轮盘</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
