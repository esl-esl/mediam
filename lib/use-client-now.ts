"use client";

import * as React from "react";

const HYDRATION_DATE = new Date("2026-01-15T12:00:00.000Z");

/** Keeps the server and first browser render identical, then switches to real local time. */
export function useClientNow() {
  const [now, setNow] = React.useState(HYDRATION_DATE);

  React.useEffect(() => {
    const first = window.setTimeout(() => setNow(new Date()), 0);
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, []);

  return now;
}
