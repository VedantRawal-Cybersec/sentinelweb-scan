import { lazy, Suspense, useEffect, useState, Component, type ReactNode } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

const SCENE_URL = "https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode";

function GradientFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.08),transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="absolute right-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-primary/12 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-15%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/6 blur-[120px]" />
      {/* Scanline shimmer */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-[scan_4s_linear_infinite]" />
      <style>{`@keyframes scan{0%{transform:translateY(0)}100%{transform:translateY(100vh)}}`}</style>
    </div>
  );
}

function useShouldRender3D() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isSmall = window.matchMedia("(max-width: 1280px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (navigator as any).connection;
    const slow = conn && (conn.saveData || /2g|3g|slow-2g/.test(conn.effectiveType ?? ""));
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const lowMem = mem != null && mem < 8;
    const lowCpu = (navigator.hardwareConcurrency ?? 8) < 6;
    if (isSmall || reduced || slow || lowMem || lowCpu) return;
    // Defer to idle so the landing paint isn't blocked by Spline init
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ric: any = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1200));
    const handle = ric(() => setOk(true), { timeout: 2500 });
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cic: any = (window as any).cancelIdleCallback;
      if (cic) cic(handle); else clearTimeout(handle);
    };
  }, []);
  return ok;
}

export function SplineBackground() {
  const [errored, setErrored] = useState(false);
  const allow3D = useShouldRender3D();

  if (errored || !allow3D) return <GradientFallback />;

  return (
    <div className="absolute inset-0">
      <Suspense fallback={<GradientFallback />}>
        <ErrorBoundary onError={() => setErrored(true)}>
          <Spline scene={SCENE_URL} className="!w-full !h-full" onError={() => setErrored(true)} />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return <GradientFallback />;
    return this.props.children;
  }
}
