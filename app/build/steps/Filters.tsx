"use client";

import { useWizard } from "../WizardProvider";
import { Field, TextInput, Select, Segmented } from "../fields";
import { INCOME_BANDS, US_STATES, stateLabel, type StateFilterMode } from "../model";

export default function Filters() {
  const { data, update } = useWizard();

  return (
    <div className="wz-step">
      <div className="wz-callout">
        <strong>These are hard filters.</strong> Any college that doesn't meet them is
        removed from your list entirely — so only set what's truly a deal-breaker. (Your
        preferences, on the next step, just fine-tune the order; they never remove a college.)
      </div>

      <section className="wz-group">
        <h3 className="wz-group__title">Cost</h3>
        <p className="wz-group__note">We compare against each college's net price, not sticker price.</p>
        <div className="wz-grid wz-grid--2">
          <Field label="Most you can pay per year" hint="Required">
            <TextInput value={data.budgetMaxNetPrice} onChange={(v) => update({ budgetMaxNetPrice: v })} inputMode="numeric" placeholder="30000" />
          </Field>
          <Field label="Family income band" hint="Optional — picks the right net-price estimate">
            <Select value={data.incomeBand} onChange={(v) => update({ incomeBand: v })}>
              {INCOME_BANDS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="wz-group">
        <h3 className="wz-group__title">Location</h3>
        <div className="wz-grid">
          <Field label="Maximum distance from home" hint="Optional — miles. Leave blank for no limit.">
            <TextInput value={data.maxDistanceMiles} onChange={(v) => update({ maxDistanceMiles: v })} inputMode="numeric" placeholder="500" />
          </Field>
        </div>
      </section>

      <section className="wz-group">
        <h3 className="wz-group__title">State</h3>
        <p className="wz-group__note">Restrict the list to a single state, or leave it open.</p>
        <Segmented
          value={data.stateFilterMode}
          onChange={(v: StateFilterMode) => update({ stateFilterMode: v })}
          options={[
            { value: "ANY", label: "Anywhere" },
            { value: "IN_STATE", label: "In-state only" },
            { value: "SPECIFIC", label: "A specific state" },
          ]}
        />

        {data.stateFilterMode === "IN_STATE" && !data.homeState && (
          <p className="wz-group__note">
            Set your home state in the Goals step — without it this filter can't be applied.
          </p>
        )}

        {data.stateFilterMode === "SPECIFIC" && (
          <div className="wz-grid">
            <Field label="Goal state" hint="Only colleges in this state will be considered.">
              <Select value={data.goalState} onChange={(v) => update({ goalState: v })}>
                <option value="">Select a state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{stateLabel(s)}</option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </section>

      <section className="wz-group">
        <h3 className="wz-group__title">Religious affiliation</h3>
        <Segmented
          value={data.religiousPreference}
          onChange={(v) => update({ religiousPreference: v })}
          options={[
            { value: "NO_PREFERENCE", label: "No preference" },
            { value: "REQUIRE", label: "Religious only" },
            { value: "EXCLUDE", label: "Secular only" },
          ]}
        />
      </section>
    </div>
  );
}
