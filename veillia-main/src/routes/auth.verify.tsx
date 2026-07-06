import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuthShell } from "@/components/site/AuthShell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/verify")({
  head: () => ({ meta: [{ title: "Vérification — VeillIA" }] }),
  component: Verify,
});

function Verify() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEmail(window.localStorage.getItem("veillia_signup_email") || "");
    }
  }, []);

  const set = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[i] = c;
    setCode(next);
    if (c && i < 5) refs.current[i + 1]?.focus();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.join("").length !== 6) return;
    const name = email.split("@")[0] || "Explorer";
    signIn({ name: name.charAt(0).toUpperCase() + name.slice(1), email });
    navigate({ to: "/onboarding" });
  };

  return (
    <AuthShell
      title="Vérifiez votre email"
      subtitle={email ? `Nous avons envoyé un code à ${email}` : "Saisissez le code reçu par email."}
      footer={<Link to="/auth/signup" className="text-primary hover:underline">Modifier l'email</Link>}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="flex justify-between gap-2">
          {code.map((c, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              value={c}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Backspace" && !c && i > 0) refs.current[i - 1]?.focus(); }}
              inputMode="numeric"
              maxLength={1}
              className="h-12 w-12 rounded-lg border border-input bg-background text-center text-lg font-semibold outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          ))}
        </div>
        <button className="w-full rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand">
          Finaliser l'inscription
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Pas reçu ? <button type="button" className="text-primary hover:underline">Renvoyer le code</button>
        </p>
      </form>
    </AuthShell>
  );
}
