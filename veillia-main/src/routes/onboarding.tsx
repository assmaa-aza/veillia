import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import { AuthShell } from "@/components/site/AuthShell";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — VeillIA" }] }),
  component: Onboarding,
});

const profiles = ["Étudiant", "Ingénieur", "Chercheur", "Entrepreneur", "Investisseur", "Responsable innovation"];
const domains = ["LLM", "Vision par ordinateur", "Robotique", "IA générative", "Cybersécurité", "Data Engineering", "Cloud", "Réglementation IA"];
const techs = ["OpenAI", "Anthropic", "Mistral", "Google DeepMind", "Meta AI", "Hugging Face", "NVIDIA", "Agents IA"];
const freqs = [
  { id: "rt", label: "Temps réel", desc: "Notifications dès qu'une actualité tombe." },
  { id: "daily", label: "Quotidien", desc: "Un digest chaque matin." },
  { id: "weekly", label: "Hebdomadaire", desc: "Un récap chaque lundi." },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [followed, setFollowed] = useState<string[]>([]);
  const [freq, setFreq] = useState<string | null>(null);

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const next = () => setStep((s) => Math.min(3, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));
  const finish = () => navigate({ to: "/dashboard" });

  const canNext =
    (step === 0 && profile) ||
    (step === 1 && picked.length > 0) ||
    (step === 2 && followed.length > 0) ||
    (step === 3 && freq);

  return (
    <AuthShell title="Personnalisons votre veille" subtitle={`Étape ${step + 1} sur 4`}>
      {/* Progress */}
      <div className="mb-6 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-gradient-brand" : "bg-muted"}`} />
        ))}
      </div>

      {step === 0 && (
        <div>
          <h2 className="text-lg font-semibold">Qui êtes-vous ?</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {profiles.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProfile(p)}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${profile === p ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-accent/40"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold">Quels domaines vous intéressent ?</h2>
          <p className="text-sm text-muted-foreground">Sélectionnez-en au moins un.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {domains.map((d) => {
              const on = picked.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggle(picked, setPicked, d)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-accent/40"}`}
                >
                  {on && <Check className="h-3.5 w-3.5" />} {d}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold">Quelles entreprises ou technologies suivez-vous ?</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {techs.map((t) => {
              const on = followed.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(followed, setFollowed, t)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-accent/40"}`}
                >
                  {on && <Check className="h-3.5 w-3.5" />} {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold">Fréquence des alertes</h2>
          <div className="mt-4 space-y-2">
            {freqs.map((f) => {
              const on = freq === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFreq(f.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${on ? "border-primary bg-primary/5" : "border-border hover:border-accent/40"}`}
                >
                  <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    {on && <Check className="h-3 w-3" />}
                  </div>
                  <div>
                    <div className="font-semibold">{f.label}</div>
                    <div className="text-sm text-muted-foreground">{f.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
          <button
            type="button"
            onClick={finish}
            className="rounded-xl border border-dashed border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Passer
          </button>
        </div>
        {step < 3 ? (
          <button
            type="button"
            onClick={next}
            disabled={!canNext}
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-brand px-5 py-2 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
          >
            Continuer <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            disabled={!canNext}
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-brand px-5 py-2 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
          >
            Accéder à VeillIA <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </AuthShell>
  );
}
