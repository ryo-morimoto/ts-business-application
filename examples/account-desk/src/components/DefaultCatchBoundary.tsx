import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { defaultAccountsSearch } from "~/features/accounts/model/list-search";

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  console.error(error);

  return (
    <div className="space-y-3 p-4">
      <ErrorComponent error={error} />
      <div className="flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          className="underline"
          onClick={() => {
            void router.invalidate();
          }}
        >
          再試行
        </button>
        {isRoot ? (
          <Link to="/accounts" search={defaultAccountsSearch} className="underline">
            一覧へ
          </Link>
        ) : (
          <button
            type="button"
            className="underline"
            onClick={() => window.history.back()}
          >
            戻る
          </button>
        )}
      </div>
    </div>
  );
}
