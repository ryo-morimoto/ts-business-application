# Research: 取引先デスクの具体例（field evidence）

更新: 2026-07-20  
対象: `examples/account-desk` の情報設計（実装前）  
目的: flat 顧客マスタでは再現できない **実業務の構造** を、一次寄りの製品ドキュメントと業界整理から解像度を上げる。

> 本メモは教育用の根拠集めである。各製品の完全仕様・日本の法令解釈の代替ではない。

---

## 1. 結論（account-desk に効くもの）

| 現場で起きていること | flat 1住所・1担当では消えるか | account-desk への含意 |
| --- | --- | --- |
| **Sold-to / Ship-to / Bill-to / Payer は別役割**（同一法人でも別人・別拠点になり得る） | 消える | 住所・請求先は role 付き複数。請求と納品の取り違えが詳細の主判断 |
| **親と子で与信が独立**しうる（親が限度到達しても子は取引継続、など） | 消える | 階層列 + 詳細の親子リンク。与信ロールアップ計算は非目標でも **「親の hold と子の数値は別」** を seed で見せる |
| **Credit hold は「限度」だけでなく延滞日数・支払条件・account status・手動 force** など複合 | 消える | 商況は status × creditHold ×（投影の延滞）を **1セルに畳む**。理由フィールド必須 |
| **Available credit = limit − accrued** がオペ画面の主指標 | 消える | 詳細に限度と「使用/残」投影。一覧は延滞 or hold の一点 |
| **CRM 階層 ≠ 請求階層** | 消える | 本 example は **売掛オペの請求・出荷寄り**。営業ツリー全振りはしない |
| **Prospect / Customer の段階** と ERP の Customer Account 作成タイミングがずれる | 薄まる | status=prospect は bill_to 欠を許容し readiness で示す |
| **連絡先は顧客に複数**、subcustomer 作成時に **コピーされない** | 消える | contacts[] は子ごとに独立 seed |

---

## 2. 役割モデル: Sold-to / Ship-to / Bill-to / Payer

### 2.1 SAP（公式 Help 系）

SAP SD / S/4 の顧客マスタと受注では、**パートナー機能（partner functions）** が標準:

| 機能 | 役割（要約） |
| --- | --- |
| **Sold-to party** | 注文する相手（受注の必須） |
| **Ship-to party** | 出荷・納品先（荷卸し場所・受入時間などの出荷データ） |
| **Bill-to party** | 請求書の宛先 |
| **Payer** | 支払責任・請求スケジュール・銀行情報など |

根拠:

- [Working with Partner Determination (Example) — SAP S/4HANA Cloud](https://help.sap.com/docs/SAP_S4HANA_CLOUD/a376cd9ea00d476b96f18dea1247e6a5/0e71bd534f22b44ce10000000a174cb4.html): 顧客マスタの partner determination に sold-to / payer / ship-to / bill-to を計画。受注例では **C1 が sold-to で、ship-to に C1,C2,C3 を複数割当**、payer/bill-to は C1 を提案。
- [Partners in the Sales and Distribution Process](https://help.sap.com/docs/SAP_ERP/a428aae377ba4a1199c3ecc8b7f5f33d/0b71bd534f22b44ce10000000a174cb4.html): sold-to マスタ作成時、**ship-to / bill-to / payer が義務として自動割当**される、という説明。
- [Partner Functions](https://help.sap.com/docs/SAP_ERP/72b431fb78a649da9c8b46951e64fb88/806fbd534f22b44ce10000000a174cb4.html): Ship-to は出荷データ、Payer は請求スケジュール・銀行、と役割が異なる。

**具体ストーリー（SAP 型）**

```text
法人グループ「北関東フーズHD」
  sold-to: 北関東フーズ株式会社（発注システムを持つ）
  ship-to: 宇都宮DC / 高崎DC / 本社倉庫（3拠点）
  bill-to: 北関東フーズ 経理部（本社住所）
  payer:   同・経理（またはグループ財務会社）
```

オペレータの判断:

- 「請求は本社、納品は宇都宮」—— **住所表の role 列がないと事故る**
- 受注画面では ship-to を選ぶが、マスタメンテ画面では **複数 ship-to を sold-to に紐づける**

### 2.2 請求階層の業界整理（二次だが用語が明確）

[DealHub: What is Billing Hierarchy?](https://dealhub.io/glossary/billing-hierarchy/)（製品ブログ/用語集）:

- **Parent**: 統合請求・支払手段・クレジット/契約条件のアンカーになり得る
- **Child**: 利用・費用発生。請求書は親にまとまることも、子に分かれることも
- **CRM hierarchy ≠ billing hierarchy**
- モデル例:
  - Centralized Payer: sold-to=子, bill-to=親, ship-to=子
  - Fully decentralized: すべて子
  - Central contract / local invoicing: sold-to=親, bill-to=子, ship-to=子（税・通貨）

**account-desk への切り方**

| 採用 | 非採用（肥大化） |
| --- | --- |
| 住所 role: `hq` / `bill_to` / `ship_to` | 別 Account としての Payer 法人フルモデル |
| 親 Account リンク + 子表 | 請求ロールアップ・按分アルゴリズム |
| seed で「親が bill_to、子が ship_to 多い」 | 多階層 billing tree UI |

Payer は初回 **bill_to + invoiceEmail で近似**（独立 Payer エンティティは非目標と明記済み方針と整合）。

---

## 3. 階層: Parent / Subcustomer

### 3.1 NetSuite（公式）

[Creating a Subcustomer Record](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N1085616.html):

- Subcustomer = 別 customer で **Parent Company** を持つ
- 取引の相手は subcustomer でもよい
- **与信限度は親に subcustomer 分を含めない**。親が限度到達しても **子への販売は制限されない**
- Subcustomer 作成時、**親の contacts はコピーされない**
- OneWorld: 子は親と **別 subsidiary** を持てる
- 階層サイズ上限（ドキュメント上 10,000）— 性能と与信・残高に影響し得る、という注意

**具体ストーリー（NetSuite 型）**

```text
親: グローバル部品 日本支社（code GLOB-JP） creditLimit 50M, hold=Off
子: グローバル部品 名古屋工場（GLOB-JP-NGO） 独自 contacts、ship_to 2
子: グローバル部品 福岡工場（GLOB-JP-FUK） creditLimit 5M と小さく、延滞あり
```

一覧:

- 子行の「親」列に `グローバル部品 日本` 略称
- 与信・延滞は **行の法人単位**（親の hold を子に自動継承しない、を seed で示す）

詳細:

- 親: 子表（id, name, status, overdue 一点）
- 子: 親リンク。contacts は空になり得る → readiness `no_contact`

### 3.2 Salesforce 系（階層の「別用途」）

Salesforce Account Hierarchy は **営業・所有・レポート** 向けの parent lookup が中心（[Account Hierarchy の説明・コミュニティ議論](https://trailhead.salesforce.com/trailblazer-community/feed/0D54S00000A95i6SAB) 等）。

実務議論（複数 ship-to）では:

- 親=法人、子=拠点 Account、または Location カスタムオブジェクト、など **実装が割れる**
- 「Billing は1つ、Shipping は注文ごと」と「拠点マスタとして複数 ship-to」が混在

**含意:** account-desk は **売掛・マスタメンテ・出荷請求の取り違え防止** に寄せ、Salesforce 的な territory / opportunity は載せない。

---

## 4. 与信・Credit hold

### 4.1 Dynamics 365 Finance（Microsoft Learn・一次）

[Credit holds for sales orders](https://learn.microsoft.com/en-us/dynamics365/finance/accounts-receivable/cm-sales-order-credit-holds)（更新表記 2026-04）:

Blocking rules が対象にする状況の例:

1. **延滞日数**（grace days 付き）
2. **Account status**
3. **支払条件（terms of payment）**
4. **与信限度の期限切れ**
5. **延滞金額**（+ 与信使用率 threshold との AND）
6. **受注金額**
7. **与信使用割合**
8. 受注上の **支払条件変更** / **決済割引変更**（ランクが悪化すると審査）

加えて:

- **Force credit hold**（ルール外の手動停止。理由コード付き）
- Hold list で理由が複数なら **Multiple** 表示
- 除外顧客・受注単位の credit management 除外
- 解消後の **Evaluate for release** / 自動リリース設定

**具体ストーリー（D365 型 → デスク UI）**

```text
S3: 株式会社東雲電機
  status: active
  creditHold: true
  creditHoldReason: "請求 61 日超延滞（経理依頼 2026-06-01）"
  OpsSummary: overdueInvoiceCount=3, overdueAmount=1_280_000
  paymentTermsDays: 30
```

一覧の商況セル: `稼働 · 与信停止`（チップ最大2）  
詳細: 与信 section に理由全文 + 関連サマリの延滞  
編集: hold 解除時に reason クリア必須（I5 の逆）

※ 受注ブロッキングルールエンジン自体は **非目標**。マスタ上の **結果フラグ + 理由 + 延滞投影** まで。

### 4.2 NetSuite

公式 schema / 解説（[Customer record フィールド](https://www.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2023_1/script/record/customer.html)、二次解説 [Anchor Group](https://www.anchorgroup.tech/blog/credit-limits-for-customers-in-netsuite)）:

| 概念 | 意味 |
| --- | --- |
| **Credit Limit** | 売掛として許す上限 |
| **Available Credit** | Limit − Accrued |
| **Credit Hold** | On / Off / **Auto**（残0で停止、など） |
| **Customer Credit Limit Handling** | Ignore / Warn Only / **Enforce Holds** |
| **Days Overdue for Warning/Hold** | 延滞グレース |

**具体ストーリー**

```text
Auto + Enforce:
  limit 10_000_000, accrued 10_000_000 → available 0 → 実質 hold
一覧: 与信限度は出し、available は詳細寄り（一覧は hold フラグ優先）
```

### 4.3 SAP Credit Management（コミュニティ/公式ブログ）

[Credit checks in SAP Credit Management (FSCM)](https://community.sap.com/t5/enterprise-resource-planning-blog-posts-by-sap/credit-checks-available-in-sap-credit-management-fscm/ba-p/13880810) 等:

- 最大督促レベル、最古未決済の年齢、DSO など **顧客与信セグメントの指標** でチェック
- 受注ブロック状態（CMGST 等）と exposure 更新の話

**含意:** readiness / 商況とは別に「督促・延滞の深さ」がオペ判断材料。account-desk では **overdue 件数・金額** で足り、督促レベル UI は非目標。

---

## 5. レコード構造の「タブ」= 詳細 section の原型

製品 UI はだいたい **ヘッダ + 複数タブ/サブリスト** であり、card の山ではない。

| 製品の塊 | 中身の例 | account-desk section |
| --- | --- | --- |
| 一般 / 識別 | 正式名、コード、ステータス、親 | 識別・階層 |
| 財務 / FI | 与信、支払条件、通貨、督促 | 商況・与信 |
| 販売 / SD | 販売組織、Incoter ms、税分類 | 簡略化して与信・分類にマージ可 |
| 住所帳 / Sites | 複数住所、用途 | 住所表 |
| 連絡先 | 複数、Primary | 担当表 |
| アクティビティ | 直近 | 最近の動き（seed） |

NetSuite Customer: Financial タブに Credit Limit / Hold、Contacts サブタブで複数連絡先、Address 系、という分割が一般的。

---

## 6. データ品質・完備性（readiness の現場感）

一次の「顧客マスタ必須項目チェックリスト」は業種依存が強いが、ERP 導入・MDM の共通パターンは次:

| 不備 | いつ困るか | readiness code 案 |
| --- | --- | --- |
| 請求先住所なし | 請求書発行・送付 | `missing_bill_to` |
| 納品先なし | 出荷指示 | `missing_ship_to` |
| 税/法人識別なし | 適格請求・本人確認的な社内ルール | `missing_tax_id`（日本なら法人番号を seed ラベルに） |
| 請求送付メールなし | 電子請求 | `missing_invoice_email` |
| 担当0 / primary なし | 督促・納期調整の電話先 | `no_contact` / `no_primary_contact` |
| hold なのに理由なし | 監査・引継ぎ | `credit_hold_without_reason` |
| active なのに bill_to 欠 | 稼働扱いなのに請求不能 | `active_without_bill_to` |

**Prospect** は意図的に不備を許す（Oracle Fusion 系でも Prospect と Customer Account の作成タイミングを分ける議論がある — [A-Team Oracle](https://www.ateam-oracle.com/best-practices-to-model-prospects-customers-suppliers-partners-in-an-oracle-fusion-cloud-implementation) は一時障害で全文未取得。方針として prospect 許容は維持）。

---

## 7. 解像度の高い seed シナリオ（研究反映版）

charter の S1–S10 を、製品用語で肉付けした **採用推奨セット**。

### S-A 健全・単一法人・役割同居（SAP デフォルト型）

```text
legalName: 株式会社青葉機材
code: AOB-001
status: active
addresses:
  - role=hq, bill_to default, 本社
  - role=ship_to, 相模原倉庫
contacts:
  - isPrimary, role=operations, 購買 佐藤
  - role=billing, 経理 鈴木
creditHold: false
OpsSummary: openOrderCount=2, overdue=0
```

一覧: 普通。詳細: 住所2行・担当2行。readiness ready。

### S-B 請求は親・納品は子（Centralized payer 近似）

```text
親 HD-001 北関東フーズHD
  bill_to のみ厚い、creditLimit 大
子 AOB-UTE 北関東フーズ 宇都宮
  parent=HD-001
  ship_to ×2（第一・第二DC）
  bill_to なし → readiness missing_bill_to
  alertNote: "請求は親HD。子に請求書を送らないこと"
```

**オペ判断:** 子詳細を開いたとき alert + readiness で「請求先は親を見よ」。  
編集で子に bill_to を足すと、実運用では親請求方針と矛盾し得る → 初回は **警告メモ** に留め、ポリシーエンジンは非目標。

### S-C 与信停止 + 延滞（D365 / NetSuite 合成）

```text
code: HGN-220
legalName: 東雲電機株式会社
status: active
creditHold: true
creditHoldReason: "延滞61日超・経理依頼"
paymentTermsDays: 30
OpsSummary: overdueInvoiceCount=3, overdueAmount=1280000, lastPaymentAt=2026-03-01
```

一覧フィルタ `creditHold=1` のデモ用。

### S-D 親限度と子独立（NetSuite subcustomer）

```text
親: limit 到達相当の投影（available≈0）だが creditHold=Off
子: 独自 limit、取引継続可能（hold なし）
```

UI で「親が赤いから子も止め」と誤読させない（商況は行単位）。

### S-E Prospect 不備（完備性の本命）

```text
status: prospect
addresses: hq のみ
contacts: []
taxId: 欠
invoiceEmail: 欠
issues: no_contact, missing_bill_to, missing_tax_id, ...
```

一覧 `incomplete=1`。active への変更は編集で I2 等を満たす必要。

### S-F 長い正式名称 + 複数 ship-to default

```text
legalName: 五十文字を超える正式名称…
tradeName: 短い屋号（一覧主表示）
ship_to ×3, isDefaultForRole は1件だけ
```

### S-G 手動 force hold 風

```text
creditHold: true
creditHoldReason: "品質クレーム調査中（営業本部長指示）— 与信枠には余裕あり"
OpsSummary: overdue=0
```

延滞ゼロでも hold。関連サマリと hold 理由が **両方要る** 理由のデモ。

### S-H 支払条件だけ厳しい（投影）

```text
paymentTermsDays: 60
status: active
note in events: "条件を Net30→Net60 に変更" 
```

D365 の「条件変更で審査」は受注側。マスタでは **terms と events** で履歴の気配だけ。

---

## 8. 用語対照表（UI ラベル案）

| account-desk（提案） | SAP | NetSuite | 一般日本語 |
| --- | --- | --- | --- |
| 取引先 Account | Customer / BP | Customer | 得意先・売掛先 |
| code | Customer number | Entity / ID | 取引先コード |
| legalName | Name | Company Name | 正式名称 |
| tradeName | — | — | 略称・屋号 |
| status prospect/active/suspended | Account groups / blocks | Lead/Prospect/Customer + status | 見込/取引中/停止 |
| creditHold | Credit block / FSCM | Credit Hold On/Off/Auto | 与信停止 |
| creditLimit | Credit limit | Credit Limit | 与信限度額 |
| （投影）available | — | Available Credit | 与信残 |
| paymentTermsDays | Payment terms | Terms | 支払サイト |
| bill_to 住所 | Bill-to party | Bill To address | 請求先 |
| ship_to 住所 | Ship-to party | Ship To | 納品先・出荷先 |
| hq | General address | Main / Default | 本社 |
| parentAccountId | Customer hierarchy / … | Parent Company | 親取引先 |
| contacts | Contact person partner | Contacts subtab | 担当者 |
| invoiceEmail | — | Email on customer / bill | 請求送付先メール |
| taxId | Tax numbers | Tax reg. | 法人番号等 |
| OpsSummary.overdue* | Open items / dunning | Overdue | 延滞 |
| readiness | （MDM/自前） | （自前） | マスタ不備 |

---

## 9. 情報設計への差分提案（研究後）

charter 現状を、証拠に合わせて **寄せる** 提案。

| 項目 | 現状 | 提案 | 根拠 |
| --- | --- | --- | --- |
| 住所 role | hq / bill_to / ship_to | **維持**。Payer は独立エンティティにしない | SAP 4役は重い。bill_to+invoiceEmail で近似 |
| 与信 | hold + limit + reason | **+ 詳細に available 投影**（seed 計算可） | NetSuite の主指標 |
| 階層と与信 | parent 表示 | seed で **親 hold と子独立** を必ず1組 | NetSuite 公式 |
| contacts コピー | — | 子作成時コピーしない旨を README | NetSuite 公式 |
| hold 理由 | 与信理由 | **延滞由来と手動 force 由来の両方を seed** | D365 force hold + overdue rules |
| 一覧の延滞 | 一点 | **維持**（使用率%は詳細） | 一覧密度 |
| CRM 多階層自動化 | 非目標 | **維持** | CRM≠billing |
| 日本固有 | taxId | ラベル「法人番号」、形式チェックは緩くてよい | 教育用 |

### O1–O6 への研究からの推奨（再掲+補強）

| # | 推奨 | 研究メモ |
| --- | --- | --- |
| O1 statusReason 独立 | **採用** | D365 の account status と credit hold は別ルール軸 |
| O2 isPrimary + role | **採用** | 複数 contacts が標準 |
| O3 code 不変 | **採用** | ERP 番号の運用慣行 |
| O4 currency + 金額 | **採用** | 多通貨顧客は NetSuite でも primary currency で limit |
| O5 子は詳細表のみ | **採用** | 一覧 tree は Salesforce 寄りで主題がずれる |
| O6 alert は詳細のみ | **採用** | 例外オペ指示はヘッダ1行（S-B） |

---

## 10. ソース一覧

| 種別 | URL / 参照 |
| --- | --- |
| 一次 | [MS Learn: Credit holds for sales orders](https://learn.microsoft.com/en-us/dynamics365/finance/accounts-receivable/cm-sales-order-credit-holds) |
| 一次 | [NetSuite: Creating a Subcustomer Record](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N1085616.html) |
| 一次 | [SAP Help: Partner Determination Example](https://help.sap.com/docs/SAP_S4HANA_CLOUD/a376cd9ea00d476b96f18dea1247e6a5/0e71bd534f22b44ce10000000a174cb4.html) |
| 一次 | [SAP Help: Partners in SD Process](https://help.sap.com/docs/SAP_ERP/a428aae377ba4a1199c3ecc8b7f5f33d/0b71bd534f22b44ce10000000a174cb4.html) |
| 一次 | [SAP Help: Partner Functions](https://help.sap.com/docs/SAP_ERP/72b431fb78a649da9c8b46951e64fb88/806fbd534f22b44ce10000000a174cb4.html) |
| 一次寄与 | [NetSuite Customer schema browser](https://www.netsuite.com/help/helpcenter/en_US/srbrowser/Browser2023_1/script/record/customer.html) |
| 二次 | [Anchor Group: Credit Limits in NetSuite](https://www.anchorgroup.tech/blog/credit-limits-for-customers-in-netsuite) |
| 二次 | [DealHub: Billing Hierarchy](https://dealhub.io/glossary/billing-hierarchy/) |
| 二次 | SAP Community: Credit checks FSCM |
| 未取得 | Oracle A-Team Fusion modeling（ページ障害 2026-07-20） |

---

## 11. 次アクション（情報設計）

1. charter の Seed を **S-A〜S-H** に差し替え or 対応付けする  
2. Aggregate に **availableCredit 投影**（計算式を model 純関数）を追加検討  
3. O1–O6 を研究推奨で closed にするかユーザー確認  
4. **scaffold はまだしない**
