"use client";

// The one-at-a-time preference card deck (§3 prefs). 11 cards: 6 directional, the
// setting multi-select, then 4 magnitude-only. Each card asks "how much do you care"
// (weight 0–4) and, for directional factors, which way you lean.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "../WizardProvider";
import {
  FACTORS, WEIGHT_LABELS, type FactorKey, type SettingValue,
} from "../model";
import { toPayload, validate } from "../toPayload";
import { USE_PLACEHOLDER_RESULTS, PLACEHOLDER_RESULT } from "../placeholderResult";

type Card =
  | { type: "factor"; factor: (typeof FACTORS)[number] }
  | { type: "setting" };

const directional = FACTORS.filter((f) => f.kind === "directional");
const magnitude = FACTORS.filter((f) => f.kind === "magnitude");
const CARDS: Card[] = [
  ...directional.map((factor) => ({ type: "factor" as const, factor })),
  { type: "setting" as const },
  ...magnitude.map((factor) => ({ type: "factor" as const, factor })),
];

const SETTINGS: { value: SettingValue; label: string }[] = [
  { value: "URBAN", label: "Urban" },
  { value: "SUBURBAN", label: "Suburban" },
  { value: "RURAL", label: "Rural" },
];

function WeightPills({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="wz-weight">
      {WEIGHT_LABELS.map((label, i) => (
        <button
          key={i}
          type="button"
          className={`wz-weight__pill ${value === i ? "is-active" : ""}`}
          onClick={() => onChange(i)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Direction({ value, onChange, low, high }: { value: number; onChange: (n: number) => void; low: string; high: string }) {
  return (
    <div className="wz-direction">
      <span className="wz-direction__pole">{low}</span>
      <div className="wz-direction__dots">
        {[0, 1, 2, 3, 4].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i}`}
            className={`wz-direction__dot ${value === i ? "is-active" : ""}`}
            onClick={() => onChange(i)}
          />
        ))}
      </div>
      <span className="wz-direction__pole">{high}</span>
    </div>
  );
}

export default function Preferences() {
  const { data, update, back, onComplete } = useWizard();
  const router = useRouter();
  const [card, setCard] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hand the result to the embedding surface (the dashboard renders it in place). If
  // there's no embedder, fall back to the dashboard route.
  const finish = (result: unknown) => {
    if (onComplete) onComplete(result);
    else router.push("/dashboard");
  };

  const spec = CARDS[card];
  const isLast = card === CARDS.length - 1;

  const setPref = (key: FactorKey, patch: Partial<{ weight: number; direction: number }>) =>
    update({ prefs: { ...data.prefs, [key]: { ...data.prefs[key], ...patch } } });

  const goBack = () => (card === 0 ? back() : setCard(card - 1));

  const submit = async () => {
    // Testing shortcut: skip the API call (and the classifier) and show a
    // placeholder list. Toggle with NEXT_PUBLIC_USE_PLACEHOLDER_RESULTS.
    if (USE_PLACEHOLDER_RESULTS) {
      sessionStorage.setItem("uniseek.result.v1", JSON.stringify(PLACEHOLDER_RESULT));
      finish(PLACEHOLDER_RESULT);
      return;
    }

    const issues = validate(data);
    if (issues.length) {
      setError(issues[0].message);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(data)),
      });
      if (!res.ok) {
        setError("Something went wrong scoring your profile. Please try again.");
        setSubmitting(false);
        return;
      }
      const result = await res.json();
      sessionStorage.setItem("uniseek.result.v1", JSON.stringify(result));
      finish(result);
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="wz-step">
      <div className="wz-card">
        <span className="wz-card__count">{card + 1} of {CARDS.length}</span>

        {spec.type === "factor" ? (
          <>
            <h3 className="wz-card__title">{spec.factor.label}</h3>
            {spec.factor.hint && <p className="wz-card__hint">{spec.factor.hint}</p>}
            <p className="wz-card__q">How much do you care?</p>
            <WeightPills
              value={data.prefs[spec.factor.key].weight}
              onChange={(w) => setPref(spec.factor.key, { weight: w })}
            />
            {spec.factor.kind === "directional" && data.prefs[spec.factor.key].weight > 0 && (
              <>
                <p className="wz-card__q">Which way do you lean?</p>
                <Direction
                  value={data.prefs[spec.factor.key].direction}
                  onChange={(d) => setPref(spec.factor.key, { direction: d })}
                  low={spec.factor.low!}
                  high={spec.factor.high!}
                />
              </>
            )}
          </>
        ) : (
          <>
            <h3 className="wz-card__title">Campus setting</h3>
            <p className="wz-card__hint">Pick any that appeal to you.</p>
            <p className="wz-card__q">How much do you care?</p>
            <WeightPills
              value={data.setting.weight}
              onChange={(w) => update({ setting: { ...data.setting, weight: w } })}
            />
            {data.setting.weight > 0 && (
              <div className="wz-chips">
                {SETTINGS.map((s) => {
                  const on = data.setting.selections.includes(s.value);
                  return (
                    <button
                      key={s.value}
                      type="button"
                      className={`wz-chip ${on ? "is-on" : ""}`}
                      onClick={() =>
                        update({
                          setting: {
                            ...data.setting,
                            selections: on
                              ? data.setting.selections.filter((v) => v !== s.value)
                              : [...data.setting.selections, s.value],
                          },
                        })
                      }
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {error && <p className="wz-error">{error}</p>}

      <div className="wizard__nav">
        <button type="button" className="btn btn--ghost" onClick={goBack} disabled={submitting}>
          Back
        </button>
        {isLast ? (
          <button type="button" className="btn btn--primary" onClick={submit} disabled={submitting}>
            {submitting ? "Finding colleges…" : "Find colleges"}
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => setCard(card + 1)}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
