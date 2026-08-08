"use client";

// The dashboard shell: a fixed left rail (views + account) and a content area. The only
// view today is "Recommended colleges", which has three states:
//   1. no list yet, not building  → centered "Find colleges" call to action
//   2. building                   → the intake wizard, embedded in the tab
//   3. has a list                 → the reach / match / safety results
// The wizard is mounted under WizardProvider at the shell level, so switching views
// mid-quiz never loses progress. Completion (onComplete) drops the result into state and
// renders it in place — no navigation.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { WizardProvider } from "@/app/build/WizardProvider";
import EmbeddedWizard from "./EmbeddedWizard";

interface DashUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface CollegeScore {
  collegeId: string;
  name: string;
  band: "reach" | "target" | "safety";
  overallAdmitRate: number | null;
}
interface ScoreResult {
  empty?: boolean;
  blockingFilter?: string | null;
  list: CollegeScore[];
}

type TabKey = "recommended";
const TABS: { key: TabKey; label: string }[] = [{ key: "recommended", label: "Recommended colleges" }];

const RESULT_KEY = "uniseek.result.v1";
const UI_KEY = "uniseek.dashboard.v1";

const BANDS: { key: CollegeScore["band"]; label: string; blurb: string }[] = [
  { key: "reach", label: "Reach", blurb: "Ambitious — worth a shot" },
  { key: "target", label: "Match", blurb: "Realistic matches" },
  { key: "safety", label: "Safety", blurb: "Very likely admits" },
];

const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);

export default function DashboardClient({ user }: { user: DashUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("recommended");
  const [building, setBuilding] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<CollegeScore | null>(null);

  // Hydrate result + UI state from storage once.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RESULT_KEY);
      if (raw) setResult(JSON.parse(raw));
      const ui = sessionStorage.getItem(UI_KEY);
      if (ui) {
        const parsed = JSON.parse(ui) as { building?: boolean };
        if (parsed.building) setBuilding(true);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  // Persist the "building" flag so a refresh resumes the wizard rather than the CTA.
  useEffect(() => {
    if (loaded) {
      try {
        sessionStorage.setItem(UI_KEY, JSON.stringify({ building }));
      } catch {
        /* ignore quota */
      }
    }
  }, [building, loaded]);

  const handleComplete = (r: unknown) => {
    setResult(r as ScoreResult);
    setBuilding(false);
  };

  const hasList = !!result && !result.empty && (result.list?.length ?? 0) > 0;
  const displayName = user.name ?? user.email ?? "Your account";
  const initial = (user.name ?? user.email ?? "U").trim().charAt(0).toUpperCase();

  return (
    <WizardProvider onComplete={handleComplete}>
      <div className="dash">
        <aside className="dash__rail">
          <div className="dash__brand">
            <span className="dash__brand-mark" aria-hidden="true" />
            Uniseek
          </div>

          <nav className="dash__nav" aria-label="Views">
            <p className="dash__nav-label">Views</p>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`dash__tab ${tab === t.key ? "is-active" : ""}`}
                onClick={() => setTab(t.key)}
                aria-current={tab === t.key}
              >
                <span className="dash__tab-mark" aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </nav>

          <div className="dash__account">
            <div className="dash__user">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="dash__avatar" src={user.image} alt="" />
              ) : (
                <span className="dash__avatar dash__avatar--initial" aria-hidden="true">{initial}</span>
              )}
              <span className="dash__user-name" title={user.email ?? undefined}>{displayName}</span>
            </div>
            <button type="button" className="dash__signout" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </button>
          </div>
        </aside>

        <main className="dash__main">
          {!loaded ? (
            <div className="dash__loading" />
          ) : tab === "recommended" ? (
            <section className="dash__view">
              {building ? (
                <>
                  <header className="dash__view-head">
                    <h1 className="dash__view-title">Find your colleges</h1>
                    <p className="dash__view-sub">Answer a few questions — your progress is saved as you go.</p>
                  </header>
                  <EmbeddedWizard onExit={() => setBuilding(false)} />
                </>
              ) : hasList ? (
                <>
                  <header className="dash__view-head dash__view-head--row">
                    <div>
                      <h1 className="dash__view-title">Your recommended colleges</h1>
                      <p className="dash__view-sub">Select a college to explore how you fit.</p>
                    </div>
                    <button type="button" className="btn btn--ghost" onClick={() => setBuilding(true)}>
                      Edit answers &amp; re-run
                    </button>
                  </header>

                  {BANDS.map(({ key, label, blurb }) => {
                    const cols = result!.list.filter((c) => c.band === key);
                    if (cols.length === 0) return null;
                    return (
                      <div key={key} className="rs-band">
                        <div className="rs-band__head">
                          <h2 className={`rs-band__title rs-band__title--${key}`}>{label}</h2>
                          <span className="rs-band__blurb">{blurb}</span>
                        </div>
                        <div className="rs-band__list">
                          {cols.map((c) => (
                            <button
                              key={c.collegeId}
                              type="button"
                              className={`rs-card rs-card--${c.band}`}
                              onClick={() => setSelected(c)}
                            >
                              <span className="rs-card__name">{c.name}</span>
                              <span className="rs-card__rate">
                                {pct(c.overallAdmitRate)} <em>acceptance rate</em>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : result?.empty ? (
                <div className="dash__empty">
                  <div className="dash__empty-card">
                    <h1 className="dash__empty-title">No colleges matched your filters</h1>
                    <p className="dash__empty-sub">
                      {result.blockingFilter
                        ? `Your ${result.blockingFilter} filter is the tightest constraint — loosening it would bring colleges back.`
                        : "Try loosening your hard filters, then run the search again."}
                    </p>
                    <button type="button" className="btn btn--primary" onClick={() => setBuilding(true)}>
                      Adjust answers
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dash__empty">
                  <div className="dash__empty-card">
                    <span className="dash__empty-mark" aria-hidden="true" />
                    <h1 className="dash__empty-title">No colleges yet</h1>
                    <p className="dash__empty-sub">
                      Answer a few questions about your grades, goals, and preferences, and we'll build a
                      reach / match / safety list tailored to you.
                    </p>
                    <button type="button" className="btn btn--primary btn--lg" onClick={() => setBuilding(true)}>
                      Find colleges
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </main>
      </div>

      {selected && (
        <div className="rs-modal" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <div className="rs-modal__card" onClick={(e) => e.stopPropagation()}>
            <h3 className="rs-modal__title">See personalized insights for {selected.name}?</h3>
            <p className="rs-modal__body">
              We'll analyze this college against your profile and write up how you fit — it takes a moment.
              We only do this for colleges you choose to explore.
            </p>
            <div className="rs-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setSelected(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => router.push(`/explorer/${selected.collegeId}`)}
              >
                Show me
              </button>
            </div>
          </div>
        </div>
      )}
    </WizardProvider>
  );
}
