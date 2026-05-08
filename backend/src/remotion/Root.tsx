import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';
import type { VideoCompositionProps } from './VideoComposition';

const DEFAULT_FPS = 30;
const DEFAULT_DURATION = 45; // segundos

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AstraShort"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={VideoComposition as React.ComponentType<any>}
      durationInFrames={DEFAULT_DURATION * DEFAULT_FPS}
      fps={DEFAULT_FPS}
      width={1080}
      height={1920}
      defaultProps={{
        scenes: [],
        scriptLines: [],
        audioUrl: null,
        durationSeconds: DEFAULT_DURATION,
        endCardUrl: null,
      } satisfies VideoCompositionProps}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calculateMetadata={({ props }: any) => ({
        durationInFrames: Math.round(
          ((props as VideoCompositionProps).durationSeconds + ((props as VideoCompositionProps).endCardUrl ? 5 : 0)) * DEFAULT_FPS
        ),
      })}
    />
  );
};
