import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import CardWheelRenderer from '../components/CardWheelRenderer';
import ResultModal from '../components/ResultModal';
import CollectionStatus from '../components/CollectionStatus';
import WallpaperRewardModal from '../components/WallpaperRewardModal';
import VideoRewardPlayer from '../components/VideoRewardPlayer';
import { useSpinController } from '../hooks/useSpinController';
import { useImageLoader } from '../hooks/useImageLoader';
import { getSeasonByIndex, SEASON_LIST } from '../data/seasons';
import { useGameStore } from '../stores/gameStore';
import type { RewardResult } from '../stores/gameStore';
import type { SpinResult, WheelConfig } from '../types/wheel';

const CARD_IMAGES = SEASON_LIST.map((season) => season.cardImage);
const CARD_LABELS = SEASON_LIST.map((season) => season.name);

const cardWheelConfig: WheelConfig = {
  images: CARD_IMAGES,
  labels: CARD_LABELS,
  segments: SEASON_LIST.length,
  size: 500,
};

export default function CardWheelPage() {
  const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastOutcome, setLastOutcome] = useState<RewardResult | null>(null);
  const { loadImages } = useImageLoader();
  const { addCard, pendingReward, showVideoReward, resetGame, getSeasonFromIndex } = useGameStore();

  const handleSpinComplete = useCallback((result: SpinResult) => {
    if (Number.isInteger(result.winningIndex)) {
      const season = getSeasonFromIndex(result.winningIndex);
      const rewardResult = addCard(season);
      setLastOutcome(rewardResult);

      if (import.meta.env.DEV) {
        console.log('积分卡指针命中:', rewardResult.cardLabel, rewardResult);
      }
    }
  }, [addCard, getSeasonFromIndex]);

  const { isSpinning, currentRotation, result, startSpin, reset: resetWheel, clearResult } = useSpinController({
    images: CARD_IMAGES,
    onSpinComplete: handleSpinComplete,
  });
  const resultSeason = result ? getSeasonByIndex(result.winningIndex) : null;

  useEffect(() => {
    const initImages = async () => {
      try {
        const images = await loadImages(CARD_IMAGES);
        setLoadedImages(images);
        setIsLoading(false);
      } catch (error) {
        console.error('图片加载失败:', error);
        setIsLoading(false);
      }
    };
    initImages();
  }, [loadImages]);

  const handleReset = useCallback(() => {
    resetWheel();
    resetGame();
    setLastOutcome(null);
  }, [resetWheel, resetGame]);

  const resultDescription = lastOutcome
    ? lastOutcome.isMatch
      ? lastOutcome.isUltimate
        ? '再次集齐 2 张，已解锁终极奖励'
        : '集齐 2 张，已解锁对应壁纸'
      : `当前 ${lastOutcome.currentCount}/2，距离${lastOutcome.goal === 'wallpaper' ? '壁纸' : '终极奖励'}还差 ${lastOutcome.remaining} 张`
    : null;

  return (
    <div className="cute-font min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed_0%,#fdf2f8_42%,#eef6ff_100%)] flex flex-col items-center justify-center p-4 relative overflow-hidden text-amber-950">
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage: `linear-gradient(rgba(251, 191, 36, 0.18) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(244, 114, 182, 0.14) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 w-full max-w-6xl">
        <div className="text-center mb-5">
          <div className="mb-4 flex justify-center">
            <Link
              to="/"
              className="rounded-full border border-amber-200 bg-white/80 px-5 py-2 text-sm font-bold text-amber-800 shadow-sm transition hover:bg-white"
            >
              ← 返回棋盘首页
            </Link>
          </div>
          <h1
            className="text-4xl font-black mb-2 bg-gradient-to-r from-amber-600 via-rose-500 to-violet-500 bg-clip-text text-transparent md:text-5xl"
          >
            积分卡转盘
          </h1>
          <p className="text-sm font-bold text-amber-700/75">红色指针停在哪一格，就记录对应季节积分卡</p>
        </div>

        <div className="relative mx-auto mb-6 flex max-w-3xl justify-center rounded-[36px] border border-white/80 bg-white/70 px-4 py-8 shadow-[0_22px_50px_rgba(180,83,9,0.14)] backdrop-blur">
          <div className="absolute inset-x-12 top-10 h-64 rounded-full bg-gradient-to-br from-amber-200/30 via-pink-200/25 to-sky-200/30 blur-3xl" />

          {resultSeason && (
            <div className="absolute left-1/2 top-3 z-30 max-w-[92%] -translate-x-1/2 rounded-full bg-white/95 px-5 py-2 text-sm font-bold text-amber-800 border border-amber-200 shadow-lg">
              指针命中：{resultSeason.cardLabel}
              {resultDescription && <span className="ml-2 text-amber-600">· {resultDescription}</span>}
            </div>
          )}

          {isLoading ? (
            <div className="w-[500px] h-[500px] flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-full border-4 border-dashed border-amber-400 shadow-xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-500 mx-auto mb-4" />
                <p className="text-gray-700 font-medium">加载积分卡...</p>
              </div>
            </div>
          ) : (
            <CardWheelRenderer config={cardWheelConfig} images={loadedImages} rotation={currentRotation} />
          )}

          {!isLoading && (
            <div className="absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-7 pointer-events-none">
              <svg
                width="40"
                height="92"
                viewBox="0 0 40 92"
                aria-hidden="true"
                className="drop-shadow-[0_8px_14px_rgba(185,28,28,0.45)]"
              >
                <path
                  d="M20 90 L10 30 C8 17 11 8 20 3 C29 8 32 17 30 30 Z"
                  fill="#dc2626"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 82 L14 31 C13 22 15 15 20 10 C25 15 27 22 26 31 Z"
                  fill="#f87171"
                  opacity="0.85"
                />
                <circle cx="20" cy="24" r="5" fill="#7f1d1d" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-6">
          <button
            onClick={startSpin}
            disabled={isSpinning || isLoading}
            className={`px-10 py-3 rounded-full font-bold text-lg transition-all duration-300 transform relative overflow-hidden group ${
              isSpinning || isLoading
                ? 'bg-gray-200 cursor-not-allowed opacity-60 text-gray-500'
                : 'bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 hover:from-amber-300 hover:via-rose-300 hover:to-violet-300 hover:scale-105 shadow-xl hover:shadow-rose-300/40'
            }`}
          >
            <span className="relative z-10 text-white drop-shadow-md font-bold tracking-wide">
              {isSpinning ? '抽取中...' : '抽取积分卡'}
            </span>
            {!isSpinning && !isLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            )}
          </button>

          <button
            onClick={handleReset}
            disabled={isSpinning}
            className={`px-7 py-3 rounded-full font-bold text-lg transition-all duration-300 ${
              isSpinning
                ? 'bg-gray-200 cursor-not-allowed opacity-60 text-gray-500'
                : 'bg-white/90 hover:bg-white text-amber-700 hover:text-amber-800 border border-amber-200 hover:border-amber-300 shadow-md hover:shadow-lg'
            }`}
          >
            重置游戏
          </button>
        </div>

        <CollectionStatus />

        {result && resultSeason && !pendingReward && !showVideoReward && (
          <ResultModal
            result={result}
            images={loadedImages}
            title={`指针命中：${resultSeason.cardLabel}`}
            description={
              <>
                {resultDescription ?? '本次积分卡已记录'}
              </>
            }
            imageAlt={resultSeason.cardLabel}
            onClose={clearResult}
          />
        )}

        {pendingReward && !showVideoReward && (
          <WallpaperRewardModal reward={pendingReward} />
        )}

        <VideoRewardPlayer />

      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-amber-800/60 text-sm font-medium">
        季节积分卡收集 · 壁纸和终极奖励共用同一进度
      </div>
    </div>
  );
}
