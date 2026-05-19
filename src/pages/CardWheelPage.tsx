import { useState, useEffect, useCallback } from 'react';
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
        console.log('🃏 积分卡指针命中:', rewardResult.cardLabel, rewardResult);
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #D4AF37 0px, #D4AF37 1px, transparent 1px, transparent 20px),
                           repeating-linear-gradient(-45deg, #FFD700 0px, #FFD700 1px, transparent 1px, transparent 20px)`,
        }}
      />

      <div className="relative z-10 w-full max-w-5xl">
        <div className="text-center mb-8">
          <h1
            className="text-6xl font-bold mb-3 bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 bg-clip-text text-transparent"
            style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
          >
            🃏 积分卡转盘
          </h1>
          <p className="text-gray-600 text-lg font-medium">红色指针停在哪一格，就记录对应季节积分卡</p>
        </div>

        <CollectionStatus />

        <div className="flex justify-center my-8 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-200/30 via-orange-200/30 to-yellow-200/30 rounded-full blur-3xl" />

          {resultSeason && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 rounded-full bg-white/95 px-5 py-2 text-sm font-bold text-amber-800 border border-amber-300 shadow-xl">
              指针命中：{resultSeason.emoji} {resultSeason.cardLabel}
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

        <div className="flex gap-4 justify-center mb-6">
          <button
            onClick={startSpin}
            disabled={isSpinning || isLoading}
            className={`px-12 py-4 rounded-full font-bold text-xl transition-all duration-300 transform relative overflow-hidden group ${
              isSpinning || isLoading
                ? 'bg-gray-300 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:via-orange-400 hover:to-yellow-400 hover:scale-110 shadow-2xl hover:shadow-amber-500/40'
            }`}
          >
            <span className="relative z-10 text-white drop-shadow-md font-bold tracking-wide">
              {isSpinning ? '🎴 抽取中...' : '✨ 抽取积分卡'}
            </span>
            {!isSpinning && !isLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            )}
          </button>

          <button
            onClick={handleReset}
            disabled={isSpinning}
            className={`px-8 py-4 rounded-full font-bold text-xl transition-all duration-300 ${
              isSpinning
                ? 'bg-gray-300 cursor-not-allowed opacity-50'
                : 'bg-white hover:bg-gray-50 text-amber-700 hover:text-amber-800 font-semibold border-3 border-amber-300 hover:border-amber-400 shadow-lg hover:shadow-xl'
            }`}
            style={{ borderWidth: '3px' }}
          >
            🔄 重置游戏
          </button>
        </div>

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
