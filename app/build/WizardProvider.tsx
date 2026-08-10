"use client";

// Wizard state — held in the browser (anonymous-first) and persisted to
// localStorage so a refresh doesn't lose the profile. On sign-in (later) this state
// is adopted into the account.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_DATA, FACTORS, STEPS, type WizardData } from "./model";
import { DEMO_PROFILE } from "./demoProfile";

const STORAGE_KEY = "uniseek.profile.v1";
const STEP_KEY = "uniseek.step.v1";

interface WizardContextValue {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  step: number;
  setStep: (n: number) => void;
  next: () => void;
  back: () => void;
  hydrated: boolean;
  // Called when "Find colleges" produces a result. When the wizard is embedded in the
  // dashboard, this hands the result back so it can render in place (no navigation).
  onComplete?: (result: unknown) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

// Bring a profile saved by an older build forward. The boolean `inStateOnly` toggle
// became the three-way state filter (Anywhere / in-state / a specific goal state).
//
// It also repairs the nested objects. Hydration spreads the stored profile over
// DEFAULT_DATA, and that spread is shallow: a stored `prefs` replaces the defaults
// whole rather than filling in around them. So a profile saved before a factor
// existed — or any partial one — arrives missing that factor's entry, and the
// preference cards read `.weight` straight off undefined. Rebuilding from FACTORS
// keeps whatever was stored, fills the gaps, and drops keys for factors that are
// gone.
function migrate(d: WizardData & { inStateOnly?: boolean }): WizardData {
  const { inStateOnly, ...rest } = d;
  if (inStateOnly && rest.stateFilterMode === "ANY") rest.stateFilterMode = "IN_STATE";

  const stored = (rest.prefs ?? {}) as Partial<WizardData["prefs"]>;
  rest.prefs = FACTORS.reduce((acc, f) => {
    const p = stored[f.key];
    acc[f.key] = {
      weight: typeof p?.weight === "number" ? p.weight : 0,
      direction: typeof p?.direction === "number" ? p.direction : 2,
    };
    return acc;
  }, {} as WizardData["prefs"]);

  rest.setting = {
    weight: typeof rest.setting?.weight === "number" ? rest.setting.weight : 0,
    selections: Array.isArray(rest.setting?.selections) ? rest.setting.selections : [],
  };
  rest.activities = Array.isArray(rest.activities) ? rest.activities : [];

  return rest;
}

export function WizardProvider({
  children,
  onComplete,
}: {
  children: ReactNode;
  onComplete?: (result: unknown) => void;
}) {
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [step, setStepState] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once, after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      // Dev-only: /?demo starts from the sample profile instead of storage. It has to
      // happen here — the provider persists whatever it hydrated, so seeding storage
      // from anywhere else just gets written over on the next tick.
      if (process.env.NODE_ENV !== "production" && new URL(window.location.href).searchParams.has("demo")) {
        setData(DEMO_PROFILE);
        setStepState(0);
        setHydrated(true);
        return;
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(migrate({ ...DEFAULT_DATA, ...JSON.parse(raw) }));
      const s = localStorage.getItem(STEP_KEY);
      if (s) setStepState(Math.min(Math.max(0, Number(s)), STEPS.length - 1));
    } catch {
      /* corrupt storage — start fresh */
    }
    setHydrated(true);
  }, []);

  // Persist after hydration.
  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(STEP_KEY, String(step));
  }, [step, hydrated]);

  const update = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));
  const setStep = (n: number) => setStepState(Math.min(Math.max(0, n), STEPS.length - 1));
  const next = () => setStep(step + 1);
  const back = () => setStep(step - 1);

  return (
    <WizardContext.Provider value={{ data, update, step, setStep, next, back, hydrated, onComplete }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
