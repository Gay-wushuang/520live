import { useEffect, useRef } from 'react';
import type { WheelConfig } from '../types/wheel';

interface CardWheelRendererProps {
  config: WheelConfig;
  images: HTMLImageElement[];
  rotation: number;
}

export default function CardWheelRenderer({ config, images, rotation }: CardWheelRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || images.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { size, segments } = config;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 30;
    const segmentAngle = (2 * Math.PI) / segments;
    const labels = config.labels ?? [];

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    for (let i = 0; i < segments; i++) {
      const startAngle = i * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      const gradient = ctx.createRadialGradient(centerX, centerY, 15, centerX, centerY, radius);
      const cardColors = [
        ['#fff1f2', '#fecdd3'],
        ['#ecfeff', '#bae6fd'],
        ['#f0fdf4', '#bbf7d0'],
        ['#fffbeb', '#fde68a'],
      ];
      gradient.addColorStop(0, cardColors[i][0]);
      gradient.addColorStop(1, cardColors[i][1]);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 5;
      ctx.stroke();

      if (images[i]) {
        ctx.save();
        const img = images[i];
        const imgSize = radius * 0.46;
        const midAngle = startAngle + segmentAngle / 2;
        const imgX = centerX + Math.cos(midAngle) * (radius * 0.34) - imgSize / 2;
        const imgY = centerY + Math.sin(midAngle) * (radius * 0.34) - imgSize / 2;

        ctx.shadowColor = 'rgba(146, 64, 14, 0.16)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 7;
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.beginPath();
        ctx.roundRect(imgX - 8, imgY - 8, imgSize + 16, imgSize + 16, 18);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgSize, imgSize, 14);
        ctx.clip();

        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        ctx.restore();
      }

      if (labels[i]) {
        const midAngle = startAngle + segmentAngle / 2;
        const labelX = centerX + Math.cos(midAngle) * (radius * 0.68);
        const labelY = centerY + Math.sin(midAngle) * (radius * 0.68);

        ctx.save();
        ctx.font = 'bold 18px YouYuan, Microsoft YaHei, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillStyle = '#7c2d12';
        ctx.strokeText(labels[i], labelX, labelY);
        ctx.fillText(labels[i], labelX, labelY);
        ctx.restore();
      }
    }

    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
    const borderGradient = ctx.createLinearGradient(0, 0, size, size);
    borderGradient.addColorStop(0, '#f9a8d4');
    borderGradient.addColorStop(0.35, '#fcd34d');
    borderGradient.addColorStop(0.7, '#93c5fd');
    borderGradient.addColorStop(1, '#c4b5fd');
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 22, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.86)';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI);
    const centerGradient = ctx.createRadialGradient(
      centerX - 5,
      centerY - 5,
      0,
      centerX,
      centerY,
      38
    );
    centerGradient.addColorStop(0, '#fff');
    centerGradient.addColorStop(0.68, '#fff7ed');
    centerGradient.addColorStop(1, '#fde68a');
    ctx.fillStyle = centerGradient;
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.font = 'bold 15px YouYuan, Microsoft YaHei, sans-serif';
    ctx.fillStyle = '#b45309';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('抽卡', centerX, centerY);

  }, [config, images, rotation]);

  return (
    <canvas
      ref={canvasRef}
      width={config.size}
      height={config.size}
      style={{
        maxWidth: '100%',
        height: 'auto',
        filter: 'drop-shadow(0 20px 38px rgba(180, 83, 9, 0.22))',
      }}
    />
  );
}
