import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/components/site/AuthShell";
import * as api from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({ meta: [{ title: "Inscription — VeillIA" }] }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const { signInWithSession } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.register(email, password, username);

      if (result.session) {
        // Session returned directly — sign in immediately
        await signInWithSession(
          result.session.access_token,
          result.session.refresh_token,
        );
        navigate({ to: "/onboarding" });
      } else {
        // Supabase email confirmation is ON — redirect to OTP verify page.
        // signIn() would fail here because the email isn't confirmed yet.
        window.localStorage.setItem("veillia_signup_email", email);
        navigate({ to: "/auth/verify" });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Inscription échouée. Veuillez réessayer.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Créer votre compte"
      subtitle="Créez votre compte pour commencer une veille IA personnalisée."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link
            to="/auth/login"
            className="font-semibold text-primary hover:underline"
          >
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.com"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Nom d'utilisateur</label>
          <input
            type="text"
            required
            minLength={3}
            maxLength={50}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="votre_pseudo"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Mot de passe</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 caractères"
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
        </div>

        <button
          disabled={loading}
          className="w-full rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-60 transition hover:opacity-95"
        >
          {loading ? "Création du compte…" : "Commencer ma veille"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          En vous inscrivant, vous acceptez nos conditions et notre politique de
          confidentialité.
        </p>
      </form>
    </AuthShell>
  );
}
