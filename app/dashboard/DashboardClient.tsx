"use client";

// The dashboard shell: a fixed left rail (views + account) and a content area, below the
// shared site header. Views:
//   - "Recommended colleges": no list yet → "Find colleges" CTA; building → the quiz (full
//     width, rail slides away); has a list → reach / match / safety results.
//   - "Saved colleges": colleges the student bookmarked from their list; empty by default.
//
// Starting the quiz is a phased, animated transition (idle → opening → wizard): the rail
// fades/slides out, a beat passes, then the first question pops in. Closing reverses it.
// The wizard is mounted under WizardProvider at the shell level, so its progress survives.
// Completion drops the result into state and renders it in place.

import { useEffect, useRef, useState } from "react";
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

type TabKey = "recommended" | "saved";
const TABS: { key: TabKey; label: string }[] = [
  { key: "recommended", label: "Recommended colleges" },
  { key: "saved", label: "Saved colleges" },
];

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
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("recommended");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [saved, setSaved] = useState<CollegeScore[]>([]);
  const [filter, setFilter] = useState<BandFilter>("all");
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<CollegeScore | null>(null);
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
  const toggleSave = (c: CollegeScore) =>
    setSaved((prev) =>
      prev.some((s) => s.collegeId === c.collegeId)
        ? prev.filter((s) => s.collegeId !== c.collegeId)
        : [...prev, c],
    );

  const focused = phase !== "idle"; // rail slid away, content full width
  const hasList = !!result && !result.empty && (result.list?.length ?? 0) > 0;
  const displayName = user.name ?? user.email ?? "Your account";
  const initial = (user.name ?? user.email ?? "U").trim().charAt(0).toUpperCase();

  // `explicitExplore` renders a dedicated "Explore" button and makes the body static
  // (used in the Saved tab); otherwise the whole card body opens the Explorer.
  const renderCard = (c: CollegeScore, explicitExplore = false) => {
    const on = isSaved(c.collegeId);
    const body = (
      <>
        <span className="rs-card__name">{c.name}</span>
        <span className="rs-card__rate">
          {pct(c.overallAdmitRate)} <em>acceptance rate</em>
        </span>
      </>
    );
    return (
      <div key={c.collegeId} className={`rs-card rs-card--${c.band}`}>
        {explicitExplore ? (
          <div className="rs-card__open rs-card__open--static">{body}</div>
        ) : (
          <button type="button" className="rs-card__open" onClick={() => setSelected(c)}>
            {body}
          </button>
        )}
        <div className="rs-card__actions">
          {explicitExplore && (
            <button type="button" className="rs-card__explore" onClick={() => setSelected(c)}>
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
            onClick={() => toggleSave(c)}
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
                {t.key === "saved" && saved.length > 0 && <span className="dash__tab-count">{saved.length}</span>}
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
          ) : tab === "saved" ? (
            <section className="dash__view">
              <header className="dash__view-head">
                <h1 className="dash__view-title">Saved colleges</h1>
                <p className="dash__view-sub">Colleges you've set aside from your list.</p>
              </header>
              {saved.length === 0 ? (
                <div className="dash__empty">
                  <div className="dash__empty-card">
                    <span className="dash__empty-mark" aria-hidden="true" />
                    <h1 className="dash__empty-title">No saved colleges yet</h1>
                    <p className="dash__empty-sub">Save colleges to explore further.</p>
                  </div>
                </div>
              ) : (
                <>
                  {filterBar}
                  {(() => {
                    const visible = saved.filter((c) => filter === "all" || c.band === filter);
                    return visible.length ? (
                      <div className="rs-band__list">{visible.map((c) => renderCard(c, true))}</div>
                    ) : (
                      <p className="dash__filter-empty">No saved colleges in this category.</p>
                    );
                  })()}
                </>
              )}
            </section>
          ) : (
            <section className="dash__view">
              {hasList ? (
                <>
                  <header className="dash__view-head dash__view-head--row">
                    <div>
                      <h1 className="dash__view-title">Your recommended colleges</h1>
                      <p className="dash__view-sub">Select a college to explore how you fit, or save it for later.</p>
                    </div>
                    <button type="button" className="btn btn--ghost" onClick={openQuiz}>
                      Edit answers &amp; re-run
                    </button>
                  </header>

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
                    <h1 className="dash__empty-title">No colleges matched your filters</h1>
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
                    <h1 className="dash__empty-title">No colleges yet</h1>
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
          )}
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
