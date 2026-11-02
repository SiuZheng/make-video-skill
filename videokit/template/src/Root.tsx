import React from 'react';
import {Composition} from 'remotion';
import {DURATION_FRAMES, FPS, H, W} from './lib';
import {ShortVideo} from './shorts/Short';
import {SH, SHORTS, SW} from './shorts/kit';
import {Thumbnail} from './Thumbnail';
import {Main} from './Video';
import {GpuProbe} from './GpuProbe';

// Main: the video itself (1920x1080, or 1080x1920 for a video that is a Short). Short-<id>: Shorts cut
// from it (scripts/build.py -> src/shorts/shorts.json). Thumbnail: one frame, 1280x720 when rendered.
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={DURATION_FRAMES} fps={FPS} width={W} height={H} />
    {Object.entries(SHORTS).map(([id, d]) => (
      <Composition key={id} id={`Short-${id}`} component={ShortVideo} defaultProps={{id}} durationInFrames={Math.round(d.duration * FPS)} fps={FPS} width={SW} height={SH} />
    ))}
    <Composition id="Thumbnail" component={Thumbnail} durationInFrames={1} fps={FPS} width={1920} height={1080} />
    {/* vk.py gpu renders this to see which graphics device Chrome draws with */}
    <Composition id="GpuProbe" component={GpuProbe} durationInFrames={1} fps={FPS} width={640} height={360} />
  </>
);
