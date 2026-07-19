import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "async-export · 非同期ファイル出力",
  description:
    "条件付き一覧から非同期 CSV 出力を依頼し、進捗確認後に成果物を受け取る example",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
