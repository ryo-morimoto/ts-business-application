import {
  ErrorComponent,
  Link,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useLocation({
    select: (location) => location.pathname === "/",
  });

  console.error(error);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-4">
      <ErrorComponent error={error} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void router.invalidate();
          }}
          className="rounded bg-gray-700 px-2 py-1 text-sm font-bold uppercase text-white"
        >
          Try Again
        </button>
        {isRoot ? (
          <Link
            to="/"
            className="rounded bg-gray-700 px-2 py-1 text-sm font-bold uppercase text-white"
          >
            Home
          </Link>
        ) : (
          <button
            type="button"
            className="rounded bg-gray-700 px-2 py-1 text-sm font-bold uppercase text-white"
            onClick={() => window.history.back()}
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
}
