import { useEffect, useMemo, useRef, useState } from 'react';
import { DYNAMIC_WALLPAPER_VIDEO } from '../data/seasons';
import { useGameStore } from '../stores/gameStore';

const PARTICLE_ICONS = ['🎉', '✨', '⭐', '🌟', '💫', '🎊'] as const;

export default function VideoRewardPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { showVideoReward, claimUltimateReward, pendingReward } = useGameStore();
  const particles = useMemo(() => (
    showVideoReward ? Array.from({ length: 60 }, (_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${2 + Math.random() * 3}s`,
      icon: PARTICLE_ICONS[Math.floor(Math.random() * PARTICLE_ICONS.length)] ?? PARTICLE_ICONS[0],
    })) : []
  ), [showVideoReward]);

  useEffect(() => {
    let timer: number | undefined;

    if (showVideoReward) {
      setIsVisible(true);
      timer = window.setTimeout(() => {
        const playPromise = videoRef.current?.play();

        if (playPromise) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      }, 500);
    } else {
      setIsVisible(false);
      setIsPlaying(false);
    }

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [showVideoReward]);

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsVisible(false);
    claimUltimateReward();
  };

  if (!showVideoReward || !isVisible) return null;

  const seasonName = pendingReward?.seasonName ?? '';

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
      <div
        className={`relative w-full max-w-5xl mx-4 transition-all duration-1000 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 rounded-3xl opacity-50 blur-3xl animate-pulse" />

        <div className="relative bg-black/90 backdrop-blur-xl rounded-3xl overflow-hidden border-4 border-yellow-400 shadow-2xl shadow-yellow-500/30">
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-6 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-500 bg-clip-text">
                🎊 恭喜获得终极大奖！
              </h2>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold rounded-full hover:from-yellow-300 hover:to-orange-400 transition-all transform hover:scale-105 shadow-lg"
              >
                关闭并领取 ✨
              </button>
            </div>
            <p className="text-gray-300 mt-2 text-lg">
              {seasonName}终极奖励已解锁！
            </p>
          </div>

          <video
            ref={videoRef}
            src={DYNAMIC_WALLPAPER_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            className="w-full aspect-video object-contain bg-black"
          />

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <div className="flex items-center justify-center gap-8 text-white">
              <div className="text-center">
                <div className="text-5xl mb-2">🖼️</div>
                <p className="font-bold">{seasonName}壁纸</p>
              </div>
              <div className="w-px h-16 bg-yellow-400/50" />
              <div className="text-center">
                <div className="text-5xl mb-2">💻</div>
                <p className="font-bold">电脑壁纸</p>
              </div>
              <div className="w-px h-16 bg-yellow-400/50" />
              <div className="text-center">
                <div className="text-5xl mb-2">🎬</div>
                <p className="font-bold">动态壁纸</p>
              </div>
            </div>
          </div>

          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400" />
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-fall"
            style={{
              left: particle.left,
              top: `-20px`,
              animationDelay: particle.animationDelay,
              animationDuration: particle.animationDuration,
            }}
          >
            <span className="text-3xl">
              {particle.icon}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
      `}</style>
    </div>
  );
}
