"use client";

import { WizardProvider, useWizard } from "./WizardProvider";
import { STEPS } from "./model";
import Academics from "./steps/Academics";
import Goals from "./steps/Goals";
import Filters from "./steps/Filters";
import Preferences from "./steps/Preferences";

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

function Shell() {
  const { step, next, back, setStep, hydrated } = useWizard();
  if (!hydrated) return <div className="wizard wizard--loading" />;

  const StepComponent = STEP_COMPONENTS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="wizard">
      <div className="wizard__inner">
        <header className="wizard__head">
          <a className="wizard__brand" href="/">Uniseek</a>
          <Progress step={step} onJump={setStep} />
        </header>

        <main className="wizard__panel">
          <h2 className="wizard__title">{STEPS[step]}</h2>
          <StepComponent />
        </main>

        <footer className="wizard__nav">
          <button type="button" className="btn btn--ghost" onClick={back} disabled={step === 0}>
            Back
          </button>
          {isLast ? (
            <button type="button" className="btn btn--primary" disabled title="Coming in the next build">
              Find colleges
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={next}>
              Next
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

export default function BuildPage() {
  return (
    <WizardProvider>
      <Shell />
    </WizardProvider>
  );
}
