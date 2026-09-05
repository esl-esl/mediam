"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanner } from "./planner-provider";

const WELCOME_KEY = "study-space-mobile-welcome";

export function MobileStartup() {
  const { syncStatus } = usePlanner();
  const [mounted, setMounted] = React.useState(false);
  const [showLoader, setShowLoader] = React.useState(false);
  const [forceOpen, setForceOpen] = React.useState(false);
  const [welcomed, setWelcomed] = React.useState(true);

  React.useEffect(() => {
    const mountTimer = window.setTimeout(() => {
      try { setWelcomed(window.localStorage.getItem(WELCOME_KEY) === "1"); } catch { setWelcomed(true); }
      setMounted(true);
    }, 0);
    const loaderTimer = window.setTimeout(() => setShowLoader(true), 250);
    const escapeTimer = window.setTimeout(() => setForceOpen(true), 10_500);
    return () => { window.clearTimeout(mountTimer); window.clearTimeout(loaderTimer); window.clearTimeout(escapeTimer); };
  }, []);

  if (!mounted) return null;
  if (syncStatus === "loading" && !forceOpen) return showLoader ? <div className="mobile-startup" role="status" aria-label="Загрузка Study Space"><div className="mobile-brand-mark"><span>STUDY</span><span>SPACE</span></div><LoaderCircle className="mt-8 size-5 animate-spin text-[#0050CF]" /></div> : null;
  if (!welcomed) return <div className="mobile-startup mobile-welcome"><div className="mobile-brand-mark"><span>STUDY</span><span>SPACE</span></div><div className="w-full max-w-xs"><h1 className="text-2xl font-semibold tracking-[-.04em]">Учебное пространство</h1><Button className="mt-6 h-11 w-full" onClick={() => { try { window.localStorage.setItem(WELCOME_KEY, "1"); } catch { /* Continue without persistent storage. */ } setWelcomed(true); }}>Войти в Study Space</Button></div></div>;
  return null;
}
