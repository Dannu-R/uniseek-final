"use client";

import { useWizard } from "../WizardProvider";
import { Field, TextInput, Select, Toggle, Segmented } from "../fields";
import { INCOME_BANDS } from "../model";

export default function Filters() {
  const { data, update } = useWizard();

  return (
    <div className="wz-step">
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
        <Toggle checked={data.inStateOnly} onChange={(v) => update({ inStateOnly: v })} label="In-state colleges only" />
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
