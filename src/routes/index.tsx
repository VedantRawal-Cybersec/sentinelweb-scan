import { createFileRoute, Link } from "@tanstack/react-router";
import { SplineBackground } from "@/components/SplineBackground";
import { Navbar } from "@/components/Navbar";
import { Shield, Zap, Brain, Lock, FileSearch, Globe, ArrowRight, CheckCircle2 } from "lucide-react";
import { CountUp, ThreatTicker, TerminalPreview, GlowCard, Meteors } from "@/components/LandingExtras";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sentinel AI — Real Security Assessments" },
      {
        name: "description",
        content:
          "Run real, AI-guided security scans on any website. Headers, TLS, DNS, IP reputation, and a prioritized remediation roadmap in seconds.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-hero-bg text-foreground overflow-x-hidden">
      <Navbar />
      <Hero />
      <ThreatTicker />
      <Stats />
      <Features />
      <LiveDemo />
      <About />
      <CTA />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-end bg-hero-bg overflow-hidden">
      <SplineBackground />
      <Meteors count={14} />

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-hero-bg via-hero-bg/40 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-hero-bg/80 via-transparent to-transparent" />

      <div className="relative z-10 pointer-events-none w-full max-w-[92%] sm:max-w-md lg:max-w-3xl px-5 md:px-12 lg:px-16 pb-16 md:pb-24 pt-28 md:pt-32">
        <div className="opacity-0 mb-3" style={{ animation: "var(--animate-fade-up)", animationDelay: "0.1s" }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Live Security Engine
          </span>
        </div>

        <h1
          className="text-[clamp(2.6rem,9vw,6.5rem)] font-bold leading-[1.02] tracking-[-0.05em] text-foreground mb-3 md:mb-5 uppercase opacity-0"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.2s" }}
        >
          SENTINEL{" "}
          <span className="relative inline-block text-primary">
            AI
            <span className="absolute -inset-1 -z-10 blur-2xl bg-primary/30" />
          </span>
        </h1>

        <p
          className="text-foreground/85 text-[clamp(1.05rem,2.5vw,1.875rem)] font-light mb-3 md:mb-6 opacity-0"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.4s" }}
        >
          We implement security <span className="text-primary">correctly</span>.
        </p>

        <p
          className="text-muted-foreground text-[clamp(0.9rem,1.4vw,1.15rem)] font-light max-w-2xl mb-6 md:mb-10 opacity-0"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.55s" }}
        >
          Real security assessments on any website — HTTP headers, TLS certificates, DNS posture,
          IP reputation, and an AI-generated remediation roadmap. No mock data. No vendor fluff.
        </p>

        <div className="flex flex-wrap gap-3 font-semibold opacity-0" style={{ animation: "var(--animate-fade-up)", animationDelay: "0.7s" }}>
          <Link
            to="/scan"
            className="group pointer-events-auto relative overflow-hidden bg-primary text-primary-foreground px-7 py-3.5 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer transition-all active:scale-[0.97] uppercase tracking-widest shadow-[0_0_30px_-5px_hsl(var(--primary)/0.7)] hover:shadow-[0_0_50px_-5px_hsl(var(--primary))]"
          >
            <span className="relative z-10 inline-flex items-center gap-2">
              Run a Scan <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-full transition-transform duration-700" />
          </Link>
          <a
            href="#features"
            className="pointer-events-auto bg-foreground/5 backdrop-blur border border-foreground/20 text-foreground px-7 py-3.5 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer hover:bg-foreground/10 transition-all active:scale-[0.97] uppercase tracking-widest"
          >
            How it Works
          </a>
        </div>

        <p
          className="text-muted-foreground/60 text-xs font-light mt-6 md:mt-8 opacity-0 tracking-wide"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.85s" }}
        >
          Real APIs · Live TLS inspection · Gemini-powered remediation
        </p>
      </div>

      {/* scroll cue */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-1 opacity-60">
        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">scroll</span>
        <span className="h-8 w-[1px] bg-gradient-to-b from-primary to-transparent animate-pulse" />
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { k: 25, suffix: "+", v: "Security checks" },
    { k: 100, suffix: "%", v: "Live data" },
    { k: 10, suffix: "s", v: "Avg scan" },
    { k: 0, suffix: "", v: "Mock findings" },
  ];
  return (
    <section className="relative py-12 md:py-16 px-5 md:px-12 lg:px-16 border-b border-border/40">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {stats.map((s) => (
          <GlowCard key={s.v} className="p-5 md:p-6">
            <div className="text-3xl md:text-5xl font-bold text-primary tracking-tight">
              <CountUp to={s.k} suffix={s.suffix} />
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest mt-2">{s.v}</div>
          </GlowCard>
        ))}
      </div>
    </section>
  );
}

const features = [
  { icon: Lock, title: "TLS & Cert Inspection", desc: "Issuer, expiry, key strength, TLS version. Real cert chain analysis." },
  { icon: Shield, title: "Security Headers", desc: "HSTS, CSP, X-Frame-Options, Referrer-Policy. Weighted scoring per gap." },
  { icon: Globe, title: "DNS & Email Posture", desc: "A/AAAA/MX/TXT inspection. SPF, DKIM and DMARC policy detection." },
  { icon: FileSearch, title: "Tech Fingerprinting", desc: "Detect exposed versions, Server, X-Powered-By and stack leakage." },
  { icon: Zap, title: "IP Reputation", desc: "AbuseIPDB lookup with confidence score and report history." },
  { icon: Brain, title: "AI Remediation", desc: "Gemini analyzes your findings and writes a prioritized fix-it roadmap." },
];

function Features() {
  return (
    <section id="features" className="relative py-20 md:py-32 px-5 md:px-12 lg:px-16 border-t border-border/40 bg-background">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
      <div className="relative max-w-6xl mx-auto">
        <div className="mb-12 md:mb-16 max-w-2xl">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3 md:mb-4">// Capabilities</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 md:mb-4 leading-tight">
            Real checks. Real <span className="text-primary">data</span>. Real fixes.
          </h2>
          <p className="text-muted-foreground text-base md:text-lg font-light">
            Every finding comes from a live API or live HTTP inspection. Nothing is mocked.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <GlowCard key={f.title} className="p-6 md:p-7">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 mb-4">
                <f.icon className="h-5 w-5 text-primary" strokeWidth={1.6} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">{f.desc}</p>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveDemo() {
  return (
    <section className="relative py-20 md:py-32 px-5 md:px-12 lg:px-16 border-t border-border/40 overflow-hidden">
      <div className="absolute right-[-15%] top-[10%] h-[400px] w-[400px] rounded-full bg-primary/8 blur-[120px] pointer-events-none" />
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 md:gap-16 items-center">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3 md:mb-4">// Live preview</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 md:mb-6 leading-tight">
            Watch a scan happen in <span className="text-primary">real time</span>.
          </h2>
          <p className="text-muted-foreground text-base md:text-lg font-light mb-6">
            DNS, TLS, headers, reputation, AI remediation — streamed as it happens. No spinner theatre.
          </p>
          <ul className="space-y-2.5">
            {[
              "Evidence-based proof for every finding",
              "OWASP, CWE & attack-vector mapping",
              "Mobile-smooth, no heavy 3D on results",
              "Export JSON / share verified report",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground/85">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <TerminalPreview />
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="relative py-20 md:py-32 px-5 md:px-12 lg:px-16 border-t border-border/40">
      <div className="max-w-4xl mx-auto">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3 md:mb-4">// About</div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 md:mb-6 leading-tight">
          Built by an engineer who actually <span className="text-primary">ships</span> security.
        </h2>
        <p className="text-muted-foreground text-base md:text-lg font-light max-w-2xl">
          Sentinel AI was built to demonstrate what a production security assessment tool looks like
          when you stop relying on mock data and start orchestrating real APIs — certificate chains,
          abuse databases, DNS resolvers — with an LLM as the consultant on top.
        </p>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative py-20 md:py-28 px-5 md:px-12 lg:px-16 border-t border-border/40 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15),transparent_70%)] pointer-events-none" />
      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 md:mb-6">
          Ready to see what your site <span className="text-primary">really</span> exposes?
        </h2>
        <p className="text-muted-foreground text-base md:text-lg font-light mb-8 max-w-xl mx-auto">
          One URL. Real APIs. A full proof-based report in seconds.
        </p>
        <Link
          to="/scan"
          className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 text-sm font-semibold rounded-sm uppercase tracking-widest shadow-[0_0_40px_-5px_hsl(var(--primary)/0.8)] hover:shadow-[0_0_60px_-5px_hsl(var(--primary))] transition-all active:scale-[0.97]"
        >
          Start scanning <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 py-10 px-5 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
          SENTINEL AI
        </div>
        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sentinel AI · Real assessments, no theater.
        </div>
      </div>
    </footer>
  );
}
