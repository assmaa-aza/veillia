import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown, Bell, LogOut, Bookmark, User, Sun, Moon, FileText, Globe, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/use-auth";
import { useReport } from "@/hooks/use-report";
import { useLanguage } from "@/hooks/use-language";
import { NotificationBell } from "@/components/site/NotificationBell";
import type { SupportedLanguage } from "@/lib/translations";

const discoverItems = [
  { labelKey: "nav_discover", anchor: "actualites" },
  { labelKey: "nav_feed", anchor: "veille" },
  { labelKey: "nav_categories", anchor: "tendances" },
  { labelKey: "nav_report", anchor: "rapports" },
];

const categories = [
  { slug: "recherche", icon: "📚", labelKey: "cat_name_recherche", descKey: "cat_desc_recherche" },
  { slug: "produits", icon: "🚀", labelKey: "cat_name_produits", descKey: "cat_desc_produits" },
  { slug: "startups", icon: "🏢", labelKey: "cat_name_startups", descKey: "cat_desc_startups" },
  { slug: "regulation", icon: "⚖️", labelKey: "cat_name_regulation", descKey: "cat_desc_regulation" },
  { slug: "ecosysteme", icon: "🌍", labelKey: "cat_name_ecosysteme", descKey: "cat_desc_ecosysteme" },
  { slug: "tendances", icon: "📈", labelKey: "cat_name_tendances", descKey: "cat_desc_tendances" },
  { slug: "evenements", icon: "📅", labelKey: "cat_name_evenements", descKey: "cat_desc_evenements" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [langDropdown, setLangDropdown] = useState(false);
  const { isAuthenticated, user, signOut, loading: authLoading } = useAuth();
  const { count: reportCount } = useReport();
  const { language, setLanguage, t, options } = useLanguage();
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

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const activeLangOption = options.find((o) => o.id === language) || options[0];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl print:hidden">
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
              {t("nav_discover")} <ChevronDown className="h-4 w-4" />
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
                    {t(it.labelKey)}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="group relative">
            <button className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
              {t("nav_categories")} <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
            </button>
            <div className="invisible absolute left-1/2 top-full z-50 w-[640px] -translate-x-1/2 translate-y-1 opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-popover shadow-brand">
                <div className="border-b border-border bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 px-5 py-3">
                  <div className="text-sm font-semibold text-foreground">{t("nav_categories")}</div>
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
                        <div className="text-sm font-semibold text-foreground group-hover/item:text-primary">{t(c.labelKey)}</div>
                        <div className="line-clamp-2 text-xs text-muted-foreground">{t(c.descKey)}</div>
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
            {t("nav_about")}
          </Link>

          {isAuthenticated && user?.role === "admin" && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition font-semibold"
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}

          {isAuthenticated && (
            <>
              <Link to="/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
                {t("nav_feed")}
              </Link>
              <Link to="/watchlists" className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
                <Bookmark className="h-4 w-4" /> {t("nav_watchlists")}
              </Link>
              <Link to={'/mon-rapport' as any} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
                <FileText className="h-4 w-4" />
                {reportCount > 0 ? (
                  <>{t("nav_report")} <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-xs font-bold text-accent">{reportCount}</span></>
                ) : (
                  t("nav_report")
                )}
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangDropdown((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted transition"
              aria-label="Sélectionner la langue"
            >
              <span>{activeLangOption.flag}</span>
              <span className="hidden sm:inline font-semibold">{activeLangOption.id}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {langDropdown && (
              <div className="absolute ltr:right-0 rtl:left-0 top-full z-50 mt-1.5 w-40 rounded-xl border border-border bg-popover p-1.5 shadow-card">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      void setLanguage(opt.id as SupportedLanguage);
                      setLangDropdown(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${language === opt.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"}`}
                  >
                    <span>{opt.flag}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Changer de thème"
            className="rounded-lg p-2 text-foreground/70 hover:bg-muted"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <div className="group relative">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase() ?? <User className="h-4 w-4" />}
                    </span>
                    <span className="max-w-[100px] truncate font-medium">{user?.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <div className="invisible absolute ltr:right-0 rtl:left-0 top-full w-56 translate-y-1 opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="mt-2 rounded-xl border border-border bg-popover p-2 shadow-card">
                      <div className="px-3 py-2 text-xs text-muted-foreground">{user?.email}</div>
                      <Link to="/dashboard" className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">{t("nav_feed")}</Link>
                      <Link to={'/mon-rapport' as any} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted">
                        {t("nav_report")}
                        {reportCount > 0 && <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">{reportCount}</span>}
                      </Link>
                      <Link to="/watchlists" className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">{t("nav_watchlists")}</Link>
                      {user?.role === "admin" && (
                        <Link to="/admin" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-muted">
                          <ShieldCheck className="h-4 w-4" /> Admin
                        </Link>
                      )}
                      <button onClick={handleSignOut} disabled={authLoading} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-muted disabled:opacity-60">
                        <LogOut className="h-4 w-4" /> {t("nav_logout")}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="rounded-lg px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground">
                  {t("nav_login")}
                </Link>
                <Link to="/auth/signup" className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brand transition hover:opacity-95">
                  {t("nav_signup")}
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
            <Link to="/decouvrir" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">{t("nav_discover")}</Link>
            <div className="px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">{t("nav_categories")}</div>
            {categories.map((c) => (
              <Link key={c.slug} to="/categories/$slug" params={{ slug: c.slug }} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">
                {c.icon} {t(c.labelKey)}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">{t("nav_feed")}</Link>
                <Link to={'/mon-rapport' as any} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted">
                  {t("nav_report")}
                  {reportCount > 0 && <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">{reportCount}</span>}
                </Link>
                <Link to="/watchlists" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-muted">{t("nav_watchlists")}</Link>
                {user?.role === "admin" && (
                  <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-muted">
                    <ShieldCheck className="h-4 w-4" /> Admin
                  </Link>
                )}
                <button onClick={() => { setOpen(false); void handleSignOut(); }} disabled={authLoading} className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-center text-sm text-destructive disabled:opacity-60">{t("nav_logout")}</button>
              </>
            ) : (
              <div className="mt-2 flex gap-2 pt-2">
                <Link to="/auth/login" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-border px-3 py-2 text-center text-sm">{t("nav_login")}</Link>
                <Link to="/auth/signup" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-gradient-brand px-3 py-2 text-center text-sm font-semibold text-primary-foreground">{t("nav_signup")}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
