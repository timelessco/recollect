"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState } from "react";

import * as Sentry from "@sentry/nextjs";

import { useMarkOnboardedMutation } from "@/async/mutationHooks/user/use-mark-onboarded-mutation";
import { Dialog } from "@/components/ui/recollect/dialog";
import { AppleIcon } from "@/icons/apple-icon";

// `@remotion/player` touches `window` on import — load it client-side only so
// `/onboarding` still pre-renders as a static shell.
const RecollectShowcase2Player = dynamic(
  () => import("@/remotion/player/RecollectShowcase2Player"),
  { ssr: false },
);

type Step = "apps" | "extension";

const STEP_ORDER: Step[] = ["extension", "apps"];

// The app globally pins the Inter variable font's optical-size axis to 20
// (see `--font-sans--font-variation-settings: "opsz" 20` in globals.css).
// Figma measured this screen with opsz matching the text size (14 for 14px),
// so we override locally to avoid button text rendering wider than the spec.
const OPSZ_14: React.CSSProperties = { fontVariationSettings: "'opsz' 14" };

export function OnboardingModal() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<Step>("extension");

  const markOnboardingComplete = useMarkOnboardedMutation();
  const hasMarkedRef = useRef(false);

  // Fire-and-forget completion write. Idempotent on the server: the PATCH
  // route filters `.is('onboarded_at', null)`, so re-calls after the first
  // are no-ops that preserve the original timestamp. We also gate client-side
  // so duplicate clicks never re-issue the request within one modal session.
  const markComplete = () => {
    if (hasMarkedRef.current) {
      return;
    }
    hasMarkedRef.current = true;
    markOnboardingComplete.mutate(undefined, {
      onError: (err) => {
        // Breadcrumb stays for trail context if a downstream error captures.
        Sentry.addBreadcrumb({
          category: "onboarding",
          message: "Failed to record onboarding completion from client",
          level: "warning",
          data: { error: String(err) },
        });
        // Independently track the failure as a warning-level event so we
        // notice silent regressions (like the empty-body 400 we shipped
        // earlier in this branch). Recoverable — the SSR gate will mount
        // the modal again on next /discover visit.
        Sentry.captureException(err, {
          level: "warning",
          tags: { operation: "mark_onboarded_client" },
        });
      },
    });
  };

  // Skip advances through the step machine; on the final step it closes
  // the modal. markComplete() runs on every press — the first press writes
  // the onboarded_at timestamp, subsequent presses hit the ref guard and no-op.
  const skip = () => {
    markComplete();
    const next = STEP_ORDER[STEP_ORDER.indexOf(step) + 1];
    if (next) {
      setStep(next);
      return;
    }
    setOpen(false);
  };

  // Dialog.Root onOpenChange — fires on backdrop click, Esc key, explicit
  // Dialog.Close calls. Same markComplete semantics as Skip.
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      markComplete();
      setOpen(false);
    }
  };

  return (
    <Dialog.Root disablePointerDismissal onOpenChange={handleOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup
          aria-label="Welcome to Recollect"
          className="h-[447px] w-[464px] overflow-hidden rounded-[20px] bg-gray-200 shadow-[0px_1px_1px_0px_rgba(0,0,0,0.1),0px_0px_0.5px_0px_rgba(0,0,0,0.6),0px_17px_17px_0px_rgba(0,0,0,0.08),0px_38px_23px_0px_rgba(0,0,0,0.04),0px_67px_27px_0px_rgba(0,0,0,0.01),0px_4px_9px_0px_rgba(0,0,0,0.09)]"
        >
          <div className="relative size-full">
            {/* Skip button — top-right, shared by both steps */}
            <button
              className="absolute top-[9px] left-[401px] flex h-[32px] items-center justify-center rounded-[12px] px-[12px] py-[5.5px] outline-hidden focus-visible:ring-2 focus-visible:ring-gray-300"
              onClick={skip}
              type="button"
            >
              <span
                className="text-[14px] leading-[1.15] font-medium tracking-[0.14px] text-gray-800"
                style={OPSZ_14}
              >
                Skip
              </span>
            </button>

            {step === "extension" ? (
              <ExtensionStep onCtaClick={skip} />
            ) : (
              <AppsStep onCtaClick={skip} />
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — Chrome extension: Remotion player + Download Extension CTA.       */
/* -------------------------------------------------------------------------- */

// Player math: the Remotion composition canvas is 350×390 with the Safari
// SVG's white content area at composition coords ≈(23.5, 29) size 303×210.
// Anchoring the player at top=21, left=57.5 lands that white rectangle on the
// modal's original Safari slot (81, 50).
function ExtensionStep({ onCtaClick }: { onCtaClick: () => void }) {
  return (
    <>
      <div
        className="pointer-events-none absolute"
        style={{ top: "21px", left: "57.5px", width: "350px", height: "390px" }}
      >
        <RecollectShowcase2Player autoPlay loop />
      </div>

      <p
        className="absolute top-[315px] left-[104px] w-[256px] text-center text-[14px] leading-[1.35] tracking-[0.14px] text-gray-900"
        style={OPSZ_14}
      >
        Sync Twitter, Instagram, Chrome bookmarks using our extension
      </p>

      <a
        className="absolute top-[369px] left-1/2 flex h-[32px] -translate-x-1/2 items-center gap-[6px] rounded-[12px] bg-gray-0 px-[12px] py-[5.5px] no-underline shadow-[0px_1px_3px_0px_rgba(0,0,0,0.07),0px_5px_5px_0px_rgba(0,0,0,0.06),0px_11px_7px_0px_rgba(0,0,0,0.04)] outline-hidden transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-gray-300 active:scale-[0.98]"
        href="https://chromewebstore.google.com/detail/recollect-%E2%80%94-save-anything/hghngcbiflcoekclkkealmlbginmloef"
        onClick={onCtaClick}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Image
          alt=""
          className="block"
          height={16}
          src="/onboarding/chrome.svg"
          unoptimized
          width={16}
        />
        <span
          className="text-[14px] leading-[1.15] font-medium tracking-[0.14px] whitespace-nowrap text-gray-800"
          style={OPSZ_14}
        >
          Download Extension
        </span>
      </a>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2 — Companion apps: devices image + Appstore CTA.                     */
/* -------------------------------------------------------------------------- */

// Figma node "Group 1171276585" has layout bounds (76, 48, 341.899, 251.437).
// The exported PNG is 784×637 and includes drop-shadow bleed past the group.
// The device content inside the PNG sits at pixel (14,14)→(721,543) →
// 707 px maps to 341.899 units ⇒ scale ≈ 2.068 px/unit. Rendering the PNG
// at 379×308 anchored at (69, 41) lands the iPad's top-left on (76, 48).
function AppsStep({ onCtaClick }: { onCtaClick: () => void }) {
  return (
    <>
      <Image
        alt="Recollect iPad and iPhone apps"
        className="pointer-events-none absolute top-[41px] left-[69px] block"
        height={308}
        src="/onboarding/devices.png"
        width={379}
      />

      <p
        className="absolute top-[315px] left-[104px] w-[256px] text-center text-[14px] leading-[1.35] tracking-[0.14px] text-gray-900"
        style={OPSZ_14}
      >
        Download our beautiful companion apps to recollect from anywhere
      </p>

      <a
        className="absolute top-[369px] left-1/2 flex h-[32px] -translate-x-1/2 items-center gap-[6px] rounded-[12px] bg-gray-0 px-[12px] py-[5.5px] no-underline shadow-[0px_1px_3px_0px_rgba(0,0,0,0.07),0px_5px_5px_0px_rgba(0,0,0,0.06),0px_11px_7px_0px_rgba(0,0,0,0.04)] outline-hidden transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-gray-300 active:scale-[0.98]"
        href="https://apps.apple.com/app/recollect"
        onClick={onCtaClick}
        rel="noopener noreferrer"
        target="_blank"
      >
        <AppleIcon className="size-[18px] text-gray-800" />
        <span
          className="text-[14px] leading-[1.15] font-medium tracking-[0.14px] whitespace-nowrap text-gray-800"
          style={OPSZ_14}
        >
          Appstore
        </span>
      </a>
    </>
  );
}
