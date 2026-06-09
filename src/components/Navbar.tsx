import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const links = [
  { label: "Scan", href: "/scan" as const },
  { label: "History", href: "/history" as const },
  { label: "About", href: "/#about" as const },
];

export function Navbar() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 lg:px-16 py-5 backdrop-blur-sm bg-background/30 border-b border-border/30">
      <Link to="/" className="text-foreground text-xl font-semibold tracking-tight flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
        SENTINEL
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {links.map((l) => (
          <Link
            key={l.href}
            to={l.href}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
          >
            {l.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {authed ? (
          <button
            onClick={signOut}
            className="hidden md:inline-flex items-center justify-center rounded-lg bg-nav-button hover:bg-nav-button/80 px-5 py-2 text-xs uppercase tracking-widest text-foreground transition active:scale-[0.97]"
          >
            Sign out
          </button>
        ) : (
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-lg bg-nav-button hover:bg-nav-button/80 px-5 py-2 text-xs uppercase tracking-widest text-foreground transition active:scale-[0.97]"
          >
            Sign in
          </Link>
        )}
        <Link
          to="/scan"
          className="hidden md:inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:brightness-110 px-5 py-2 text-xs uppercase tracking-widest font-semibold transition active:scale-[0.97]"
        >
          Run Scan
        </Link>
      </div>
    </nav>
  );
}
