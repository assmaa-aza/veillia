import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background: "var(--gradient-glow)" }} />
      <div className="absolute left-6 top-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="VeillIA" width={32} height={32} className="h-8 w-8" />
          <span className="font-display font-bold text-gradient-brand">VeillIA</span>
        </Link>
      </div>
      <div className="w-full max-w-md animate-fade-in">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
