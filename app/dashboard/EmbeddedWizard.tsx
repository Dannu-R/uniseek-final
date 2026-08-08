"use client";

// The intake wizard, rendered INSIDE a dashboard tab (not on its own route). It reuses
// the shared step components and the WizardProvider state, so switching tabs mid-quiz
// keeps every answer (state is provider- and localStorage-backed). Completion is handled
// by the provider's onComplete — the dashboard renders the resulting list in place.

import { useWizard } from "@/app/build/WizardProvider";
import { STEPS } from "@/app/build/model";
import Academics from "@/app/build/steps/Academics";
import Goals from "@/app/build/steps/Goals";
import Filters from "@/app/build/steps/Filters";
import Preferences from "@/app/build/steps/Preferences";

const STEP_COMPONENTS = [Academics, Goals, Filters, Preferences];

function Progress({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <ol className="wz-progress">
      {STEPS.map((label, i) => (
        <li key={label} className={`wz-progress__item ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}>
          <button type="button" className="wz-progress__dot" onClick={() => i < step && onJump(i)} aria-current={i === step}>
            {i < step ? "✓" : i + 1}
          </button>
          <span className="wz-progress__label">{label}</span>
        </li>
      ))}
    </ol>
  );
}

export default function EmbeddedWizard({ onExit }: { onExit?: () => void }) {
  const { step, next, back, setStep, hydrated } = useWizard();
  if (!hydrated) return <div className="wizard wizard--loading" />;

  const StepComponent = STEP_COMPONENTS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="wizard wizard--embedded">
      <div className="wizard__inner">
        <header className="wizard__head">
          <Progress step={step} onJump={setStep} />
          {onExit && (
            <button type="button" className="wizard__exit" onClick={onExit}>
              Save &amp; close
            </button>
          )}
        </header>

        <main className="wizard__panel">
          <h2 className="wizard__title">{STEPS[step]}</h2>
          <StepComponent />
        </main>

        {/* The Preferences step (card deck) renders its own Back / Find colleges nav. */}
        {!isLast && (
          <footer className="wizard__nav">
            <button type="button" className="btn btn--ghost" onClick={back} disabled={step === 0}>
              Back
            </button>
            <button type="button" className="btn btn--primary" onClick={next}>
              Next
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
