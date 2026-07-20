import { ACTORS, type ActorId } from "./actor";

export function ActorBar({
  actorId,
  onActorChange,
}: {
  actorId: ActorId;
  onActorChange: (id: ActorId) => void;
}) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-xs text-desk-muted">
      <span className="font-semibold text-desk-text">Actor</span>
      <select
        className="border border-desk-border bg-desk-surface px-2 py-1 text-sm text-desk-text"
        value={actorId}
        onChange={(e) => onActorChange(e.target.value as ActorId)}
        aria-label="操作主体"
      >
        {(Object.keys(ACTORS) as ActorId[]).map((id) => (
          <option key={id} value={id}>
            {ACTORS[id].label}
          </option>
        ))}
      </select>
    </label>
  );
}
