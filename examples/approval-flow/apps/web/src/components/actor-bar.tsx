"use client";

const ACTORS = [
  { id: "author", label: "author (submit / resubmit)" },
  { id: "reviewer", label: "reviewer (approve / reject)" },
  { id: "admin", label: "admin (all)" },
] as const;

type Props = {
  actorId: string;
  onChange: (id: string) => void;
};

export function ActorBar({ actorId, onChange }: Props) {
  return (
    <div className="toolbar">
      <label className="field">
        <span>Actor (x-actor-id)</span>
        <select value={actorId} onChange={(e) => onChange(e.target.value)}>
          {ACTORS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
