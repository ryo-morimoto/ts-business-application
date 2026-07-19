"use client";

import { listActors } from "./actor";
import { setActorCookie } from "./cookie";

type Props = {
  actorId: string;
};

export function ActorBar({ actorId }: Props) {
  return (
    <div className="toolbar" role="region" aria-label="利用者切替">
      <label className="field">
        <span>利用者（x-actor-id / cookie）</span>
        <select
          data-testid="actor-select"
          defaultValue={actorId}
          onChange={(e) => {
            setActorCookie(e.target.value);
            window.location.reload();
          }}
        >
          {listActors().map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
