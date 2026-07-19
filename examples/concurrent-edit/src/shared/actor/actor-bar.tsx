import {
  ACTORS,
  ACTOR_COOKIE,
  ACTOR_IDS,
  type ActorId,
} from "./actor";

type Props = {
  actorId: ActorId;
  onActorChange: (id: ActorId) => void;
};

export function ActorBar({ actorId, onActorChange }: Props) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
      data-testid="actor-bar"
    >
      <span className="font-medium">Actor</span>
      <select
        className="rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-950"
        data-testid="actor-select"
        value={actorId}
        onChange={(e) => {
          const next = e.target.value as ActorId;
          document.cookie = `${ACTOR_COOKIE}=${encodeURIComponent(next)}; path=/; SameSite=Lax`;
          onActorChange(next);
        }}
      >
        {ACTOR_IDS.map((id) => (
          <option key={id} value={id}>
            {ACTORS[id].label}
          </option>
        ))}
      </select>
      <span className="text-gray-500">
        Cookie <code>{ACTOR_COOKIE}</code> · header <code>x-actor-id</code>
      </span>
    </div>
  );
}
