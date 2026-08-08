"use client";

import { useEffect, useState } from "react";
import { useWizard } from "../WizardProvider";
import { Field, TextInput, Select } from "../fields";
import { US_STATES } from "../model";

interface Major {
  cipCode: string;
  name: string;
}

export default function Goals() {
  const { data, update } = useWizard();
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/majors")
      .then((r) => r.json())
      .then((d) => {
        if (active) setMajors(d.majors ?? []);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="wz-step">
      <section className="wz-group">
        <h3 className="wz-group__title">Intended major</h3>
        <p className="wz-group__note">
          Optional. If you name one, we score you against that program specifically. Leave it blank for a general run.
        </p>
        <Field label="Major">
          <Select value={data.majorCip} onChange={(v) => update({ majorCip: v })} disabled={loading}>
            <option value="">{loading ? "Loading…" : "Undecided / general"}</option>
            {majors.map((m) => (
              <option key={m.cipCode} value={m.cipCode}>{m.name}</option>
            ))}
          </Select>
        </Field>
      </section>

      <section className="wz-group">
        <h3 className="wz-group__title">Where you live</h3>
        <p className="wz-group__note">
          Your state sets in-state admit rates and residency; your ZIP is used for distance.
        </p>
        <div className="wz-grid wz-grid--2">
          <Field label="Home state">
            <Select value={data.homeState} onChange={(v) => update({ homeState: v })}>
              <option value="">Select a state</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="ZIP code" hint="Optional">
            <TextInput value={data.homeZip} onChange={(v) => update({ homeZip: v })} inputMode="numeric" placeholder="60614" />
          </Field>
        </div>
      </section>
    </div>
  );
}
