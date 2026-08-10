"use client";

// Compare — saved colleges side by side, one column each.
//
// The set to compare from is the saved list rather than the whole recommendation list:
// saving is already the gesture for "I'm weighing this one", and a comparison of twelve
// colleges is a spreadsheet, not a decision aid. Four columns is the cap; past that the
// columns are too narrow to read and nobody is really comparing them anyway.
//
// Every row is a figure we hold for every college, so no cell is ever a shrug. Where a
// row can be ranked, the standout cell is marked — that's the only reason to put these
// next to each other, and it's stated as a fact ("lowest cost") rather than as a verdict
// about which college is better.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useWizard } from "@/app/build/WizardProvider";
import Reveal from "./Reveal";

interface CollegeScore {
  collegeId: string;
  name: string;
  band: "reach" | "target" | "safety";
  overallAdmitRate: number | null;
  netPrice?: number | null;
}

const BAND_LABEL: Record<CollegeScore["band"], string> = {
  reach: "Reach",
  target: "Match",
  safety: "Safety",
};

const MAX_COLUMNS = 4;

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);
const num = (s?: string): number | null => {
  if (s == null || `${s}`.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

type Row = {
  key: string;
  label: string;
  hint?: string;
  // The cell as it reads. Rows that can't be ranked stop here.
  render: (c: CollegeScore) => ReactNode;
  // Ranking: the number to compare, which end wins, and what to call the winner.
  rank?: { of: (c: CollegeScore) => number | null; best: "high" | "low"; caption: string };
};

export default function CompareView({ saved }: { saved: CollegeScore[] }) {
  const { data, hydrated } = useWizard();
  const budget = hydrated ? num(data.budgetMaxNetPrice) : null;

  const [picked, setPicked] = useState<string[]>([]);

  // Start with the first few saved colleges, and drop any that leave the saved list
  // while this view is open — a column for a college you just unsaved is a ghost.
  useEffect(() => {
    setPicked((prev) => {
      const stillSaved = prev.filter((id) => saved.some((s) => s.collegeId === id));
      if (stillSaved.length) return stillSaved;
      return saved.slice(0, Math.min(3, MAX_COLUMNS)).map((s) => s.collegeId);
    });
  }, [saved]);

  const columns = useMemo(
    () => picked.map((id) => saved.find((s) => s.collegeId === id)).filter((c): c is CollegeScore => !!c),
    [picked, saved],
  );

  const toggle = (id: string) =>
    setPicked((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length >= MAX_COLUMNS
          ? prev
          : [...prev, id],
    );

  const headroom = (c: CollegeScore) =>
    budget != null && c.netPrice != null ? budget - c.netPrice : null;

  const rows: Row[] = [
    {
      key: "band",
      label: "Category",
      hint: "how far a stretch this one is for you",
      render: (c) => <span className={`cmp__chip cmp__chip--${c.band}`}>{BAND_LABEL[c.band]}</span>,
    },
    {
      key: "rate",
      label: "Acceptance rate",
      hint: "share of all applicants admitted",
      render: (c) => <span className="cmp__num">{pct(c.overallAdmitRate)}</span>,
      rank: { of: (c) => c.overallAdmitRate ?? null, best: "high", caption: "least selective" },
    },
    {
      key: "net",
      label: "Net price for you",
      hint: "estimated from your income band",
      render: (c) => <span className="cmp__num">{c.netPrice != null ? money(c.netPrice) : "—"}</span>,
      rank: { of: (c) => c.netPrice ?? null, best: "low", caption: "lowest cost" },
    },
    ...(budget != null
      ? [
          {
            key: "headroom",
            label: "Against your budget",
            hint: `you set ${money(budget)} a year`,
            render: (c: CollegeScore) => {
              const h = headroom(c);
              if (h == null) return <span className="cmp__num">—</span>;
              return (
                <span className={`cmp__delta ${h >= 0 ? "is-under" : "is-over"}`}>
                  {money(Math.abs(h))} {h >= 0 ? "under" : "over"}
                </span>
              );
            },
            rank: { of: (c: CollegeScore) => headroom(c), best: "high" as const, caption: "most room" },
          },
        ]
      : []),
  ];

  // The standout cell per row, or null when there's nothing to separate them — a single
  // column, or a tie, means nothing gets marked.
  const winnerOf = (row: Row): string | null => {
    if (!row.rank || columns.length < 2) return null;
    const scored = columns
      .map((c) => ({ id: c.collegeId, v: row.rank!.of(c) }))
      .filter((s): s is { id: string; v: number } => s.v != null);
    if (scored.length < 2) return null;
    const best = scored.reduce((a, b) => (row.rank!.best === "high" ? (b.v > a.v ? b : a) : b.v < a.v ? b : a));
    if (scored.filter((s) => s.v === best.v).length > 1) return null;
    return best.id;
  };

  if (saved.length < 2) {
    return (
      <section className="dash__view">
        <div className="dash__empty">
          <div className="dash__empty-card">
            <span className="dash__empty-mark" aria-hidden="true" />
            <h2 className="dash__empty-title">Save two colleges to compare them</h2>
            <p className="dash__empty-sub">
              {saved.length === 1
                ? "One college is saved. Save another from your recommended list and they'll line up side by side here."
                : "Bookmark colleges from your recommended list and they'll line up side by side here — category, acceptance rate, and what each would cost you."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dash__view">
      <Reveal>
        <div className="stat-card cmp">
          <div className="cmp__picker">
            <p className="cmp__picker-label">
              Comparing {columns.length} of {saved.length} saved
              <span className="cmp__picker-hint"> · up to {MAX_COLUMNS} at once</span>
            </p>
            <div className="cmp__chips">
              {saved.map((c) => {
                const on = picked.includes(c.collegeId);
                const full = !on && picked.length >= MAX_COLUMNS;
                return (
                  <button
                    key={c.collegeId}
                    type="button"
                    className={`cmp__pick ${on ? "is-on" : ""}`}
                    onClick={() => toggle(c.collegeId)}
                    disabled={full}
                    aria-pressed={on}
                    title={full ? `Remove one first — ${MAX_COLUMNS} is the maximum` : undefined}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {columns.length === 0 ? (
            <p className="cmp__none">Pick at least one college above.</p>
          ) : (
            <div className="cmp__scroll">
              <div
                className="cmp__grid"
                style={{ gridTemplateColumns: `minmax(150px, 200px) repeat(${columns.length}, minmax(170px, 1fr))` }}
              >
                <div className="cmp__corner" />
                {columns.map((c) => (
                  <div key={c.collegeId} className="cmp__head">
                    <span className="cmp__name">{c.name}</span>
                    <button
                      type="button"
                      className="cmp__drop"
                      onClick={() => toggle(c.collegeId)}
                      aria-label={`Remove ${c.name} from the comparison`}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {rows.map((row) => {
                  const winner = winnerOf(row);
                  return (
                    <div key={row.key} className="cmp__row" role="row">
                      <div className="cmp__rowlabel">
                        {row.label}
                        {row.hint && <span className="cmp__rowhint">{row.hint}</span>}
                      </div>
                      {columns.map((c) => (
                        <div
                          key={c.collegeId}
                          className={`cmp__cell ${winner === c.collegeId ? "is-best" : ""}`}
                        >
                          {row.render(c)}
                          {winner === c.collegeId && row.rank && (
                            <span className="cmp__flag">{row.rank.caption}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="cmp__foot">
            Marked cells stand out on that row alone. Nothing here says which college is the better
            choice — that depends on things this table doesn't hold.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
