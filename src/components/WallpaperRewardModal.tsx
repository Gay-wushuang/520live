import { useEffect, useMemo, useState } from 'react';
import { useGameStore, type GameReward } from '../stores/gameStore';

interface WallpaperRewardModalProps {
  reward: GameReward | null;
}

export default function WallpaperRewardModal({ reward }: WallpaperRewardModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { claimWallpaper, claimUltimateReward } = useGameStore();
  const rewardLights = useMemo(
    () =>
      reward
        ? Array.from({ length: reward.type === 'ultimate' ? 46 : 24 }, (_, index) => ({
            id: index,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            size: 2 + Math.random() * 4,
            delay: `${Math.random() * 2.4}s`,
            duration: `${2.8 + Math.random() * 2.6}s`,
          }))
        : [],
    [reward]
  );

  useEffect(() => {
    let timer: number | undefined;

    if (reward) {
      timer = window.setTimeout(() => setIsVisible(true), 100);
    } else {
      setIsVisible(false);
    }

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [reward]);

  if (!reward) return null;

  const isUltimate = reward.type === 'ultimate';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#090714]/[0.88] p-4 backdrop-blur-md transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(251,191,36,0.24),transparent_34%),radial-gradient(circle_at_18%_82%,rgba(244,114,182,0.18),transparent_36%),radial-gradient(circle_at_82%_78%,rgba(125,211,252,0.16),transparent_32%)]" />
      <div className="absolute left-1/2 top-1/2 h-[120vh] w-16 -translate-x-1/2 -translate-y-1/2 rotate-[21deg] bg-gradient-to-b from-transparent via-amber-100/[0.16] to-transparent blur-xl" />
      <div className="absolute left-1/2 top-1/2 h-[120vh] w-16 -translate-x-1/2 -translate-y-1/2 rotate-[-28deg] bg-gradient-to-b from-transparent via-pink-100/[0.14] to-transparent blur-xl" />

      <div
        className={`relative w-full max-w-3xl overflow-hidden rounded-[32px] border bg-black/[0.62] shadow-2xl backdrop-blur-xl transition-all duration-700 ${
          isUltimate ? 'border-amber-200/50 shadow-amber-300/20' : 'border-rose-200/[0.35] shadow-rose-300/15'
        } ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}
      >
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.12] to-transparent" />
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-52 w-52 rounded-full bg-fuchsia-300/[0.18] blur-3xl" />

        <div className="relative z-10 p-6 text-center md:p-8">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-amber-200">
              {isUltimate ? 'Ultimate Reward' : 'Wallpaper Reward'}
            </p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
              {isUltimate ? '终极大奖已解锁' : '壁纸奖励已解锁'}
            </h2>
            <p className="mt-3 text-sm font-bold text-slate-300">
              指针命中：<span className="text-amber-200">{reward.sourceCardLabel}</span>
            </p>
            <p className="mt-2 text-base font-bold text-slate-200">
              {isUltimate
                ? `再次集齐 ${reward.seasonName} 积分卡，进入终极奖励阶段`
                : `集齐 2 张 ${reward.seasonName} 积分卡，获得 ${reward.wallpaperLabel}`}
            </p>
          </div>

          <div className={`mb-7 grid gap-4 ${isUltimate ? 'md:grid-cols-2' : ''}`}>
            <div className="group relative overflow-hidden rounded-3xl border border-white/[0.18] bg-white/[0.08] p-2 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-200/[0.12] via-transparent to-sky-200/[0.12] opacity-80" />
              <img
                src={reward.wallpaperImage}
                alt={reward.wallpaperLabel}
                className="relative h-60 w-full rounded-2xl object-cover shadow-[0_18px_48px_rgba(0,0,0,0.28)] md:h-72"
              />
              <div className="absolute bottom-5 left-5 rounded-full border border-white/[0.18] bg-black/[0.62] px-4 py-1.5 text-sm font-black text-white backdrop-blur">
                {reward.wallpaperLabel}
              </div>
            </div>

            {reward.type === 'ultimate' && (
              <div className="group relative overflow-hidden rounded-3xl border border-amber-200/[0.35] bg-amber-100/[0.08] p-2 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-200/[0.18] via-transparent to-fuchsia-200/[0.14] opacity-90" />
                <img
                  src={reward.computerWallpaper}
                  alt="夏秋双面折扇"
                  className="relative h-60 w-full rounded-2xl object-cover shadow-[0_18px_48px_rgba(0,0,0,0.28)] md:h-72"
                />
                <div className="absolute bottom-5 left-5 rounded-full border border-amber-100/30 bg-black/[0.62] px-4 py-1.5 text-sm font-black text-amber-100 backdrop-blur">
                  夏秋双面折扇
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (isUltimate) {
                claimUltimateReward();
              } else {
                claimWallpaper(reward.season);
              }
            }}
            className={`rounded-full px-10 py-4 text-xl font-black transition duration-300 hover:brightness-110 ${
              isUltimate
                ? 'bg-gradient-to-r from-amber-300 via-rose-300 to-sky-300 text-slate-950 shadow-2xl shadow-amber-300/20'
                : 'bg-gradient-to-r from-rose-300 via-amber-300 to-sky-300 text-slate-950 shadow-xl shadow-rose-300/20'
            }`}
          >
            {isUltimate ? '领取终极奖励' : '领取壁纸'}
          </button>

          {!isUltimate && (
            <p className="mt-4 text-sm font-bold text-slate-400">
              领取后该季节积分卡会归零，再集齐 2 张可解锁终极奖励。
            </p>
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
          {rewardLights.map((light) => (
            <span
              key={light.id}
              className="reward-light absolute rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.9)]"
              style={{
                top: light.top,
                left: light.left,
                width: `${light.size}px`,
                height: `${light.size}px`,
                animationDelay: light.delay,
                animationDuration: light.duration,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes rewardLightFloat {
          0% {
            transform: translate3d(0, 16px, 0) scale(0.65);
            opacity: 0.25;
          }
          50% {
            opacity: 0.95;
          }
          100% {
            transform: translate3d(16px, -76px, 0) scale(1);
            opacity: 0.12;
          }
        }
        .reward-light {
          animation: rewardLightFloat ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
}
