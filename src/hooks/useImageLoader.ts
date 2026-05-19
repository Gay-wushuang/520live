import { useCallback } from 'react';

export function useImageLoader() {
  const loadImages = useCallback(async (imagePaths: string[]): Promise<HTMLImageElement[]> => {
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    return Promise.all(imagePaths.map(loadImage));
  }, []);

  return { loadImages };
}
