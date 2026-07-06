import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/components/site/AuthShell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Connexion — VeillIA" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const name = email.split("@")[0] || "Explorer";
    signIn({ name: name.charAt(0).toUpperCase() + name.slice(1), email });
    setTimeout(() => navigate({ to: "/dashboard" }), 300);
  };

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Connectez-vous à votre espace VeillIA."
      footer={<>Pas encore inscrit ? <Link to="/auth/signup" className="font-semibold text-primary hover:underline">Créer un compte</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Mot de passe</label>
            <a href="#" className="text-xs text-primary hover:underline">Oublié ?</a>
          </div>
          <input type="password" required className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30" />
        </div>
        <button disabled={loading} className="w-full rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-60">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </AuthShell>
  );
}
