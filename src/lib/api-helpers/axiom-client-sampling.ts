"use client";

import type { LogEvent, Transport } from "@axiomhq/logging";

import { env } from "@/env/client";

/**
 * Per-event sampling rates. Keys are the string passed as the first
 * argument to `clientLogger.info/warn/error` (i.e. the LogEvent.message).
 * Unlisted events fall back to the global floor from
 * `NEXT_PUBLIC_AXIOM_CLIENT_SAMPLE_RATE`.
 *
 * `error`-level events bypass sampling entirely — we never lose errors.
 */
const EVENT_SAMPLE_RATES: Readonly<Record<string, number>> = {
  // Navigation is high-volume; 25% is enough to reconstruct timelines.
  route_change: 0.25,
};

const GLOBAL_SAMPLE_RATE = Number(env.NEXT_PUBLIC_AXIOM_CLIENT_SAMPLE_RATE ?? "1");
const KILL_SWITCH = env.NEXT_PUBLIC_AXIOM_CLIENT_DISABLED === "true";

function resolveRate(eventName: string): number {
  const override = EVENT_SAMPLE_RATES[eventName];
  if (override !== undefined) {
    return override;
  }
  return Number.isFinite(GLOBAL_SAMPLE_RATE) ? GLOBAL_SAMPLE_RATE : 1;
}

function shouldKeep(event: LogEvent): boolean {
  if (KILL_SWITCH) {
    return false;
  }
  if (event.level === "error") {
    return true;
  }
  const rate = resolveRate(event.message);
  if (rate >= 1) {
    return true;
  }
  if (rate <= 0) {
    return false;
  }
  return Math.random() < rate;
}

/**
 * Wraps an inner Transport with pre-flush sampling. Dropped events
 * never enter the inner transport's buffer, so they never hit the
 * network. `flush` delegates so the autoFlush / visibilitychange
 * mechanics of the wrapped transport continue to work.
 */
export class SampledTransport implements Transport {
  private readonly inner: Transport;

  constructor(inner: Transport) {
    this.inner = inner;
  }

  flush = (): Promise<void> | void => this.inner.flush();

  log = (events: LogEvent[]): Promise<void> | void => {
    const kept = events.filter((event) => shouldKeep(event));
    if (kept.length === 0) {
      return;
    }
    return this.inner.log(kept);
  };
}
