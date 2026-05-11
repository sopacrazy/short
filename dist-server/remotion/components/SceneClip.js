import { jsx as _jsx } from "react/jsx-runtime";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
// 8 padrões de movimento — varia por índice de cena
const MOVEMENTS = [
    // 0: Zoom in centro — dramático
    (f, total) => ({
        scale: interpolate(f, [0, total], [1.05, 1.3], { extrapolateRight: 'clamp' }),
        x: 0, y: 0,
    }),
    // 1: Pan esquerda→direita + zoom leve
    (f, total) => ({
        scale: interpolate(f, [0, total], [1.15, 1.2], { extrapolateRight: 'clamp' }),
        x: interpolate(f, [0, total], [-4, 4], { extrapolateRight: 'clamp' }),
        y: 0,
    }),
    // 2: Pan direita→esquerda + zoom
    (f, total) => ({
        scale: interpolate(f, [0, total], [1.15, 1.2], { extrapolateRight: 'clamp' }),
        x: interpolate(f, [0, total], [4, -4], { extrapolateRight: 'clamp' }),
        y: 0,
    }),
    // 3: Zoom out + pan baixo→cima
    (f, total) => ({
        scale: interpolate(f, [0, total], [1.3, 1.05], { extrapolateRight: 'clamp' }),
        x: 0,
        y: interpolate(f, [0, total], [3, -3], { extrapolateRight: 'clamp' }),
    }),
    // 4: Pan diagonal — canto sup-esq → inf-dir
    (f, total) => ({
        scale: interpolate(f, [0, total], [1.1, 1.25], { extrapolateRight: 'clamp' }),
        x: interpolate(f, [0, total], [-3, 3], { extrapolateRight: 'clamp' }),
        y: interpolate(f, [0, total], [-3, 3], { extrapolateRight: 'clamp' }),
    }),
    // 5: Pan diagonal inversa — inf-dir → canto sup-esq
    (f, total) => ({
        scale: interpolate(f, [0, total], [1.2, 1.1], { extrapolateRight: 'clamp' }),
        x: interpolate(f, [0, total], [3, -3], { extrapolateRight: 'clamp' }),
        y: interpolate(f, [0, total], [3, -3], { extrapolateRight: 'clamp' }),
    }),
    // 6: Zoom in brusco top-center
    (f, total) => ({
        scale: interpolate(f, [0, total], [1.0, 1.35], { extrapolateRight: 'clamp' }),
        x: 0,
        y: interpolate(f, [0, total], [0, -4], { extrapolateRight: 'clamp' }),
    }),
    // 7: Zoom out + pan suave direita
    (f, total) => ({
        scale: interpolate(f, [0, total], [1.35, 1.05], { extrapolateRight: 'clamp' }),
        x: interpolate(f, [0, total], [0, 5], { extrapolateRight: 'clamp' }),
        y: 0,
    }),
];
export const SceneClip = ({ imageUrl, sceneIndex = 0, staticDisplay = false }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const opacity = interpolate(frame, [0, 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    if (staticDisplay) {
        return (_jsx(AbsoluteFill, { style: { opacity, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Img, { src: imageUrl, style: { width: '100%', height: '100%', objectFit: 'contain' } }) }));
    }
    const pattern = MOVEMENTS[sceneIndex % MOVEMENTS.length];
    const { scale, x, y } = pattern(frame, durationInFrames);
    return (_jsx(AbsoluteFill, { style: { overflow: 'hidden', opacity }, children: _jsx(AbsoluteFill, { style: {
                transform: `scale(${scale}) translate(${x}%, ${y}%)`,
                transformOrigin: 'center center',
            }, children: _jsx(Img, { src: imageUrl, style: { width: '100%', height: '100%', objectFit: 'cover' } }) }) }));
};
