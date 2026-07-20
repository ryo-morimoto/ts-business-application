/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import { defaultAccountsSearch } from "~/features/accounts/model/list-search";
import { ActorBar } from "~/shared/actor/actor-bar";
import { ActorProvider, useActor } from "~/shared/actor/actor-context";
import appCss from "~/styles/app.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "account-desk · 取引先オペレーション",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  errorComponent: (props) => (
    <RootDocument>
      <DefaultCatchBoundary {...props} />
    </RootDocument>
  ),
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        <ActorProvider>
          <AppShell>{children}</AppShell>
        </ActorProvider>
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-left" />
        <Scripts />
      </body>
    </html>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { actorId, actor, setActorId } = useActor();

  return (
    <div className="mx-auto max-w-[80rem] space-y-4 p-4">
      <header className="space-y-2 border-b border-desk-border pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-desk-muted">
              examples/account-desk
            </p>
            <p className="text-sm text-desk-muted">
              高密度デスク UI · 自前 design system · TanStack family
            </p>
          </div>
          <nav className="flex gap-3 text-sm">
            <Link
              to="/accounts"
              search={defaultAccountsSearch}
              className="font-semibold text-desk-link underline"
              activeProps={{ className: "font-bold" }}
            >
              取引先
            </Link>
          </nav>
        </div>
        <ActorBar actorId={actorId} onActorChange={setActorId} />
        <p className="text-xs text-desk-muted">
          {actor.label} として操作中。一覧条件は URL が正本です。
        </p>
      </header>
      {children}
    </div>
  );
}
