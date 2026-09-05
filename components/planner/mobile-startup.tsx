"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanner } from "./planner-provider";

const WELCOME_KEY = "study-space-mobile-welcome";

export function MobileStartup() {
  const { syncStatus } = usePlanner();
  const [ready, setReady] = React.useState(false);
  const [welcomed, setWelcomed] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setWelcomed(window.localStorage.getItem(WELCOME_KEY) === "1");
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready || syncStatus === "loading") return <div className="mobile-startup" role="status" aria-label="Загрузка Study Space"><div className="mobile-brand-mark"><span>STUDY</span><span>SPACE</span></div><LoaderCircle className="mt-8 size-5 animate-spin text-[#0050CF]" /></div>;
  if (!welcomed) return <div className="mobile-startup mobile-welcome"><div className="mobile-brand-mark"><span>STUDY</span><span>SPACE</span></div><div className="w-full max-w-xs"><h1 className="text-2xl font-semibold tracking-[-.04em]">Учебное пространство</h1><Button className="mt-6 h-11 w-full" onClick={() => { window.localStorage.setItem(WELCOME_KEY, "1"); setWelcomed(true); }}>Войти в Study Space</Button></div></div>;
  return null;
}
