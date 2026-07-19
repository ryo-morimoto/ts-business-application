import { ExportWorkbench } from "@/widgets/export-workbench";

export default function HomePage() {
  return (
    <main>
      <header>
        <h1>出荷明細 · 非同期ファイル出力</h1>
        <p className="muted">
          依頼時点では受付まで。成果物はあとから進捗を確認して受け取る。
        </p>
        <p className="stack-note">
          <strong>構造:</strong> 単一 Next アプリ。共有ドメインは{" "}
          <code>entities/shipment</code>、feature（
          <code>shipments</code> / <code>export-jobs</code>
          ）は互いに import しない。合成は <code>widgets</code>
          。Server Action で依頼、Route Handler でポーリングとダウンロード。
        </p>
      </header>
      <ExportWorkbench />
    </main>
  );
}
