"use client";

import { useWizard } from "../WizardProvider";
import { Field, TextInput, Toggle, Select } from "../fields";
import { ACTIVITY_LEVELS, type ActivityEntry } from "../model";

export default function Academics() {
  const { data, update } = useWizard();

  const setActivity = (i: number, patch: Partial<ActivityEntry>) => {
    const activities = data.activities.map((a, idx) => (idx === i ? { ...a, ...patch } : a));
    update({ activities });
  };
  const addActivity = () => {
    if (data.activities.length >= 10) return;
    update({ activities: [...data.activities, { description: "", hoursPerWeek: "", years: "", level: 1 }] });
  };
  const removeActivity = (i: number) =>
    update({ activities: data.activities.filter((_, idx) => idx !== i) });

  return (
    <div className="wz-step">
      <section className="wz-group">
        <h3 className="wz-group__title">Grades</h3>
        <div className="wz-grid">
          <Field label="Cumulative unweighted GPA" hint="On a 4.0 scale">
            <TextInput value={data.gpaUnweighted} onChange={(v) => update({ gpaUnweighted: v })} inputMode="decimal" placeholder="3.85" />
          </Field>
        </div>
        <details className="wz-details">
          <summary>Add year-by-year GPAs (optional — helps spot a grade trend)</summary>
          <div className="wz-grid wz-grid--3">
            <Field label="Grade 10 GPA">
              <TextInput value={data.gpaGrade10} onChange={(v) => update({ gpaGrade10: v })} inputMode="decimal" placeholder="3.8" />
            </Field>
            <Field label="Grade 11 GPA">
              <TextInput value={data.gpaGrade11} onChange={(v) => update({ gpaGrade11: v })} inputMode="decimal" placeholder="3.9" />
            </Field>
            <Field label="Grade 12 GPA">
              <TextInput value={data.gpaGrade12} onChange={(v) => update({ gpaGrade12: v })} inputMode="decimal" placeholder="3.9" />
            </Field>
          </div>
        </details>
      </section>

      <section className="wz-group">
        <h3 className="wz-group__title">Course rigor</h3>
        <div className="wz-grid wz-grid--2">
          <Field label="Advanced (AP) courses taken">
            <TextInput value={data.apCoursesTaken} onChange={(v) => update({ apCoursesTaken: v })} inputMode="numeric" placeholder="8" />
          </Field>
          <Field label="Advanced courses your school offers">
            <TextInput
              value={data.apOfferedUnsure ? "" : data.apCoursesOffered}
              onChange={(v) => update({ apCoursesOffered: v })}
              inputMode="numeric"
              placeholder="18"
              disabled={data.apOfferedUnsure}
            />
          </Field>
        </div>
        <Toggle checked={data.apOfferedUnsure} onChange={(v) => update({ apOfferedUnsure: v })} label="I'm not sure how many my school offers" />
      </section>

      <section className="wz-group">
        <h3 className="wz-group__title">Test scores</h3>
        <div className="wz-grid wz-grid--2">
          <Field label="SAT superscore" hint="Best section total">
            <TextInput value={data.satSuperscore} onChange={(v) => update({ satSuperscore: v })} inputMode="numeric" placeholder="1450" disabled={data.notSubmittingScores} />
          </Field>
          <Field label="ACT superscore">
            <TextInput value={data.actSuperscore} onChange={(v) => update({ actSuperscore: v })} inputMode="numeric" placeholder="32" disabled={data.notSubmittingScores} />
          </Field>
        </div>
        <Toggle checked={data.notSubmittingScores} onChange={(v) => update({ notSubmittingScores: v })} label="I'm not submitting test scores" />
      </section>

      <section className="wz-group">
        <h3 className="wz-group__title">Class rank</h3>
        <div className="wz-grid wz-grid--2">
          <Field label="Your rank">
            <TextInput value={data.classRank} onChange={(v) => update({ classRank: v })} inputMode="numeric" placeholder="12" disabled={data.schoolDoesNotRank} />
          </Field>
          <Field label="Class size">
            <TextInput value={data.classSize} onChange={(v) => update({ classSize: v })} inputMode="numeric" placeholder="480" disabled={data.schoolDoesNotRank} />
          </Field>
        </div>
        <Toggle checked={data.schoolDoesNotRank} onChange={(v) => update({ schoolDoesNotRank: v })} label="My school doesn't rank" />
      </section>

      <section className="wz-group">
        <h3 className="wz-group__title">Activities</h3>
        <p className="wz-group__note">Up to 10. Include how significant each one was.</p>
        {data.activities.map((a, i) => (
          <div key={i} className="wz-activity">
            <div className="wz-activity__row">
              <TextInput value={a.description} onChange={(v) => setActivity(i, { description: v })} placeholder="e.g. Varsity debate captain" />
              <button type="button" className="wz-icon-btn" aria-label="Remove activity" onClick={() => removeActivity(i)}>×</button>
            </div>
            <div className="wz-grid wz-grid--3">
              <Field label="Hrs/week">
                <TextInput value={a.hoursPerWeek} onChange={(v) => setActivity(i, { hoursPerWeek: v })} inputMode="numeric" placeholder="6" />
              </Field>
              <Field label="Years">
                <TextInput value={a.years} onChange={(v) => setActivity(i, { years: v })} inputMode="numeric" placeholder="3" />
              </Field>
              <Field label="Significance">
                <Select value={String(a.level)} onChange={(v) => setActivity(i, { level: Number(v) as ActivityEntry["level"] })}>
                  {ACTIVITY_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        ))}
        {data.activities.length < 10 && (
          <button type="button" className="wz-add-btn" onClick={addActivity}>+ Add activity</button>
        )}
      </section>

      <section className="wz-group">
        <h3 className="wz-group__title">Community service</h3>
        <div className="wz-grid">
          <Field label="Volunteer hours per year">
            <TextInput value={data.volunteerHoursPerYear} onChange={(v) => update({ volunteerHoursPerYear: v })} inputMode="numeric" placeholder="40" />
          </Field>
        </div>
      </section>
    </div>
  );
}
