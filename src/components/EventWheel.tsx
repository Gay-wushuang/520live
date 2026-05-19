import { useEffect, useRef, useState } from 'react';

interface EventWheelProps {
  title: string;
  icon: string;
  events: string[];
  color: string;
  onComplete: (event: string) => void;
  onClose: () => void;
}

function polarToCartesian(center: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  };
}

function segmentPath(index: number, total: number, radius: number) {
  const center = 200;
  const segmentAngle = 360 / total;
  const startAngle = index * segmentAngle - 90;
  const endAngle = startAngle + segmentAngle;
  const start = polarToCartesian(center, radius, startAngle);
  const end = polarToCartesian(center, radius, endAngle);
  const largeArcFlag = segmentAngle > 180 ? 1 : 0;

  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

function splitWheelLabel(label: string): string[] {
  const normalizedLabel = label.replace(/\s+/g, ' ').trim();
  const maxChars = normalizedLabel.length > 18 ? 6 : 7;
  const lines: string[] = [];

  for (let index = 0; index < normalizedLabel.length && lines.length < 4; index += maxChars) {
    lines.push(normalizedLabel.slice(index, index + maxChars));
  }

  return lines;
}

export default function EventWheel({ title, icon, events, color, onComplete, onClose }: EventWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (events.length === 0) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setRotation(0);
    setIsSpinning(true);
    setSelectedEvent(null);
    setSelectedIndex(null);

    const selectedIndex = Math.floor(Math.random() * events.length);
    const segmentAngle = 360 / events.length;
    const fullSpins = 6 + Math.floor(Math.random() * 3);
    const targetRotation = fullSpins * 360 - selectedIndex * segmentAngle - segmentAngle / 2;
    const startRotation = 0;
    const totalRotation = targetRotation;
    const finalRotation = startRotation + totalRotation;
    const startTime = performance.now();
    const duration = 3600;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 4);

      setRotation(startRotation + totalRotation * easedProgress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const event = events[selectedIndex];
      setRotation(finalRotation);
      setSelectedEvent(event);
      setSelectedIndex(selectedIndex);
      setIsSpinning(false);
      onCompleteRef.current(event);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [events]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-violet-950/[0.65] p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border bg-gradient-to-br from-white via-pink-50 to-sky-50 p-6 shadow-2xl" style={{ borderColor: `${color}55` }}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 h-9 w-9 rounded-full border border-pink-200 bg-white/80 text-lg font-bold text-violet-700 shadow transition hover:bg-pink-50"
          aria-label="关闭轮盘"
        >
          ×
        </button>

        <div className="cute-font mb-5 pr-10 text-center">
          <h2 className="text-3xl font-black text-violet-900">
            <span className="mr-2">{icon}</span>
            <span style={{ color }}>{title}</span>
          </h2>
          <p className="mt-2 text-sm font-bold text-violet-500">指针停下的位置就是本次事件。</p>
        </div>

        <div className="relative mx-auto h-[min(78vw,430px)] w-[min(78vw,430px)]">
          <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-5">
            <svg width="34" height="76" viewBox="0 0 34 76" aria-hidden="true" className="drop-shadow-lg">
              <path d="M17 74 L8 22 C6 12 9 5 17 2 C25 5 28 12 26 22 Z" fill="#ef4444" stroke="#fff" strokeWidth="3" />
              <circle cx="17" cy="20" r="4" fill="#7f1d1d" />
            </svg>
          </div>

          <svg
            viewBox="0 0 400 400"
            className="h-full w-full drop-shadow-2xl"
            style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'none' : 'transform 0.2s ease-out' }}
          >
            {events.map((event, index) => {
              const segmentAngle = 360 / events.length;
              const midAngle = index * segmentAngle + segmentAngle / 2 - 90;
              const labelPosition = polarToCartesian(200, 122, midAngle);
              const labelLines = splitWheelLabel(event);

              return (
                <g key={`${event}-${index}`}>
                  <path
                    d={segmentPath(index, events.length, 188)}
                    fill={index % 2 === 0 ? `${color}c9` : `${color}90`}
                    stroke="#fff"
                    strokeWidth="3"
                  />
                  <text
                    x={labelPosition.x}
                    y={labelPosition.y}
                    fill="#fff"
                    fontSize="12"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontFamily: 'var(--cute-font)' }}
                    transform={`rotate(${midAngle + 90}, ${labelPosition.x}, ${labelPosition.y})`}
                  >
                    {labelLines.map((line, lineIndex) => (
                      <tspan key={`${line}-${lineIndex}`} x={labelPosition.x} dy={lineIndex === 0 ? `${-(labelLines.length - 1) * 7}` : '14'}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
            <circle cx="200" cy="200" r="38" fill="#fff7fb" stroke={color} strokeWidth="5" />
            <text x="200" y="206" textAnchor="middle" fontSize="20" fontWeight="800" fill={color} style={{ fontFamily: 'var(--cute-font)' }}>
              {icon}
            </text>
          </svg>
        </div>

        {selectedEvent && (
          <div className="cute-font mt-5 rounded-2xl border bg-white/75 px-5 py-4 text-center shadow-inner" style={{ borderColor: `${color}55` }}>
            <p className="text-sm font-bold" style={{ color }}>
              抽中事件{selectedIndex !== null ? ` ${selectedIndex + 1}` : ''}
            </p>
            <p className="mt-2 text-xl font-black text-violet-900">{selectedEvent}</p>
            <p className="mt-2 text-xs font-bold text-violet-400">点击右上角 X 退出轮盘</p>
          </div>
        )}
      </div>
    </div>
  );
}
