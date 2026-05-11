import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion';
import { SceneClip } from './components/SceneClip';
import { DynamicCaption } from './components/DynamicCaption';
function parseTimestampsToChunks(timestamps) {
    if (!timestamps || !Array.isArray(timestamps.characters)) {
        console.warn('[Remotion] Timestamps missing or characters not an array');
        return [];
    }
    const characters = timestamps.characters;
    const startTimes = timestamps.character_start_times_seconds || [];
    const endTimes = timestamps.character_end_times_seconds || [];
    const words = [];
    let currentWord = '';
    let currentStart = 0;
    for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        const start = (startTimes[i] ?? 0) * 1000;
        const end = (endTimes[i] ?? 0) * 1000;
        if (currentWord === '') {
            currentStart = start;
        }
        if (char === ' ' || char === '\n') {
            if (currentWord.trim() !== '') {
                words.push({ word: currentWord, startMs: currentStart, endMs: end });
            }
            currentWord = '';
        }
        else {
            currentWord += char;
        }
    }
    if (currentWord.trim() !== '') {
        const end = (endTimes[characters.length - 1] ?? 0) * 1000;
        words.push({ word: currentWord, startMs: currentStart, endMs: end });
    }
    // Group into chunks of ~4 words
    const chunks = [];
    let currentChunkWords = [];
    for (const w of words) {
        currentChunkWords.push(w);
        const endsSentence = w.word.endsWith('.') || w.word.endsWith(',') || w.word.endsWith('?') || w.word.endsWith('!');
        if (currentChunkWords.length >= 4 || endsSentence) {
            if (currentChunkWords.length > 0) {
                const firstWord = currentChunkWords[0];
                const lastWord = currentChunkWords[currentChunkWords.length - 1];
                chunks.push({
                    text: currentChunkWords.map(x => x.word).join(' '),
                    words: [...currentChunkWords],
                    startMs: firstWord.startMs,
                    endMs: lastWord.endMs
                });
            }
            currentChunkWords = [];
        }
    }
    if (currentChunkWords.length > 0) {
        const firstWord = currentChunkWords[0];
        const lastWord = currentChunkWords[currentChunkWords.length - 1];
        chunks.push({
            text: currentChunkWords.map(x => x.word).join(' '),
            words: [...currentChunkWords],
            startMs: firstWord.startMs,
            endMs: lastWord.endMs
        });
    }
    return chunks;
}
export const VideoComposition = ({ scenes, audioUrl, backgroundMusicUrl, musicVolume = 0.15, endCardUrl, timestamps }) => {
    const { fps } = useVideoConfig();
    const END_CARD_SECONDS = 5;
    const sceneFrames = scenes.map((s) => Math.round(s.durationSeconds * fps));
    const totalSceneFrames = sceneFrames.reduce((a, b) => a + b, 0);
    const endCardFrames = endCardUrl ? END_CARD_SECONDS * fps : 0;
    const chunks = useMemo(() => parseTimestampsToChunks(timestamps), [timestamps]);
    let offset = 0;
    return (_jsxs(AbsoluteFill, { style: { backgroundColor: '#000' }, children: [audioUrl && _jsx(Audio, { src: audioUrl, startFrom: 0, volume: 1 }), backgroundMusicUrl && (_jsx(Audio, { src: backgroundMusicUrl, volume: musicVolume })), scenes.map((scene, i) => {
                const from = offset;
                const duration = sceneFrames[i] ?? Math.round(scene.durationSeconds * fps);
                offset += duration;
                return (_jsx(Sequence, { from: from, durationInFrames: duration, children: _jsx(SceneClip, { imageUrl: scene.imageUrl, sceneIndex: i }) }, i));
            }), endCardUrl && (_jsx(Sequence, { from: totalSceneFrames, durationInFrames: endCardFrames, children: _jsx(SceneClip, { imageUrl: endCardUrl, staticDisplay: true }) })), chunks.map((chunk, i) => {
                const startMs = chunk.startMs ?? 0;
                const endMs = chunk.endMs ?? startMs + 100;
                const fromFrame = Math.max(0, Math.round((startMs / 1000) * fps));
                const nextChunk = chunks[i + 1];
                // O bloco dura até o próximo começar ou um pouco depois do seu fim
                const nextStartMs = nextChunk ? (nextChunk.startMs ?? endMs) : (endMs + 500);
                const toFrame = Math.round((nextStartMs / 1000) * fps);
                const durationInFrames = Math.max(1, toFrame - fromFrame);
                // Segurança adicional para evitar sobreposição ou frames negativos
                if (durationInFrames <= 0 || isNaN(fromFrame))
                    return null;
                return (_jsx(Sequence, { from: fromFrame, durationInFrames: durationInFrames, children: _jsx(DynamicCaption, { chunk: chunk, chunkStartFrame: fromFrame }) }, `caption-${i}`));
            })] }));
};
