export interface WheelConfig {
  images: string[];
  labels?: string[];
  segments: number;
  size: number;
}

export interface SpinResult {
  winningIndex: number;
  winningImage: string;
  finalAngle: number;
  timestamp: number;
}

export interface WheelState {
  isSpinning: boolean;
  currentRotation: number;
  result: SpinResult | null;
}
