"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** A thin line that starts the moment an internal link is clicked and finishes when the new page appears. */
export default function RouteProgress() {
  const path = usePathname();
  const [state, setState] = useState("idle"); // idle | loading | done
  const timer = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      clearTimeout(timer.current);
      setState("loading");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    timer.current = setTimeout(() => setState("idle"), 400);
    return () => clearTimeout(timer.current);
  }, [path]);

  const bar =
    state === "loading" ? "w-[85%] opacity-100 duration-[6000ms] ease-out"
    : state === "done" ? "w-full opacity-0 duration-300 ease-out"
    : "w-0 opacity-0 duration-0";

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5">
      <div className={`h-full bg-azure transition-[width,opacity] ${bar}`} />
    </div>
  );
}