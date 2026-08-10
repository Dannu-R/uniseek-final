"use client";

// The dashboard shell: a fixed left rail (views + account) and a content area, below the
// shared site header. Views:
//   - "Home" (the landing view): where the list stands, the academic profile, and cost.
//   - "Recommended colleges": no list yet → "Find colleges" CTA; building → the quiz (full
//     width, rail slides away); has a list → reach / match / safety results.
//   - "Saved colleges": colleges the student bookmarked from their list; empty by default.
//
// Starting the quiz is a phased, animated transition (idle → opening → wizard): the rail
// fades/slides out, a beat passes, then the first question pops in. Closing reverses it.
// The wizard is mounted under WizardProvider at the shell level, so its progress survives.
// Completion drops the result into state and renders it in place.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import { WizardProvider } from "@/app/build/WizardProvider";
import EmbeddedWizard from "./EmbeddedWizard";
import StatsView from "./StatsView";
import ExplorerView from "./ExplorerView";
import ViewHeader from "./ViewHeader";

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
  netPrice?: number | null;
}
interface ScoreResult {
  empty?: boolean;
  blockingFilter?: string | null;
  list: CollegeScore[];
}

type TabKey = "home" | "recommended" | "saved";
type TabDef = { key: TabKey; label: string };

// Home leads — it's the view that says where everything stands. The college views
// sit under their own heading below it.
const HOME_TAB: TabDef = { key: "home", label: "Home" };
const VIEW_TABS: TabDef[] = [
  { key: "recommended", label: "Recommended colleges" },
  { key: "saved", label: "Saved colleges" },
];

// Per-tab line icons (minimalist, currentColor).
const TAB_ICON: Record<TabKey, ReactNode> = {
  recommended: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v5c0 1 2.7 2.4 6 2.4s6-1.4 6-2.4v-5" />
      <path d="M22 10v5" />
    </svg>
  ),
  saved: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3.5l9 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.75 20v-5.5h4.5V20" />
    </svg>
  ),
};

// Phases of the quiz transition. `opening` is the deliberate pause between the rail sliding
// out and the first question appearing.
type Phase = "idle" | "opening" | "wizard" | "closing";
const OPEN_DELAY = 850; // rail slide (0.5s) + a beat before the question pops in
const CLOSE_DELAY = 340; // wizard fades out before the rail slides back

const RESULT_KEY = "uniseek.result.v1";
const UI_KEY = "uniseek.dashboard.v1";
const SAVED_KEY = "uniseek.saved.v1";

const BANDS: { key: CollegeScore["band"]; label: string; blurb: string }[] = [
  { key: "reach", label: "Reach", blurb: "Ambitious — worth a shot" },
  { key: "target", label: "Match", blurb: "Realistic matches" },
  { key: "safety", label: "Safety", blurb: "Very likely admits" },
];

type BandFilter = "all" | CollegeScore["band"];
const FILTERS: { key: BandFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "reach", label: "Reach" },
  { key: "target", label: "Match" },
  { key: "safety", label: "Safety" },
];

const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);

export default function DashboardClient({ user }: { user: DashUser }) {
  const [tab, setTab] = useState<TabKey>("home");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [saved, setSaved] = useState<CollegeScore[]>([]);
  const [filter, setFilter] = useState<BandFilter>("all");
  const [loaded, setLoaded] = useState(false);
  const [exploring, setExploring] = useState<CollegeScore | null>(null);
  const [unsaveTarget, setUnsaveTarget] = useState<CollegeScore | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate result + saved list + UI state once. If we were mid-quiz, restore straight to
  // the wizard (no entrance animation on a reload).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RESULT_KEY);
      if (raw) setResult(JSON.parse(raw));
      const savedRaw = localStorage.getItem(SAVED_KEY);
      if (savedRaw) setSaved(JSON.parse(savedRaw));
      const ui = sessionStorage.getItem(UI_KEY);
      if (ui && (JSON.parse(ui) as { building?: boolean }).building) setPhase("wizard");
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Persist whether we're in the quiz so a refresh resumes it rather than the CTA.
  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(UI_KEY, JSON.stringify({ building: phase === "wizard" || phase === "opening" }));
    } catch {
      /* ignore quota */
    }
  }, [phase, loaded]);

  // Persist the saved list (survives across sessions, unlike the run itself).
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch {
      /* ignore quota */
    }
  }, [saved, loaded]);

  const openQuiz = () => {
    if (timer.current) clearTimeout(timer.current);
    setTab("recommended");
    setPhase("opening");
    timer.current = setTimeout(() => setPhase("wizard"), OPEN_DELAY);
  };
  const closeQuiz = () => {
    if (timer.current) clearTimeout(timer.current);
    setPhase("closing");
    timer.current = setTimeout(() => setPhase("idle"), CLOSE_DELAY);
  };

  const handleComplete = (r: unknown) => {
    setResult(r as ScoreResult);
    closeQuiz();
  };

  const isSaved = (id: string) => saved.some((s) => s.collegeId === id);
  const addSaved = (c: CollegeScore) =>
    setSaved((prev) => (prev.some((s) => s.collegeId === c.collegeId) ? prev : [...prev, c]));
  const removeSaved = (id: string) => setSaved((prev) => prev.filter((s) => s.collegeId !== id));

  // Unsaving clears any personalized insight we stored for this college (session + DB).
  const deleteInsight = (collegeId: string) => {
    try {
      sessionStorage.removeItem(`uniseek.insight.${collegeId}`);
    } catch {
      /* ignore */
    }
    fetch("/api/explore", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collegeId }),
    }).catch(() => {
      /* best-effort */
    });
  };

  // Saving is immediate; unsaving warns first (it deletes personal insights).
  const handleSaveClick = (c: CollegeScore) => {
    if (isSaved(c.collegeId)) setUnsaveTarget(c);
    else addSaved(c);
  };
  const confirmUnsave = () => {
    if (!unsaveTarget) return;
    removeSaved(unsaveTarget.collegeId);
    deleteInsight(unsaveTarget.collegeId);
    setUnsaveTarget(null);
  };

  const focused = phase !== "idle"; // rail slid away, content full width
  const hasList = !!result && !result.empty && (result.list?.length ?? 0) > 0;
  const displayName = user.name ?? user.email ?? "Your account";
  const initial = (user.name ?? user.email ?? "U").trim().charAt(0).toUpperCase();

  // Every card has a static body plus an Explore button and a save toggle.
  const renderCard = (c: CollegeScore) => {
    const on = isSaved(c.collegeId);
    return (
      <div key={c.collegeId} className={`rs-card rs-card--${c.band}`}>
        <div className="rs-card__open rs-card__open--static">
          <span className="rs-card__name">{c.name}</span>
          <span className="rs-card__rate">
            {pct(c.overallAdmitRate)} <em>acceptance rate</em>
          </span>
        </div>
        <div className="rs-card__actions">
          {on && (
            <button type="button" className="rs-card__explore" onClick={() => setExploring(c)}>
              Explore
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className={`rs-card__save ${on ? "is-saved" : ""}`}
            onClick={() => handleSaveClick(c)}
            aria-pressed={on}
            aria-label={on ? `Remove ${c.name} from saved` : `Save ${c.name}`}
            title={on ? "Saved — click to remove" : "Save"}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={on ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const renderTab = (t: TabDef) => (
    <button
      key={t.key}
      type="button"
      className={`dash__tab ${tab === t.key ? "is-active" : ""}`}
      onClick={() => setTab(t.key)}
      aria-current={tab === t.key}
    >
      <span className="dash__tab-icon" aria-hidden="true">
        {TAB_ICON[t.key]}
      </span>
      {t.label}
      {t.key === "saved" && saved.length > 0 && <span className="dash__tab-count">{saved.length}</span>}
    </button>
  );

  const filterBar = (
    <div className="dash__filter" role="group" aria-label="Filter by category">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          className={`dash__filter-btn ${filter === f.key ? "is-active" : ""}`}
          onClick={() => setFilter(f.key)}
          aria-pressed={filter === f.key}
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  return (
    <WizardProvider onComplete={handleComplete}>
      <div className={`dash ${focused ? "is-focused" : ""}`}>
        <aside className="dash__rail">
          <div className="dash__brand">
            <span className="dash__brand-mark" aria-hidden="true" />
            Uniseek
          </div>

          <nav className="dash__nav" aria-label="Dashboard sections">
            {renderTab(HOME_TAB)}
            <div className="dash__nav-divider" aria-hidden="true" />
            <p className="dash__nav-label">Views</p>
            {VIEW_TABS.map(renderTab)}
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
          ) : phase === "opening" ? (
            // Deliberate pause: rail is sliding out, question not shown yet.
            <div className="dash__pause" aria-hidden="true" />
          ) : phase === "wizard" || phase === "closing" ? (
            <div className={`dash__wizard-stage ${phase === "closing" ? "is-out" : "is-in"}`}>
              <button type="button" className="dash__back" onClick={closeQuiz}>
                <svg
                  className="dash__back-arrow"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
                Save &amp; exit
              </button>
              <header className="dash__view-head">
                <h1 className="dash__view-title">Find your colleges</h1>
                <p className="dash__view-sub">Answer a few questions — your progress is saved as you go.</p>
              </header>
              <EmbeddedWizard />
            </div>
          ) : exploring ? (
            <ExplorerView college={exploring} onBack={() => setExploring(null)} />
          ) : tab === "home" ? (
            <>
              <ViewHeader
                title="Home"
                subtitle="Where your list stands, and how your profile looks."
                action={
                  <button type="button" className="btn btn--ghost" onClick={openQuiz}>
                    Edit answers
                  </button>
                }
              />
              <StatsView
                onEdit={openQuiz}
                name={user.name ?? null}
                saved={saved}
                recommended={result?.list ?? []}
              />
            </>
          ) : tab === "saved" ? (
            <>
              <ViewHeader title="Saved colleges" subtitle="Colleges you've set aside from your list." />
              <section className="dash__view">
              {saved.length === 0 ? (
                <div className="dash__empty">
                  <div className="dash__empty-card">
                    <span className="dash__empty-mark" aria-hidden="true" />
                    <h2 className="dash__empty-title">No saved colleges yet</h2>
                    <p className="dash__empty-sub">Save colleges to explore further.</p>
                  </div>
                </div>
              ) : (
                <>
                  {filterBar}
                  {(() => {
                    const visible = saved.filter((c) => filter === "all" || c.band === filter);
                    return visible.length ? (
                      <div className="rs-band__list">{visible.map((c) => renderCard(c))}</div>
                    ) : (
                      <p className="dash__filter-empty">No saved colleges in this category.</p>
                    );
                  })()}
                </>
              )}
              </section>
            </>
          ) : (
            <>
              <ViewHeader
                title="Recommended colleges"
                subtitle={
                  hasList
                    ? "Select a college to explore how you fit, or save it for later."
                    : "Your reach, match, and safety list — built from your answers."
                }
                action={
                  hasList ? (
                    <button type="button" className="btn btn--ghost" onClick={openQuiz}>
                      Edit answers &amp; re-run
                    </button>
                  ) : undefined
                }
              />
              <section className="dash__view">
              {hasList ? (
                <>
                  {filterBar}

                  {BANDS.map(({ key, label, blurb }) => {
                    if (filter !== "all" && filter !== key) return null;
                    const cols = result!.list.filter((c) => c.band === key);
                    if (cols.length === 0) return null;
                    return (
                      <div key={key} className="rs-band">
                        <div className="rs-band__head">
                          <h2 className={`rs-band__title rs-band__title--${key}`}>{label}</h2>
                          <span className="rs-band__blurb">{blurb}</span>
                        </div>
                        <div className="rs-band__list">{cols.map((c) => renderCard(c))}</div>
                      </div>
                    );
                  })}

                  {result!.list.filter((c) => filter === "all" || c.band === filter).length === 0 && (
                    <p className="dash__filter-empty">No colleges in this category.</p>
                  )}
                </>
              ) : result?.empty ? (
                <div className="dash__empty">
                  <div className="dash__empty-card">
                    <h2 className="dash__empty-title">No colleges matched your filters</h2>
                    <p className="dash__empty-sub">
                      {result.blockingFilter
                        ? `Your ${result.blockingFilter} filter is the tightest constraint — loosening it would bring colleges back.`
                        : "Try loosening your hard filters, then run the search again."}
                    </p>
                    <button type="button" className="btn btn--primary" onClick={openQuiz}>
                      Adjust answers
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dash__empty">
                  <div className="dash__empty-card">
                    <span className="dash__empty-mark" aria-hidden="true" />
                    <h2 className="dash__empty-title">No colleges yet</h2>
                    <p className="dash__empty-sub">
                      Answer a few questions about your grades, goals, and preferences, and we'll build a
                      reach / match / safety list tailored to you.
                    </p>
                    <button type="button" className="btn btn--primary btn--lg" onClick={openQuiz}>
                      Find colleges
                    </button>
                  </div>
                </div>
              )}
              </section>
            </>
          )}
        </main>
      </div>

      {unsaveTarget && (
        <div className="rs-modal" role="dialog" aria-modal="true" onClick={() => setUnsaveTarget(null)}>
          <div className="rs-modal__card" onClick={(e) => e.stopPropagation()}>
            <h3 className="rs-modal__title">Remove {unsaveTarget.name} from saved?</h3>
            <p className="rs-modal__body">
              Any personalized insights we've saved for this college will be permanently deleted. You can
              save it again and re-generate them later.
            </p>
            <div className="rs-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setUnsaveTarget(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn--danger" onClick={confirmUnsave}>
                Remove &amp; delete
              </button>
            </div>
          </div>
        </div>
      )}
    </WizardProvider>
  );
}
