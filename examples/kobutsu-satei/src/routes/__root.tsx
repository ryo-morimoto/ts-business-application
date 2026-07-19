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
        title: "kobutsu-satei · rule-driven form",
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
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              examples/kobutsu-satei
            </p>
            <h1 className="text-xl font-semibold">古物査定 · ルール駆動フォーム</h1>
          </div>
          <nav className="flex gap-3 text-sm">
            <Link
              to="/tickets"
              className="text-blue-700 underline dark:text-blue-300"
              activeProps={{ className: "font-bold" }}
            >
              チケット
            </Link>
            <Link
              to="/rules"
              className="text-blue-700 underline dark:text-blue-300"
              activeProps={{ className: "font-bold" }}
            >
              ルール CMS
            </Link>
          </nav>
        </div>
        <ActorBar actorId={actorId} onActorChange={setActorId} />
        <p className="text-xs text-gray-500">
          Acting as {actor.label}. 教育用簡略（法務意見ではありません）。pin=create +
          明示 repin / CMS=M / 不正品申告 stub。
        </p>
      </header>
      {children}
    </div>
  );
}
