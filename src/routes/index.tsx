import { createFileRoute, Link } from "@tanstack/react-router";
import { SplineBackground } from "@/components/SplineBackground";
import { Navbar } from "@/components/Navbar";
import { Shield, Zap, Brain, Lock, FileSearch, Globe } from "lucide-react";

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
    <div className="min-h-screen bg-hero-bg text-foreground">
      <Navbar />
      <Hero />
      <Features />
      <About />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-end bg-hero-bg overflow-hidden">
      <SplineBackground />

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-hero-bg via-hero-bg/40 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-hero-bg/80 via-transparent to-transparent" />

      <div className="relative z-10 pointer-events-none w-full max-w-[90%] sm:max-w-md lg:max-w-3xl px-6 md:px-12 lg:px-16 pb-16 md:pb-24 pt-32">
        <div
          className="opacity-0 mb-3"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.1s" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Live Security Engine
          </span>
        </div>

        <h1
          className="text-[clamp(3rem,8vw,6.5rem)] font-bold leading-[1.02] tracking-[-0.05em] text-foreground mb-3 md:mb-5 uppercase opacity-0"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.2s" }}
        >
          SENTINEL <span className="text-primary">AI</span>
        </h1>

        <p
          className="text-foreground/85 text-[clamp(1.125rem,2.5vw,1.875rem)] font-light mb-3 md:mb-6 opacity-0"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.4s" }}
        >
          We implement security <span className="text-primary">correctly</span>.
        </p>

        <p
          className="text-muted-foreground text-[clamp(0.9rem,1.4vw,1.15rem)] font-light max-w-2xl mb-6 md:mb-10 opacity-0"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.55s" }}
        >
          Real security assessments on any website &mdash; HTTP headers, TLS certificates, DNS posture,
          IP reputation, and an AI-generated remediation roadmap. No mock data. No vendor fluff.
        </p>

        <div
          className="flex flex-wrap gap-3 font-semibold opacity-0"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.7s" }}
        >
          <Link
            to="/scan"
            className="pointer-events-auto bg-primary text-primary-foreground px-7 py-3.5 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer hover:brightness-110 transition-all active:scale-[0.97] uppercase tracking-widest"
          >
            Run a Scan
          </Link>
          <a
            href="#features"
            className="pointer-events-auto bg-foreground text-background px-7 py-3.5 md:px-8 md:py-4 text-sm rounded-sm cursor-pointer hover:brightness-90 transition-all active:scale-[0.97] uppercase tracking-widest"
          >
            How it Works
          </a>
        </div>

        <p
          className="text-muted-foreground/60 text-xs font-light mt-6 md:mt-8 opacity-0 tracking-wide"
          style={{ animation: "var(--animate-fade-up)", animationDelay: "0.85s" }}
        >
          Real APIs &middot; Live TLS inspection &middot; Gemini-powered remediation
        </p>
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
    <section id="features" className="relative py-24 md:py-32 px-6 md:px-12 lg:px-16 border-t border-border/40 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-2xl">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-4">// Capabilities</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            Real checks. Real <span className="text-primary">data</span>. Real fixes.
          </h2>
          <p className="text-muted-foreground text-base md:text-lg font-light">
            Every finding comes from a live API or live HTTP inspection. Nothing is mocked.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/40">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-background p-8 hover:bg-card transition-colors group"
            >
              <f.icon className="h-6 w-6 text-primary mb-5" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="relative py-24 md:py-32 px-6 md:px-12 lg:px-16 border-t border-border/40">
      <div className="max-w-4xl mx-auto">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary mb-4">// About</div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 leading-tight">
          Built by an engineer who actually <span className="text-primary">ships</span> security.
        </h2>
        <p className="text-muted-foreground text-base md:text-lg font-light max-w-2xl mb-10">
          Sentinel AI was built to demonstrate what a production security assessment tool looks like
          when you stop relying on mock data and start orchestrating real APIs &mdash; certificate
          chains, abuse databases, DNS resolvers &mdash; with an LLM as the consultant on top.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40 max-w-3xl">
          {[
            { k: "0", v: "Mock findings" },
            { k: "25+", v: "Security checks" },
            { k: "<10s", v: "Avg scan time" },
            { k: "100%", v: "Live data" },
          ].map((s) => (
            <div key={s.v} className="bg-background p-6">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{s.k}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 py-12 px-6 md:px-12 lg:px-16">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          SENTINEL AI
        </div>
        <div className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Sentinel AI &middot; Real assessments, no theater.
        </div>
      </div>
    </footer>
  );
}
