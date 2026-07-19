/** Client-safe public surface. Server helpers: `@/shared/actor/http` */

export {
  canAccessWarehouse,
  canViewJob,
  listActors,
  resolveActor,
  withWarehouseScope,
  type Actor,
  type ActorRole,
} from "./actor";

export { ACTOR_COOKIE, ACTOR_HEADER, readActorCookie, setActorCookie } from "./cookie";

export { ActorBar } from "./actor-bar";
