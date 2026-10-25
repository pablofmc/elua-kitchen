"use client";

import { useEffect, useState } from "react";

/**
 * The current time, ticking every second, on the server's clock. The first render uses
 * `serverNow` so server and client HTML match; after that the phone's clock is corrected by
 * the difference seen at mount, so a phone set a few minutes off still counts down right.
 */
export function useClock(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const offset = serverNow - Date.now();
    const tick = () => setNow(Date.now() + offset);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [serverNow]);
  return now;
}
