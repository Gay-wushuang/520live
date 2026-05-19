import { useEffect, useRef, useState } from 'react';

interface DiceBoxProps {
  isRolling: boolean;
  values: number[];
  onRollComplete?: (result: number) => void;
}

export default function DiceBox({ isRolling, values, onRollComplete }: DiceBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diceBoxRef = useRef<import('../lib/dice-box-wrapper').DiceBoxWrapper | null>(null);
  const activeRollRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || diceBoxRef.current) return;

    let disposed = false;

    const initDice = async () => {
      const { DiceBox } = await import('../lib/dice-box-wrapper');

      if (disposed || !containerRef.current) {
        return;
      }

      const dice = new DiceBox(containerRef.current, { duration: 1600 });
      await dice.init();
      dice.onRollComplete = (results: number[]) => {
        activeRollRef.current = false;
        onRollComplete?.(results.reduce((sum, value) => sum + value, 0));
      };
      diceBoxRef.current = dice;
      setIsReady(true);
    };

    initDice().catch((error) => {
      console.error('Dice initialization failed:', error);
    });

    return () => {
      disposed = true;
      diceBoxRef.current?.clear();
      diceBoxRef.current = null;
    };
  }, [onRollComplete]);

  useEffect(() => {
    if (!isReady || !isRolling || !diceBoxRef.current || activeRollRef.current) return;

    activeRollRef.current = true;
    const safeValues = values.length > 0 ? values : [1];
    diceBoxRef.current.roll(`${safeValues.length}d6`, safeValues);
  }, [isReady, isRolling, values]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-48 w-full overflow-hidden rounded-2xl border border-pink-200/70 bg-pink-50 shadow-[0_14px_28px_rgba(124,58,237,0.16)] sm:h-56"
      />

      {isRolling && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center rounded-2xl bg-white/10 p-3">
          <div className="cute-font rounded-full border border-pink-200 bg-white/80 px-4 py-1 text-sm font-bold text-violet-700 shadow">
            掷骰中...
          </div>
        </div>
      )}
    </div>
  );
}
