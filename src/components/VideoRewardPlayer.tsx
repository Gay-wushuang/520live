import { useEffect, useMemo, useRef, useState } from 'react';
import { DYNAMIC_WALLPAPER_VIDEO } from '../data/seasons';
import { useGameStore } from '../stores/gameStore';

type Particle = {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  opacity: number;
};

const ULTIMATE_REWARD_LABELS = ['3个Q版3D模型', '电脑静态壁纸', 'Wallpaper动态壁纸'];

export default function VideoRewardPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { showVideoReward, claimUltimateReward, pendingReward } = useGameStore();
  const particles = useMemo<Particle[]>(
    () =>
      showVideoReward
        ? Array.from({ length: 84 }, (_, index) => ({
            id: index,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            size: 2 + Math.random() * 5,
            delay: `${Math.random() * 3.5}s`,
            duration: `${3.5 + Math.random() * 4}s`,
            opacity: 0.35 + Math.random() * 0.55,
          }))
        : [],
    [showVideoReward]
  );

  useEffect(() => {
    let timer: number | undefined;

    if (showVideoReward) {
      setIsVisible(true);
      timer = window.setTimeout(() => {
        const playPromise = videoRef.current?.play();

        if (playPromise) {
          playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#070712]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(250,204,21,0.18),transparent_34%),radial-gradient(circle_at_18%_82%,rgba(168,85,247,0.18),transparent_36%),radial-gradient(circle_at_84%_74%,rgba(56,189,248,0.16),transparent_34%)]" />
      <div className="absolute left-1/2 top-1/2 h-[150vh] w-24 -translate-x-1/2 -translate-y-1/2 rotate-[18deg] bg-gradient-to-b from-transparent via-amber-200/[0.18] to-transparent blur-xl" />
      <div className="absolute left-1/2 top-1/2 h-[150vh] w-24 -translate-x-1/2 -translate-y-1/2 rotate-[-24deg] bg-gradient-to-b from-transparent via-sky-200/[0.14] to-transparent blur-xl" />
      <div className="ultimate-ring absolute left-1/2 top-1/2 h-[68vmin] w-[68vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/[0.18]" />
      <div className="ultimate-ring ultimate-ring-delay absolute left-1/2 top-1/2 h-[84vmin] w-[84vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-200/[0.12]" />
      <div className="ultimate-stage-line absolute left-[8%] right-[8%] top-[18%] h-px bg-gradient-to-r from-transparent via-amber-100/70 to-transparent" />
      <div className="ultimate-stage-line ultimate-stage-line-delay absolute bottom-[16%] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-sky-100/60 to-transparent" />

      <div className="absolute inset-0 pointer-events-none">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="absolute rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.95)] ultimate-particle"
            style={{
              left: particle.left,
              top: particle.top,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      <div
        className={`relative mx-4 w-full max-w-5xl transition-all duration-1000 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="absolute -inset-8 rounded-[42px] bg-[conic-gradient(from_0deg,rgba(251,191,36,0.22),rgba(244,114,182,0.25),rgba(56,189,248,0.22),rgba(251,191,36,0.22))] blur-2xl ultimate-aura" />
        <div className="absolute -inset-1 rounded-[34px] bg-[conic-gradient(from_90deg,rgba(252,211,77,0.85),rgba(244,114,182,0.68),rgba(125,211,252,0.78),rgba(252,211,77,0.85))] ultimate-border" />

        <div className="relative overflow-hidden rounded-[32px] border border-white/20 bg-black/70 shadow-2xl shadow-amber-300/20 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-amber-200/[0.18] to-transparent" />
            <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-sky-200/[0.18] to-transparent" />
            <div className="absolute left-6 top-6 h-12 w-12 border-l-2 border-t-2 border-amber-100/70" />
            <div className="absolute right-6 top-6 h-12 w-12 border-r-2 border-t-2 border-sky-100/70" />
            <div className="absolute bottom-6 left-6 h-12 w-12 border-b-2 border-l-2 border-fuchsia-100/60" />
            <div className="absolute bottom-6 right-6 h-12 w-12 border-b-2 border-r-2 border-amber-100/70" />
          </div>

          <div className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-gradient-to-b from-black/[0.85] to-black/10 px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="cute-font">
                <p className="text-xs font-black uppercase tracking-[0.32em] text-amber-200">Ultimate Reward</p>
                <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">终极大奖已解锁</h2>
                <p className="mt-1 text-sm font-bold text-slate-300">{seasonName}积分卡完成二阶段收集</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full border border-amber-200/60 bg-amber-200 px-6 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-300/20 transition hover:bg-white"
              >
                关闭并领取
              </button>
            </div>
          </div>

          <div className="relative">
            <video
              ref={videoRef}
              src={DYNAMIC_WALLPAPER_VIDEO}
              autoPlay
              loop
              muted
              playsInline
              className="w-full bg-black object-contain"
              style={{ aspectRatio: '16 / 9' }}
            />

            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.10)_42%,transparent_58%)] ultimate-scan" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,transparent_52%,rgba(0,0,0,0.55)_100%)]" />
            <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 w-[min(720px,86%)] -translate-x-1/2 rounded-2xl border border-white/[0.14] bg-black/[0.45] px-5 py-3 text-center text-white shadow-2xl backdrop-blur-md">
              <p className="cute-font text-xs font-black uppercase tracking-[0.36em] text-amber-200">Reward Package</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm font-black">
                {ULTIMATE_REWARD_LABELS.map((label) => (
                  <span key={label} className="rounded-lg bg-white/10 px-2 py-2">
                    {label}
                  </span>
                ))}
              </div>
            </div>
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="h-16 w-16 rounded-full border-4 border-white/20 border-t-amber-200 animate-spin" />
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes ultimateAura {
          0% {
            transform: rotate(0deg) scale(1);
          }
          100% {
            transform: rotate(360deg) scale(1.04);
          }
        }
        @keyframes ultimateBorder {
          0% {
            filter: hue-rotate(0deg) brightness(1);
          }
          50% {
            filter: hue-rotate(24deg) brightness(1.24);
          }
          100% {
            filter: hue-rotate(0deg) brightness(1);
          }
        }
        @keyframes ultimateFloat {
          0% {
            transform: translate3d(0, 20px, 0) scale(0.65);
          }
          45% {
            transform: translate3d(18px, -40px, 0) scale(1);
          }
          100% {
            transform: translate3d(-14px, -110px, 0) scale(0.72);
          }
        }
        @keyframes ultimateScan {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(120%);
          }
        }
        @keyframes ultimateRing {
          0% {
            transform: translate(-50%, -50%) scale(0.88);
            opacity: 0.1;
          }
          45% {
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.14);
            opacity: 0.02;
          }
        }
        @keyframes ultimateStageLine {
          0% {
            transform: scaleX(0.12);
            opacity: 0.12;
          }
          50% {
            transform: scaleX(1);
            opacity: 0.85;
          }
          100% {
            transform: scaleX(0.2);
            opacity: 0.12;
          }
        }
        .ultimate-aura {
          animation: ultimateAura 12s linear infinite;
        }
        .ultimate-border {
          animation: ultimateBorder 3.8s ease-in-out infinite;
        }
        .ultimate-particle {
          animation: ultimateFloat ease-in-out infinite alternate;
        }
        .ultimate-scan {
          animation: ultimateScan 5.5s ease-in-out infinite;
        }
        .ultimate-ring {
          animation: ultimateRing 4.6s ease-out infinite;
        }
        .ultimate-ring-delay {
          animation-delay: 1.8s;
        }
        .ultimate-stage-line {
          transform-origin: center;
          animation: ultimateStageLine 3.2s ease-in-out infinite;
        }
        .ultimate-stage-line-delay {
          animation-delay: 1.2s;
        }
      `}</style>
    </div>
  );
}
