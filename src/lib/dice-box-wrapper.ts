type DiceBoxOptions = {
  duration?: number;
};

export class DiceBoxWrapper {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private diceValues: number[] = [1];
  private isRolling = false;
  private rollStartTime = 0;
  private rollDuration: number;
  private width = 256;
  private height = 256;

  public onRollComplete: ((results: number[]) => void) | null = null;

  constructor(container: HTMLElement, options?: DiceBoxOptions) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'h-full w-full';

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D is not supported');
    }

    this.ctx = ctx;
    this.rollDuration = options?.duration ?? 2100;
    this.container.appendChild(this.canvas);
    this.resizeCanvas();
    this.renderDice(1, false);
  }

  async init(): Promise<void> {
    return Promise.resolve();
  }

  roll(notation: string, forcedValues?: number[]) {
    if (this.isRolling) return;

    const match = notation.match(/(\d+)d(\d+)/i);
    if (!match) return;

    const count = Number(match[1]);
    const sides = Number(match[2]);
    this.resizeCanvas();
    this.diceValues =
      forcedValues && forcedValues.length > 0
        ? forcedValues
        : Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);

    this.isRolling = true;
    this.rollStartTime = performance.now();
    this.animateRoll();
  }

  private resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.width = Math.max(this.container.clientWidth || 256, 180);
    this.height = Math.max(this.container.clientHeight || 220, 180);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private animateRoll = () => {
    const elapsed = performance.now() - this.rollStartTime;
    const progress = Math.min(elapsed / this.rollDuration, 1);

    this.renderDice(progress, true);

    if (progress < 1) {
      this.animationId = requestAnimationFrame(this.animateRoll);
      return;
    }

    this.isRolling = false;
    this.renderDice(1, false);
    this.onRollComplete?.(this.diceValues);
  };

  private renderDice(progress: number, rolling: boolean) {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);
    this.drawTray();

    const diceCount = Math.max(1, this.diceValues.length);
    const dieSize = diceCount > 1 ? Math.min(70, this.width / (diceCount + 1.1)) : Math.min(104, this.width * 0.42);
    const gap = Math.min(18, dieSize * 0.22);
    const totalWidth = dieSize * diceCount + gap * (diceCount - 1);
    const startX = this.width / 2 - totalWidth / 2 + dieSize / 2;
    const baseY = this.height * 0.52;

    this.diceValues.forEach((value, index) => {
      const frame = Math.floor(progress * 15 + index * 2);
      const face = rolling && progress < 0.82 ? ((frame % 6) + 1) : value;
      const settle = 1 - Math.min(progress / 0.88, 1);
      const bounce = rolling ? Math.sin(progress * Math.PI) * 28 + Math.sin(progress * Math.PI * 3) * 5 * settle : 0;
      const spin = rolling ? progress * Math.PI * (3.2 + index * 0.3) * settle : 0;
      const drift = rolling ? Math.sin(progress * Math.PI * 2 + index) * 7 * settle : 0;
      const squash = rolling ? Math.sin(progress * Math.PI * 2.4) * 0.025 * settle : 0;
      const scaleX = 1 + squash;
      const scaleY = 1 - squash;
      const x = startX + index * (dieSize + gap) + drift;
      const y = baseY - bounce;

      this.drawDie(x, y, dieSize, spin, scaleX, scaleY, face);
    });
  }

  private drawTray() {
    const ctx = this.ctx;
    const trayGradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    trayGradient.addColorStop(0, '#fffaf5');
    trayGradient.addColorStop(0.55, '#fdf2f8');
    trayGradient.addColorStop(1, '#eef6ff');
    ctx.fillStyle = trayGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(8, 8, this.width - 16, this.height - 16, 20);
    ctx.stroke();

    const floor = ctx.createRadialGradient(this.width / 2, this.height * 0.72, 8, this.width / 2, this.height * 0.72, this.width * 0.38);
    floor.addColorStop(0, 'rgba(124, 58, 237, 0.12)');
    floor.addColorStop(1, 'rgba(124, 58, 237, 0)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawDie(x: number, y: number, size: number, rotation: number, scaleX: number, scaleY: number, value: number) {
    const ctx = this.ctx;
    const half = size / 2;
    const radius = Math.max(12, size * 0.16);

    ctx.save();
    ctx.fillStyle = 'rgba(88, 28, 135, 0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + half * 0.95, half * 0.68, half * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scaleX, scaleY);

    ctx.shadowColor = 'rgba(88, 28, 135, 0.32)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 12;

    const sideGradient = ctx.createLinearGradient(-half, half * 0.15, half, half);
    sideGradient.addColorStop(0, '#f0abfc');
    sideGradient.addColorStop(1, '#93c5fd');
    ctx.fillStyle = sideGradient;
    ctx.beginPath();
    ctx.roundRect(-half + 4, -half + 12, size, size, radius);
    ctx.fill();

    const faceGradient = ctx.createLinearGradient(-half, -half, half, half);
    faceGradient.addColorStop(0, '#ffffff');
    faceGradient.addColorStop(0.55, '#fff7fb');
    faceGradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = faceGradient;
    ctx.beginPath();
    ctx.roundRect(-half, -half, size, size, radius);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#f9a8d4';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-half + 7, -half + 7, size - 14, size - 14, radius * 0.75);
    ctx.stroke();

    ctx.fillStyle = '#7c3aed';
    this.drawDots(value, size);
    ctx.restore();
  }

  private drawDots(value: number, size: number) {
    const offset = size * 0.24;
    const dotSize = Math.max(5, size * 0.073);
    const positions: Record<number, Array<[number, number]>> = {
      1: [[0, 0]],
      2: [
        [-offset, -offset],
        [offset, offset],
      ],
      3: [
        [-offset, -offset],
        [0, 0],
        [offset, offset],
      ],
      4: [
        [-offset, -offset],
        [offset, -offset],
        [-offset, offset],
        [offset, offset],
      ],
      5: [
        [-offset, -offset],
        [offset, -offset],
        [0, 0],
        [-offset, offset],
        [offset, offset],
      ],
      6: [
        [-offset, -offset],
        [offset, -offset],
        [-offset, 0],
        [offset, 0],
        [-offset, offset],
        [offset, offset],
      ],
    };

    positions[value].forEach(([dotX, dotY]) => {
      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  clear() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.container.contains(this.canvas)) {
      this.container.removeChild(this.canvas);
    }
  }
}

export { DiceBoxWrapper as DiceBox };
