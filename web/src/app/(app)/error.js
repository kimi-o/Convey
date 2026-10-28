"use client";
import { useEffect } from "react";
import Button from "@/components/ui/Button";

export default function AppError({ error, reset }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-sm text-white/70">This page ran into a problem.</p>
      <Button variant="secondary" onClick={reset}>Try again</Button>
    </div>
  );
}