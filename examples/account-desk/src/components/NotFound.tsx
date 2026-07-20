import { Link } from "@tanstack/react-router";
import { defaultAccountsSearch } from "~/features/accounts/model/list-search";

export function NotFound() {
  return (
    <div className="space-y-2 p-4">
      <h1 className="text-lg font-semibold">ページが見つかりません</h1>
      <Link
        to="/accounts"
        search={defaultAccountsSearch}
        className="text-sm underline"
      >
        取引先一覧へ
      </Link>
    </div>
  );
}
