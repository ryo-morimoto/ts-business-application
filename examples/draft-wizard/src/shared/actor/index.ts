/** Server-safe exports. Client UI: `@/shared/actor/actor-bar` */
export {
  isActorId,
  listActors,
  resolveActor,
  type Actor,
  type ActorId,
} from "./actor";
export { ACTOR_COOKIE, ACTOR_HEADER, readActorCookie, setActorCookie } from "./cookie";
