import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/components/site/AuthShell";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({ meta: [{ title: "Inscription — VeillIA" }] }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Frontend-only mock: store email and pretend a code was emailed.
    if (typeof window !== "undefined") {
      window.localStorage.setItem("veillia_signup_email", email);
    }
    setTimeout(() => navigate({ to: "/auth/verify" }), 600);
  };

  return (
    <AuthShell
      title="Créer votre compte"
      subtitle="Recevez un code par email pour finaliser l'inscription."
      footer={<>Déjà inscrit ? <Link to="/auth/login" className="font-semibold text-primary hover:underline">Se connecter</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
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
          className="w-full rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-60"
        >
          {loading ? "Envoi du code…" : "Recevoir le code"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          En vous inscrivant, vous acceptez nos conditions et notre politique de confidentialité.
        </p>
      </form>
    </AuthShell>
  );
}
