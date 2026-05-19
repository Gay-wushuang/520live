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
    const radius = size / 2 - 10;
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

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      const cardColors = [
        ['#FFE5E5', '#FFB3B3'],
        ['#E5F5FF', '#B3D9FF'],
        ['#E8FFE5', '#B3FFB3'],
        ['#FFFDE5', '#FFF4B3'],
      ];
      gradient.addColorStop(0, cardColors[i][0]);
      gradient.addColorStop(1, cardColors[i][1]);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();

      if (images[i]) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius * 0.7, startAngle, endAngle);
        ctx.closePath();
        ctx.clip();

        const img = images[i];
        const imgSize = radius * 0.55;
        const midAngle = startAngle + segmentAngle / 2;
        const imgX = centerX + Math.cos(midAngle) * (radius * 0.38) - imgSize / 2;
        const imgY = centerY + Math.sin(midAngle) * (radius * 0.38) - imgSize / 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        ctx.restore();
      }

      if (labels[i]) {
        const midAngle = startAngle + segmentAngle / 2;
        const labelX = centerX + Math.cos(midAngle) * (radius * 0.68);
        const labelY = centerY + Math.sin(midAngle) * (radius * 0.68);

        ctx.save();
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillStyle = '#92400e';
        ctx.strokeText(labels[i], labelX, labelY);
        ctx.fillText(labels[i], labelX, labelY);
        ctx.restore();
      }
    }

    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 6, 0, 2 * Math.PI);
    const borderGradient = ctx.createLinearGradient(0, 0, size, size);
    borderGradient.addColorStop(0, '#D4AF37');
    borderGradient.addColorStop(0.25, '#FFD700');
    borderGradient.addColorStop(0.5, '#D4AF37');
    borderGradient.addColorStop(0.75, '#FFD700');
    borderGradient.addColorStop(1, '#D4AF37');
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 10;
    ctx.setLineDash([15, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 24; i++) {
      const angle = (i * 15 * Math.PI) / 180;
      const x1 = centerX + Math.cos(angle) * (radius + 12);
      const y1 = centerY + Math.sin(angle) * (radius + 12);
      const x2 = centerX + Math.cos(angle) * (radius + 20);
      const y2 = centerY + Math.sin(angle) * (radius + 20);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    const centerGradient = ctx.createRadialGradient(
      centerX - 5,
      centerY - 5,
      0,
      centerX,
      centerY,
      30
    );
    centerGradient.addColorStop(0, '#fff');
    centerGradient.addColorStop(0.7, '#f0f0f0');
    centerGradient.addColorStop(1, '#d0d0d0');
    ctx.fillStyle = centerGradient;
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#D4AF37';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GO', centerX, centerY);

  }, [config, images, rotation]);

  return (
    <canvas
      ref={canvasRef}
      width={config.size}
      height={config.size}
      style={{
        maxWidth: '100%',
        height: 'auto',
        filter: 'drop-shadow(0 15px 35px rgba(212, 175, 55, 0.4))',
      }}
    />
  );
}
