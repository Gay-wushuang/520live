import { useEffect, useState } from 'react';
import { useGameStore, type GameReward } from '../stores/gameStore';

interface WallpaperRewardModalProps {
  reward: GameReward | null;
}

export default function WallpaperRewardModal({ reward }: WallpaperRewardModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { claimWallpaper, claimUltimateReward } = useGameStore();

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
      className={`fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-10 max-w-lg w-full mx-4 shadow-2xl border-2 transform transition-all duration-700 ${
          isUltimate
            ? 'border-yellow-400 shadow-yellow-400/30'
            : 'border-amber-500 shadow-amber-500/20'
        } ${isVisible ? 'scale-100 translate-y-0' : 'scale-50 translate-y-20'}`}
      >
        {isUltimate && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2">
            <div className="text-7xl animate-bounce">👑</div>
          </div>
        )}

        <div className="text-center relative z-10">
          <h2
            className={`text-4xl font-bold mb-4 ${
              isUltimate ? 'bg-gradient-to-r from-yellow-300 via-yellow-500 to-orange-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'
            } bg-clip-text text-transparent`}
          >
            {isUltimate ? '🎊 终极大奖！' : '🎁 壁纸奖励！'}
          </h2>

          <p className="text-gray-300 text-lg mb-3 font-medium">
            指针命中：<span className="text-yellow-300 font-bold">{reward.sourceCardLabel}</span>
          </p>
          <p className="text-gray-300 text-xl mb-8 font-medium">
            {isUltimate
              ? `再次集齐 ${reward.seasonName} 积分卡，终极奖励已解锁`
              : `集齐 2 张 ${reward.seasonName} 积分卡，获得 ${reward.wallpaperLabel}`
            }
          </p>

          <div className="space-y-6 mb-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl opacity-75 blur transition duration-300 group-hover:opacity-100" />
              <img
                src={reward.wallpaperImage}
                alt={reward.wallpaperLabel}
                className="relative rounded-2xl w-full h-64 object-cover border-4 border-white/30 shadow-2xl"
              />
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium border border-white/20">
                🖼️ {reward.wallpaperLabel}
              </div>
            </div>

            {reward.type === 'ultimate' && (
              <div className="relative group animate-pulse">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 rounded-2xl opacity-75 blur transition duration-300" />
                <img
                  src={reward.computerWallpaper}
                  alt="电脑壁纸"
                  className="relative rounded-2xl w-full h-64 object-cover border-4 border-yellow-400/50 shadow-2xl"
                />
                <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-1.5 rounded-full text-white text-sm font-bold shadow-lg">
                  💻 限定电脑壁纸
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (isUltimate) {
                claimUltimateReward();
              } else {
                claimWallpaper(reward.season);
              }
            }}
            className={`px-10 py-4 rounded-full font-bold text-xl transition-all duration-300 transform hover:scale-105 ${
              isUltimate
                ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-300 hover:to-red-400 text-white shadow-2xl hover:shadow-yellow-500/50'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-xl'
            }`}
          >
            {isUltimate ? '✨ 领取终极奖励' : '🎉 领取壁纸'}
          </button>

          {!isUltimate && (
            <p className="mt-4 text-gray-400 text-sm">
              领取后该季节积分卡会归零，再集齐 2 张可解锁终极奖励。
            </p>
          )}
        </div>

        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {[...Array(isUltimate ? 40 : 20)].map((_, index) => (
            <div
              key={index}
              className={`absolute rounded-full animate-ping ${
                isUltimate ? 'w-3 h-3 bg-yellow-400' : 'w-2 h-2 bg-amber-400'
              }`}
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
