"use client";

const ACTORS = [
  { id: "clerk", label: "一般担当（倉庫 A/B・自分の依頼のみ）" },
  { id: "manager", label: "上長（倉庫 A/B/C・組織内依頼可）" },
  { id: "admin", label: "管理者（全倉庫・全依頼）" },
  { id: "outsider", label: "権限なし" },
] as const;

type Props = {
  actorId: string;
  onChange: (id: string) => void;
};

export function ActorBar({ actorId, onChange }: Props) {
  return (
    <div className="toolbar" role="region" aria-label="利用者切替">
      <label className="field">
        <span>利用者（x-actor-id / cookie）</span>
        <select
          data-testid="actor-select"
          value={actorId}
          onChange={(e) => onChange(e.target.value)}
        >
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
