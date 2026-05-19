import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { SpinResult } from '../types/wheel';

interface ResultModalProps {
  result: SpinResult | null;
  images: HTMLImageElement[];
  onClose: () => void;
  title?: string;
  description?: ReactNode;
  imageAlt?: string;
}

export default function ResultModal({
  result,
  images,
  onClose,
  title,
  description,
  imageAlt,
}: ResultModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer: number | undefined;

    if (result) {
      timer = window.setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [result]);

  if (!result) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`cute-font relative bg-gradient-to-br from-white via-pink-50 to-amber-50 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-amber-200 transform transition-all duration-700 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-50 translate-y-20'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 h-9 w-9 rounded-full border border-amber-200 bg-white/80 text-lg font-bold text-amber-700 shadow transition hover:bg-amber-50"
          aria-label="关闭结果"
        >
          ×
        </button>

        <div className="text-center">
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl animate-pulse" />
            <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent relative z-10">
              {title ?? '恭喜中奖'}
            </h2>
          </div>

          {images[result.winningIndex] && (
            <div className="mb-6 relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-300" />
              <img
                src={images[result.winningIndex].src}
                alt={imageAlt ?? `奖品 ${result.winningIndex + 1}`}
                className="relative rounded-2xl shadow-2xl w-full h-64 object-cover border-4 border-white/20"
              />
            </div>
          )}

          <p className="text-amber-800 text-lg mb-6">
            {description ?? (
              <>
                获得第 <span className="text-yellow-600 font-bold text-2xl">{result.winningIndex + 1}</span> 号奖品
              </>
            )}
          </p>

          <p className="text-xs font-bold text-amber-500">点击右上角 X 关闭结果</p>
        </div>

        <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-3xl pointer-events-none">
          {[...Array(20)].map((_, index) => (
            <div
              key={index}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
