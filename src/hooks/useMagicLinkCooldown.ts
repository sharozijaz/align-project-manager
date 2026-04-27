import { useEffect, useMemo, useState } from "react";

const MAGIC_LINK_COOLDOWN_KEY = "align:magic-link-next-send-at";
const DEFAULT_COOLDOWN_SECONDS = 90;
const RATE_LIMIT_COOLDOWN_SECONDS = 300;

const readNextSendAt = () => {
  if (typeof window === "undefined") return 0;

  return Number(window.localStorage.getItem(MAGIC_LINK_COOLDOWN_KEY) ?? 0);
};

const writeNextSendAt = (nextSendAt: number) => {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(MAGIC_LINK_COOLDOWN_KEY, String(nextSendAt));
};

export function isRateLimitMessage(message: string) {
  return message.toLowerCase().includes("rate limit");
}

export function useMagicLinkCooldown() {
  const [now, setNow] = useState(Date.now());
  const [nextSendAt, setNextSendAt] = useState(readNextSendAt);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
      setNextSendAt(readNextSendAt());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const remainingSeconds = Math.max(0, Math.ceil((nextSendAt - now) / 1000));
  const isCoolingDown = remainingSeconds > 0;

  const label = useMemo(() => {
    if (!isCoolingDown) return "Send Magic Link";

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    return minutes > 0 ? `Try again in ${minutes}:${seconds.toString().padStart(2, "0")}` : `Try again in ${seconds}s`;
  }, [isCoolingDown, remainingSeconds]);

  const startCooldown = (seconds = DEFAULT_COOLDOWN_SECONDS) => {
    const next = Date.now() + seconds * 1000;
    writeNextSendAt(next);
    setNextSendAt(next);
    setNow(Date.now());
  };

  const startRateLimitCooldown = () => startCooldown(RATE_LIMIT_COOLDOWN_SECONDS);

  return {
    isCoolingDown,
    label,
    remainingSeconds,
    startCooldown,
    startRateLimitCooldown,
  };
}
