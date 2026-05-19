import { useCallback } from 'react';

const SEGMENT_COUNT = 4;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;
const FULL_CIRCLE = 360;

export function getRandomUnit(): number {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] / 0x100000000;
  }

  return Math.random();
}

export function createRandomAngle(random = getRandomUnit): number {
  const segment = Math.floor(random() * SEGMENT_COUNT);
  const randomOffset = random() * (SEGMENT_ANGLE - 10) + 5;

  return segment * SEGMENT_ANGLE + randomOffset;
}

export function getWinningSegment(finalAngle: number): number {
  const normalizedAngle = ((finalAngle % FULL_CIRCLE) + FULL_CIRCLE) % FULL_CIRCLE;
  const adjustedAngle = (FULL_CIRCLE - normalizedAngle) % FULL_CIRCLE;
  const segment = Math.floor(adjustedAngle / SEGMENT_ANGLE);

  return Math.min(Math.max(segment, 0), SEGMENT_COUNT - 1);
}

export function useProbabilityEngine() {
  const getRandomAngle = useCallback((): number => {
    return createRandomAngle();
  }, []);

  const calculateWinningSegment = useCallback((finalAngle: number): number => {
    return getWinningSegment(finalAngle);
  }, []);

  return { getRandomAngle, calculateWinningSegment };
}
