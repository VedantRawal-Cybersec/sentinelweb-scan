import { lazy, Suspense, useState } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

const SCENE_URL = "https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode";

function GradientFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.08),transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute right-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-15%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
    </div>
  );
}

export function SplineBackground() {
  const [errored, setErrored] = useState(false);

  if (errored) return <GradientFallback />;

  return (
    <div className="absolute inset-0">
      <Suspense fallback={<GradientFallback />}>
        <ErrorBoundary onError={() => setErrored(true)}>
          <Spline
            scene={SCENE_URL}
            className="!w-full !h-full"
            onError={() => setErrored(true)}
          />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}

import { Component, type ReactNode } from "react";

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
