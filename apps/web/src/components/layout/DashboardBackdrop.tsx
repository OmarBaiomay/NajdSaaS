import type { ReactNode } from "react";
import { HeroScene } from "@/components/three/HeroScene";

/**
 * The same ambient Three.js wireframe used on the login screen, dropped in
 * behind a dashboard page's content at low opacity — bleeds edge-to-edge
 * inside <main>'s padding (hence -m-6/p-6) rather than sitting in a boxed-in
 * area.
 */
export function DashboardBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative -m-6 min-h-[calc(100vh-4rem)] overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-25">
        <HeroScene />
      </div>
      <div className="relative z-10 space-y-6">{children}</div>
    </div>
  );
}
