import React from "react";
import { Composition } from "remotion";
import { Reel } from "./reel/Reel";
import { DUR_F, FPS, WIDTH, HEIGHT } from "./reel/tokens";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={DUR_F}
    defaultProps={{ debugSafe: false }}
  />
);
