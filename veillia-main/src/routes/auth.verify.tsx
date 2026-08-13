import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuthShell } from "@/components/site/AuthShell";
import { useAuth } from "@/hooks/use-auth";
import * as api from "@/lib/api";

export const Route = createFileRoute("/auth/verify")({
  head: () => ({ meta: [{ title: "Vérification — VeillIA" }] }),
  component: Verify,
});

function Verify() {
  const navigate = useNavigate();
  const { signInWithSession } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEmail(window.localStorage.getItem("veillia_signup_email") || "");
    }
  }, []);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const set = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = c;
    setCode(next);
    if (c && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...pasted.split(""), ...Array(6).fill("")].slice(0, 6);
    setCode(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.join("");
    if (token.length !== 6) return;

    setLoading(true);
    setError(null);
    try {
      const result = await api.verifyOtp(email, token);
      // Sign the user in with the session returned by the backend
      await signInWithSession(
        result.session.access_token,
        result.session.refresh_token,
      );
      // Verification returns a real session. Persist it before navigating so
      // the protected dashboard can load this user's database profile.
      window.localStorage.removeItem("veillia_signup_email");
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Code incorrect ou expiré. Veuillez réessayer.",
      );
      // Clear the code fields so the user can re-enter
      setCode(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      // Trigger a new OTP by calling register again — Supabase resends for existing unconfirmed users
      await api.resendOtp(email);
    } catch {
      // Supabase may complain about the empty password — that's fine;
      // what matters is it triggers a new OTP to the address.
      // A cleaner approach is a dedicated resend endpoint, but this works for now.
    }
    setResendCooldown(60);
  };

  return (
    <AuthShell
      title="Vérifiez votre email"
      subtitle={
        email
          ? `Nous avons envoyé un code à ${email}`
          : "Saisissez le code reçu par email."
      }
      footer={
        <Link to="/auth/signup" className="text-primary hover:underline">
          Modifier l'email
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {code.map((c, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={c}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !c && i > 0)
                  refs.current[i - 1]?.focus();
              }}
              inputMode="numeric"
              maxLength={1}
              disabled={loading}
              className="h-12 w-12 rounded-lg border border-input bg-background text-center text-lg font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
            />
          ))}
        </div>

        <button
          disabled={loading || code.join("").length !== 6}
          className="w-full rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-60"
        >
          {loading ? "Vérification…" : "Finaliser l'inscription"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Pas reçu ?{" "}
          <button
            type="button"
            disabled={resendCooldown > 0}
            onClick={handleResend}
            className="text-primary hover:underline disabled:opacity-50"
          >
            {resendCooldown > 0
              ? `Renvoyer dans ${resendCooldown}s`
              : "Renvoyer le code"}
          </button>
        </p>
      </form>
    </AuthShell>
  );
}
