import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export interface WordAlignment {
  word: string;
  startMs: number;
  endMs: number;
}

export interface Chunk {
  text: string;
  words: WordAlignment[];
  startMs: number;
  endMs: number;
}

interface DynamicCaptionProps {
  chunk: Chunk;
  chunkStartFrame: number;
}

export const DynamicCaption: React.FC<DynamicCaptionProps> = ({ chunk, chunkStartFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Calculate current time relative to the beginning of the video
  const currentMs = ((frame + chunkStartFrame) / fps) * 1000;

  const translateY = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 160, mass: 0.8 },
    from: 24,
    to: 0,
    durationInFrames: 14,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 480,
        paddingLeft: 50,
        paddingRight: 50,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: '88%',
        }}
      >
        {chunk.words.map((w, i) => {
          const wStart = w.startMs ?? 0;
          const wEnd = w.endMs ?? wStart + 100;
          
          // Word is active if the current time is within its start/end times
          // Add a small buffer (e.g. 50ms) to make it look slightly smoother
          const isActive = currentMs >= wStart - 50 && currentMs <= wEnd + 100;
          const isSpoken = currentMs > wEnd + 100;

          const color = isActive ? '#FFE600' : isSpoken ? '#E0E0E0' : '#FFFFFF';
          const textShadow = isActive
            ? '0 0 16px rgba(255,230,0,0.6), 0 2px 8px rgba(0,0,0,1)'
            : '0 2px 8px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,0.9)';
          const scale = isActive ? 1.05 : 1;
          const wordOpacity = isActive ? 1 : isSpoken ? 0.7 : 0.45;

          return (
            <span
              key={i}
              style={{
                fontFamily: '"Outfit", "Arial Black", sans-serif',
                fontWeight: 900,
                fontSize: 54,
                textTransform: 'uppercase',
                fontStyle: 'italic',
                letterSpacing: '0.5px',
                color,
                WebkitTextStroke: '1.5px rgba(0,0,0,0.9)',
                textShadow,
                marginRight: 16,
                display: 'inline-block',
                transform: `scale(${scale})`,
                transformOrigin: 'center bottom',
                opacity: wordOpacity,
                transition: 'all 0.1s ease',
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
