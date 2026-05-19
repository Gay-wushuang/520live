import { useState, useCallback, useEffect, useRef } from 'react';
import { useProbabilityEngine } from '../hooks/useProbabilityEngine';
import type { SpinResult, WheelState } from '../types/wheel';

interface UseSpinControllerProps {
  images: string[];
  onSpinComplete?: (result: SpinResult) => void;
}

export function useSpinController({ images, onSpinComplete }: UseSpinControllerProps) {
  const [state, setState] = useState<WheelState>({
    isSpinning: false,
    currentRotation: 0,
    result: null,
  });

  const animationRef = useRef<number | null>(null);
  const isSpinningRef = useRef(false);
  const { getRandomAngle, calculateWinningSegment } = useProbabilityEngine();

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const easeOutQuart = (t: number): number => {
    return 1 - Math.pow(1 - t, 4);
  };

  const startSpin = useCallback(() => {
    if (isSpinningRef.current || images.length === 0) return;

    isSpinningRef.current = true;
    setState((prev) => ({ ...prev, isSpinning: true, result: null }));

    const startRotation = state.currentRotation;
    const targetAngle = getRandomAngle();
    const extraRotations = 5 + Math.random() * 3;
    const totalRotation = extraRotations * 360 + targetAngle;
    const finalRotation = startRotation + totalRotation;

    const startTime = performance.now();
    const duration = 5000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const currentRotation = startRotation + totalRotation * easedProgress;

      setState((prev) => ({
        ...prev,
        currentRotation,
      }));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        const winningIndex = calculateWinningSegment(finalRotation);
        const result: SpinResult = {
          winningIndex,
          winningImage: images[winningIndex] ?? images[0] ?? '',
          finalAngle: finalRotation % 360,
          timestamp: Date.now(),
        };

        isSpinningRef.current = false;
        setState({
          isSpinning: false,
          currentRotation: finalRotation,
          result,
        });

        onSpinComplete?.(result);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [state.currentRotation, getRandomAngle, calculateWinningSegment, images, onSpinComplete]);

  const reset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    isSpinningRef.current = false;
    setState({
      isSpinning: false,
      currentRotation: 0,
      result: null,
    });
  }, []);

  const clearResult = useCallback(() => {
    setState((prev) => ({
      ...prev,
      result: null,
    }));
  }, []);

  return {
    ...state,
    startSpin,
    reset,
    clearResult,
  };
}
