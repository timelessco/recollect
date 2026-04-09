"use client";

import { Player } from "@remotion/player";

import { RecollectShowcase2 } from "../compositions/RecollectShowcase2";

const WIDTH = 350;
const HEIGHT = 390;
const FPS = 60;
const DURATION_IN_FRAMES = 900;

interface RecollectShowcase2PlayerProps {
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
}

export function RecollectShowcase2Player({
  autoPlay = true,
  controls = false,
  loop = true,
}: RecollectShowcase2PlayerProps) {
  return (
    <Player
      acknowledgeRemotionLicense
      autoPlay={autoPlay}
      component={RecollectShowcase2}
      compositionHeight={HEIGHT}
      compositionWidth={WIDTH}
      controls={controls}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      loop={loop}
      renderLoading={() => null}
      style={{ width: WIDTH, height: HEIGHT }}
    />
  );
}

// Default export so Next.js `dynamic()` can import it with ssr:false.
export default RecollectShowcase2Player;
