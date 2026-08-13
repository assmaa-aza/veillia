import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, ShieldAlert, Sparkles, CheckCircle2, X, ChevronRight, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getLatestArticles, type Article } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";

export interface NotificationItem {
  id: string;
  type: "verification" | "interest" | "system";
  title: string;
  message: string;
  time: string;
  articleId?: number;
  read: boolean;
  actionUrl?: string;
}

export function NotificationBell() {
  const { isAuthenticated, profile, preferences, user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Generate real notifications based on user account status & preferences
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const items: NotificationItem[] = [];

    // 1. Account verification notification (if applicable)
    const isUnverified = (profile as any)?.email_confirmed === false || (user as any)?.email_confirmation_required;
    if (isUnverified) {
      items.push({
        id: "verify-account-alert",
        type: "verification",
        title: "Vérification de compte requise",
        message: "Veuillez vérifier votre adresse email pour débloquer toutes les fonctionnalités et alertes en temps réel.",
        time: "Action requise",
        read: false,
        actionUrl: "/auth/verify",
      });
    }

    // 2. Real interest-based notifications from DB articles
    const interests = preferences?.interests || ["Generative AI", "LLMs", "AI Agents"];
    const companies = preferences?.followed_companies || ["OpenAI", "Mistral AI"];

    getLatestArticles(20)
      .then((articles) => {
        const matchedArticles: Article[] = [];

        articles.forEach((art) => {
          const text = `${art.title} ${art.summary || ""} ${art.source || ""}`.toLowerCase();
          const matchesInterest = interests.some((i) => text.includes(i.toLowerCase()));
          const matchesCompany = companies.some((c) => text.includes(c.toLowerCase()));
          if (matchesInterest || matchesCompany) {
            matchedArticles.push(art);
          }
        });

        if (matchedArticles.length > 0) {
          const topMatches = matchedArticles.slice(0, 4);
          topMatches.forEach((art) => {
            const topic = interests.find((i) => art.title.toLowerCase().includes(i.toLowerCase())) ||
                          companies.find((c) => art.title.toLowerCase().includes(c.toLowerCase())) ||
                          art.category || "VeillIA";
            items.push({
              id: `article-notif-${art.id}`,
              type: "interest",
              title: `Nouvelle analyse : ${topic}`,
              message: art.title,
              time: art.published_at ? "Récent" : "Aujourd'hui",
              articleId: art.id,
              read: false,
            });
          });
        } else {
          // General welcome notification
          items.push({
            id: "welcome-notif",
            type: "system",
            title: "VeillIA active",
            message: "Votre flux est configuré et surveille en continu l'actualité mondiale de l'IA.",
            time: "Aujourd'hui",
            read: true,
          });
        }

        setNotifications(items);
        setUnreadCount(items.filter((i) => !i.read).length);
      })
      .catch(() => {
        if (items.length > 0) {
          setNotifications(items);
          setUnreadCount(items.filter((i) => !i.read).length);
        }
      });
  }, [isAuthenticated, profile, preferences, user]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const dismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        className="relative rounded-xl border border-border/80 bg-background p-2 text-foreground/80 hover:bg-muted hover:text-foreground transition shadow-card"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute ltr:right-0 rtl:left-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-popover p-3 shadow-card animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-border/80 pb-2 px-1">
            <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
              <Bell className="h-4 w-4 text-primary" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {unreadCount} nouvelles
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="mt-2 max-h-80 overflow-y-auto space-y-2 pr-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="mx-auto h-6 w-6 text-muted-foreground/50 mb-1" />
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`group relative rounded-xl border p-3 transition ${
                    n.type === "verification"
                      ? "border-warning/40 bg-warning/10 text-foreground"
                      : n.read
                      ? "border-border/60 bg-background/50 text-muted-foreground"
                      : "border-primary/30 bg-primary/5 text-foreground shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {n.type === "verification" ? (
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      ) : (
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-foreground line-clamp-1">{n.title}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{n.time}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-snug line-clamp-2">
                          {n.message}
                        </p>

                        {n.actionUrl && (
                          <Link
                            to={n.actionUrl as any}
                            onClick={() => setOpen(false)}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-warning hover:underline"
                          >
                            Vérifier mon compte <ChevronRight className="h-3 w-3" />
                          </Link>
                        )}

                        {n.articleId && (
                          <Link
                            to="/analyses/$id"
                            params={{ id: String(n.articleId) }}
                            onClick={() => setOpen(false)}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                          >
                            Consulter l'analyse <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => dismissNotification(n.id, e)}
                      className="text-muted-foreground/50 hover:text-foreground rounded p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
