"use client";

// Profile — account and data settings. Not the academic profile; that's Home.
//
// There is very little to configure here yet, and rather than pad it with switches that
// don't do anything, the page tells the truth about two things that are genuinely worth
// knowing: where the account details come from (the provider, not us — so they're shown
// rather than edited), and where each piece of the student's work is actually kept.
//
// The data controls are real deletions, so each one asks first and says exactly what
// goes. They're the only part of this page that changes anything.

import { useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { useWizard } from "@/app/build/WizardProvider";
import { DEFAULT_DATA } from "@/app/build/model";
import Reveal from "./Reveal";

interface DashUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

type Confirm = {
  title: string;
  body: string;
  action: string;
  run: () => void;
};

export default function ProfileView({
  user,
  savedCount,
  hasRun,
  onClearSaved,
  onClearRun,
}: {
  user: DashUser;
  savedCount: number;
  hasRun: boolean;
  onClearSaved: () => void;
  onClearRun: () => void;
}) {
  const { data, update, setStep } = useWizard();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const initial = (user.name ?? user.email ?? "U").trim().charAt(0).toUpperCase();

  // How much of the quiz has actually been filled in — so "Clear answers" can say what
  // it would cost rather than asking about an empty form.
  const answered =
    data.gpaUnweighted.trim() !== "" ||
    data.satSuperscore.trim() !== "" ||
    data.actSuperscore.trim() !== "" ||
    data.majorCip.trim() !== "" ||
    data.homeState.trim() !== "" ||
    data.activities.length > 0;

  const clearAnswers = () => {
    // Reset the live wizard rather than the storage key: the provider owns that key and
    // writes its in-memory copy back on the next change, so deleting it underneath would
    // last until the student touched a single field.
    update(DEFAULT_DATA);
    setStep(0);
    setDone("Quiz answers cleared.");
  };

  const rows: {
    key: string;
    title: string;
    where: string;
    detail: string;
    action?: { label: string; confirm: Confirm };
  }[] = [
    {
      key: "answers",
      title: "Quiz answers",
      where: "This browser",
      detail: answered
        ? "Your grades, scores, activities and preferences. They never leave this device unless you run a search."
        : "Nothing filled in yet. Your answers stay on this device unless you run a search.",
      ...(answered
        ? {
            action: {
              label: "Clear answers",
              confirm: {
                title: "Clear your quiz answers?",
                body: "Every answer goes back to empty, and you'd start the quiz from the first question. Your saved colleges and your current list are left alone.",
                action: "Clear answers",
                run: clearAnswers,
              },
            },
          }
        : {}),
    },
    {
      key: "saved",
      title: "Saved colleges",
      where: "This browser",
      detail: savedCount
        ? `${savedCount} college${savedCount === 1 ? "" : "s"} set aside, along with any personalized insights generated for them.`
        : "Nothing saved yet.",
      ...(savedCount
        ? {
            action: {
              label: "Clear saved list",
              confirm: {
                title: `Remove all ${savedCount} saved colleges?`,
                body: "The list empties and any personalized insights we've stored for those colleges are permanently deleted. Your answers and your recommendations are left alone.",
                action: "Remove & delete",
                run: () => {
                  onClearSaved();
                  setDone("Saved colleges cleared.");
                },
              },
            },
          }
        : {}),
    },
    {
      key: "run",
      title: "Your recommendations",
      where: "This browser, until you close the tab",
      detail: hasRun
        ? "The list from your last search. Running the quiz again replaces it."
        : "No search run yet.",
      ...(hasRun
        ? {
            action: {
              label: "Clear last run",
              confirm: {
                title: "Clear your recommendations?",
                body: "The reach / match / safety list goes away and you'd run the quiz again to rebuild it. Your answers and your saved colleges are left alone.",
                action: "Clear list",
                run: () => {
                  onClearRun();
                  setDone("Recommendations cleared.");
                },
              },
            },
          }
        : {}),
    },
  ];

  const field = (label: string, value: ReactNode) => (
    <div className="pf-field">
      <dt className="pf-field__label">{label}</dt>
      <dd className="pf-field__value">{value}</dd>
    </div>
  );

  return (
    <section className="dash__view pf">
      {done && (
        <p className="pf__done" role="status">
          {done}
        </p>
      )}

      <Reveal>
        <div className="stat-card pf-card">
          <h2 className="stat-card__title">Account</h2>

          <div className="pf-id">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="pf-id__avatar" src={user.image} alt="" />
            ) : (
              <span className="pf-id__avatar pf-id__avatar--initial" aria-hidden="true">
                {initial}
              </span>
            )}
            <dl className="pf-fields">
              {field("Name", user.name ?? <span className="pf-field__none">Not provided</span>)}
              {field("Email", user.email ?? <span className="pf-field__none">Not provided</span>)}
            </dl>
          </div>

          <p className="pf-note">
            Your name, email and picture come from the account you signed in with. Change them
            there and they'll update here the next time you sign in.
          </p>

          <div className="pf-card__foot">
            <button type="button" className="btn btn--ghost" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="stat-card pf-card">
          <h2 className="stat-card__title">Your data</h2>
          <p className="pf-note pf-note--lead">
            Uniseek works without an account, so most of your work is kept in this browser rather
            than on our servers. Clearing your browser data clears it too.
          </p>

          <ul className="pf-rows">
            {rows.map((r) => (
              <li key={r.key} className="pf-row">
                <div className="pf-row__text">
                  <p className="pf-row__title">
                    {r.title}
                    <span className="pf-row__where">{r.where}</span>
                  </p>
                  <p className="pf-row__detail">{r.detail}</p>
                </div>
                {r.action && (
                  <button
                    type="button"
                    className="btn btn--ghost pf-row__btn"
                    onClick={() => setConfirm(r.action!.confirm)}
                  >
                    {r.action.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      {confirm && (
        <div className="rs-modal" role="dialog" aria-modal="true" onClick={() => setConfirm(null)}>
          <div className="rs-modal__card" onClick={(e) => e.stopPropagation()}>
            <h3 className="rs-modal__title">{confirm.title}</h3>
            <p className="rs-modal__body">{confirm.body}</p>
            <div className="rs-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  confirm.run();
                  setConfirm(null);
                }}
              >
                {confirm.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
