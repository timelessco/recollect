import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import type { BookmarkStatus } from "../components/bookmark-card";
import type { SavePhase } from "../components/save-view";
import type { SyncStatus } from "../components/sync-button";

import { MainView, PopupShell } from "../components/popup-overlay";
import { SafariFrame } from "../components/safari-frame";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * 3 segments squeezed to 900 frames @ 60fps (15s)
 *
 * Segment 1 — Save (0–300):
 *   0–27:    Icon click
 *   27–138:  Saving + progress bar
 *   138–222: Saved to Recollect
 *   222–258: Morph transition
 *   258–300: MainView idle
 *
 * Segment 2 — Twitter sync (300–600):
 *   300–322: Twitter hover + press
 *   322–462: Twitter syncing 0→228
 *   462–522: Twitter done
 *   522–600: Twitter resets to idle
 *
 * Segment 3 — Instagram sync (600–900):
 *   600–622: Instagram hover + press
 *   622–780: Instagram syncing 0→47
 *   780–900: Instagram done
 */

const ShowcaseContent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Panel entrance ---
  const panelProgress = spring({
    frame: frame - 27,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const panelOpacity = interpolate(frame, [27, 54], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const panelTranslateY = interpolate(panelProgress, [0, 1], [-12, 0]);
  const panelScaleVal = interpolate(panelProgress, [0, 1], [0.97, 1]);

  // --- State derivation from frame ---
  let savePhase: SavePhase | null = null;
  let saveProgress = 0;
  const bookmarkStatus: BookmarkStatus = "not-saved";
  let twitterStatus: SyncStatus = "idle";
  let twitterCount = 0;
  let instagramStatus: SyncStatus = "idle";
  let instagramCount = 0;
  let twitterPressScale: number | undefined;
  let instagramPressScale: number | undefined;
  let containerHeight: number | undefined;
  let morphProgress: number | undefined;

  // ── Segment 1: Save (0–300) ──

  if (frame >= 27 && frame < 138) {
    savePhase = "saving";
    const t = Math.min((frame - 27) / 111, 1);
    saveProgress = easeOutCubic(t) * 100;
  } else if (frame >= 138 && frame < 222) {
    savePhase = "success";
    saveProgress = 100;
  } else if (frame >= 222 && frame < 258) {
    const morphSpring = spring({
      frame: frame - 222,
      fps,
      config: { damping: 20, stiffness: 220, mass: 1 },
    });
    containerHeight = interpolate(morphSpring, [0, 1], [76, 250]);
    morphProgress = Math.max(0.001, Math.min(morphSpring, 0.999));
    savePhase = null;
  } else if (frame >= 258 && frame < 300) {
    savePhase = null;
  }

  // ── Segment 2: Twitter sync (300–600) ──
  else if (frame >= 300 && frame < 322) {
    twitterStatus = "hovering";
    twitterPressScale = interpolate(frame, [300, 311, 316, 322], [1, 1, 0.87, 1], {
      extrapolateRight: "clamp",
    });
  } else if (frame >= 322 && frame < 462) {
    twitterStatus = "syncing";
    twitterCount = Math.floor(interpolate(frame, [322, 462], [0, 228]));
  } else if (frame >= 462 && frame < 522) {
    twitterStatus = "done";
    twitterCount = 228;
  } else if (frame >= 522 && frame < 600) {
    // twitter resets to idle, both idle
  }

  // ── Segment 3: Instagram sync (600–900) ──
  else if (frame >= 600 && frame < 622) {
    instagramStatus = "hovering";
    instagramPressScale = interpolate(frame, [600, 611, 616, 622], [1, 1, 0.87, 1], {
      extrapolateRight: "clamp",
    });
  } else if (frame >= 622 && frame < 780) {
    instagramStatus = "syncing";
    instagramCount = Math.floor(interpolate(frame, [622, 780], [0, 47]));
  } else if (frame >= 780) {
    instagramStatus = "done";
    instagramCount = 47;
  }

  return (
    <AbsoluteFill
      style={{
        background: "transparent",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 27,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <SafariFrame />
      </div>

      <div
        style={{
          position: "absolute",
          top: 81,
          right: 42,
          transformOrigin: "top right",
          transform: "scale(0.8)",
          opacity: panelOpacity,
        }}
      >
        <div
          style={{
            transform: `translateY(${panelTranslateY}px) scale(${panelScaleVal})`,
          }}
        >
          <PopupShell>
            <MainView
              bookmarkStatus={bookmarkStatus}
              containerHeight={containerHeight}
              instagramCount={instagramCount}
              instagramPressScale={instagramPressScale}
              instagramStatus={instagramStatus}
              morphProgress={morphProgress}
              savePhase={savePhase}
              saveProgress={saveProgress}
              twitterCount={twitterCount}
              twitterPressScale={twitterPressScale}
              twitterStatus={twitterStatus}
            />
          </PopupShell>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const RecollectShowcase2 = ShowcaseContent;
