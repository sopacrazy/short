import React from 'react';
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion';
import { SceneClip } from './components/SceneClip';

export interface SceneData {
  imageUrl: string;
  description: string;
  durationSeconds: number;
}

export interface VideoCompositionProps {
  scenes: SceneData[];
  scriptLines: string[];
  audioUrl: string | null;
  durationSeconds: number;
  endCardUrl?: string | null;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  scenes,
  audioUrl,
  endCardUrl,
}) => {
  const { fps } = useVideoConfig();

  const END_CARD_SECONDS = 5;

  const sceneFrames = scenes.map((s) => Math.round(s.durationSeconds * fps));
  const totalSceneFrames = sceneFrames.reduce((a, b) => a + b, 0);
  const endCardFrames = endCardUrl ? END_CARD_SECONDS * fps : 0;

  let offset = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {audioUrl && <Audio src={audioUrl} startFrom={0} volume={1} />}

      {/* Cenas regulares */}
      {scenes.map((scene, i) => {
        const from = offset;
        const duration = sceneFrames[i] ?? Math.round(scene.durationSeconds * fps);
        offset += duration;
        return (
          <Sequence key={i} from={from} durationInFrames={duration}>
            <SceneClip imageUrl={scene.imageUrl} sceneIndex={i} />
          </Sequence>
        );
      })}

      {/* End card */}
      {endCardUrl && (
        <Sequence from={totalSceneFrames} durationInFrames={endCardFrames}>
          <SceneClip imageUrl={endCardUrl} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
