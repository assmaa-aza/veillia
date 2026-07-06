import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, Bell, LogOut, Bookmark, User, Sun, Moon } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/use-auth";


const discoverItems = [
  { label: "Actualités intelligentes", anchor: "actualites" },
  { label: "Veille personnalisée", anchor: "veille" },
  { label: "Analyse des tendances", anchor: "tendances" },
  { label: "Alertes en temps réel", anchor: "alertes" },
  { label: "Rapports IA", anchor: "rapports" },
  { label: "Dashboard interactif", anchor: "dashboard" },
];

const categories = [
  { label: "Recherche", slug: "recherche", icon: "📚", desc: "Papiers, labs et publications scientifiques." },
  { label: "Produits IA", slug: "produits", icon: "🚀", desc: "Nouveaux outils et modèles à tester." },
  { label: "Startups", slug: "startups", icon: "🏢", desc: "Levées, lancements et pivots." },
  { label: "Réglementation", slug: "regulation", icon: "⚖️", desc: "Lois, normes et cadre éthique." },
  { label: "Écosystème", slug: "ecosysteme", icon: "🌍", desc: "Acteurs, communautés et événements." },
  { label: "Tendances", slug: "tendances", icon: "📈", desc: "Signaux faibles et sujets émergents." },
  { label: "Événements", slug: "evenements", icon: "📅", desc: "Conférences, hackathons et meetups." },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("veillia.theme");
      if (stored === "light" || stored === "dark") return stored;
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("veillia.theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("veillia.theme", "light");
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("veillia.theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (!stored && systemPrefersDark)) {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    }
  }, []);

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logo} alt="VeillIA" width={56} height={56} className="h-14 w-14" />
          <span className="font-display text-2xl font-bold text-gradient-brand">VeillIA</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <div className="group relative">
            <Link
              to="/decouvrir"
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              Découvrir <ChevronDown className="h-4 w-4" />
            </Link>
            <div className="invisible absolute left-0 top-full w-64 translate-y-1 opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="mt-2 rounded-xl border border-border bg-popover p-2 shadow-card">
                {discoverItems.map((it) => (
                  <Link
                    key={it.anchor}
                    to="/decouvrir"
                    hash={it.anchor}
                    className="block rounded-lg px-3 py-2 text-sm text-popover-foreground/80 hover:bg-muted hover:text-foreground"
                  >
                    {it.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="group relative">
            <button className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
              Catégories <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
            </button>
            <div className="invisible absolute left-1/2 top-full z-50 w-[640px] -translate-x-1/2 translate-y-1 opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-brand">
                <div className="border-b border-border bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-5 py-3">
                  <div className="text-sm font-semibold text-foreground">Explorer par catégorie</div>
                  <div className="text-xs text-muted-foreground">Choisissez un univers, on s'occupe de la veille.</div>
                </div>
                <div className="grid grid-cols-2 gap-1 p-3">
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      to="/categories/$slug"
                      params={{ slug: c.slug }}
                      className="group/item flex items-start gap-3 rounded-xl p-3 transition hover:bg-muted"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 text-xl">
                        {c.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground group-hover/item:text-primary">{c.label}</div>
                        <div className="line-clamp-2 text-xs text-muted-foreground">{c.desc}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/a-propos"
            className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
          >
            À propos
          </Link>
          {isAuthenticated && (
            <>
              <Link to="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
                Mon flux
              </Link>
              <Link to="/watchlists" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
                <Bookmark className="h-4 w-4" /> Mes watchlists
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Changer de thème"
            className="rounded-lg p-2 text-foreground/70 hover:bg-muted mr-1"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <>
                <button aria-label="Notifications" className="relative rounded-lg p-2 text-foreground/70 hover:bg-muted">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
                </button>
                <div className="group relative">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() ?? <User className="h-4 w-4" />}
                    </span>
                    <span className="max-w-[100px] truncate font-medium">{user?.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <div className="invisible absolute right-0 top-full w-56 translate-y-1 opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="mt-2 rounded-xl border border-border bg-popover p-2 shadow-card">
                      <div className="px-3 py-2 text-xs text-muted-foreground">{user?.email}</div>
                      <Link to="/dashboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Mon flux IA</Link>
                      <Link to="/watchlists" className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Mes watchlists</Link>
                      <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-muted">
                        <LogOut className="h-4 w-4" /> Se déconnecter
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground">
                  Se connecter
                </Link>
                <Link to="/auth/signup" className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95">
                  S'inscrire
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="rounded-lg p-2 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-3">
            <Link to="/decouvrir" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Découvrir</Link>
            <div className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">Catégories</div>
            {categories.map((c) => (
              <Link key={c.slug} to="/categories/$slug" params={{ slug: c.slug }} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                {c.icon} {c.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Mon flux IA</Link>
                <Link to="/watchlists" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">Mes watchlists</Link>
                <button onClick={() => { setOpen(false); handleSignOut(); }} className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-center text-sm text-destructive">Se déconnecter</button>
              </>
            ) : (
              <div className="mt-2 flex gap-2 pt-2">
                <Link to="/auth/login" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-sm">Se connecter</Link>
                <Link to="/auth/signup" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-gradient-brand px-3 py-2 text-center text-sm font-semibold text-primary-foreground">S'inscrire</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
