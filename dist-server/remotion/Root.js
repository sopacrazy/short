import { jsx as _jsx } from "react/jsx-runtime";
import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';
const DEFAULT_FPS = 30;
const DEFAULT_DURATION = 45; // segundos
export const RemotionRoot = () => {
    return (_jsx(Composition, { id: "AstraShort", 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component: VideoComposition, durationInFrames: DEFAULT_DURATION * DEFAULT_FPS, fps: DEFAULT_FPS, width: 1080, height: 1920, defaultProps: {
            scenes: [],
            scriptLines: [],
            audioUrl: null,
            durationSeconds: DEFAULT_DURATION,
            endCardUrl: null,
            timestamps: null,
        }, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        calculateMetadata: ({ props }) => ({
            durationInFrames: Math.round((props.durationSeconds + (props.endCardUrl ? 5 : 0)) * DEFAULT_FPS),
        }) }));
};
