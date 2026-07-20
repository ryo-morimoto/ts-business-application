import type { Account, AccountEvent, AccountOpsSummary } from "./types";

const now = "2026-07-20T10:00:00.000Z";

function addr(
  id: string,
  role: Account["addresses"][0]["role"],
  line1: string,
  opts: Partial<Account["addresses"][0]> = {},
): Account["addresses"][0] {
  return {
    id,
    role,
    isDefaultForRole: opts.isDefaultForRole ?? true,
    label: opts.label,
    postalCode: opts.postalCode ?? "100-0001",
    prefecture: opts.prefecture ?? "東京都",
    line1,
    line2: opts.line2,
    countryCode: opts.countryCode ?? "JP",
  };
}

function contact(
  id: string,
  name: string,
  opts: Partial<Account["contacts"][0]> & {
    role?: Account["contacts"][0]["role"];
  } = {},
): Account["contacts"][0] {
  return {
    id,
    role: opts.role ?? "operations",
    name,
    email: opts.email,
    phone: opts.phone,
    department: opts.department,
    isPrimary: opts.isPrimary ?? false,
    nameKana: opts.nameKana,
  };
}

function base(
  partial: Omit<Account, "createdAt" | "updatedAt" | "updatedBy" | "tags"> & {
    tags?: string[];
    createdAt?: string;
    updatedAt?: string;
    updatedBy?: string;
  },
): Account {
  const { tags, createdAt, updatedAt, updatedBy, ...rest } = partial;
  return {
    ...rest,
    tags: tags ?? [],
    createdAt: createdAt ?? now,
    updatedAt: updatedAt ?? now,
    updatedBy: updatedBy ?? "alice",
  };
}

/** Story seeds S-A … S-J plus filler for paging. */
export function buildSeed(): {
  accounts: Account[];
  ops: AccountOpsSummary[];
  events: AccountEvent[];
} {
  const accounts: Account[] = [];
  const ops: AccountOpsSummary[] = [];
  const events: AccountEvent[] = [];

  // S-A healthy
  accounts.push(
    base({
      id: "acc_sa",
      code: "AOB-001",
      legalName: "株式会社青葉機材",
      tradeName: "青葉機材",
      nameKana: "アオバキザイ",
      status: "active",
      creditHold: false,
      tradeSuspended: false,
      ownerId: "alice",
      segment: "mid",
      tags: ["preferred"],
      industry: "卸売",
      countryCode: "JP",
      timezone: "Asia/Tokyo",
      taxId: "1234567890123",
      currency: "JPY",
      creditLimit: 20_000_000,
      paymentTermsDays: 30,
      invoiceEmail: "billing@aoba.example",
      addresses: [
        addr("a1", "hq", "千代田区1-1-1"),
        addr("a2", "bill_to", "千代田区1-1-1", { label: "経理" }),
        addr("a3", "ship_to", "相模原市中央区1-2-3", {
          label: "相模原倉庫",
          prefecture: "神奈川県",
          postalCode: "252-0231",
        }),
      ],
      contacts: [
        contact("c1", "佐藤 購買", {
          role: "operations",
          isPrimary: true,
          email: "sato@aoba.example",
          phone: "03-1111-1111",
        }),
        contact("c2", "鈴木 経理", {
          role: "billing",
          email: "suzuki@aoba.example",
        }),
      ],
    }),
  );
  ops.push({
    accountId: "acc_sa",
    openOrderCount: 2,
    openOrderAmount: 480_000,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 1_200_000,
    lastOrderAt: "2026-07-10T00:00:00.000Z",
    lastPaymentAt: "2026-07-01T00:00:00.000Z",
  });

  // S-B parent HD + child without bill_to
  accounts.push(
    base({
      id: "acc_sb_parent",
      code: "HD-001",
      legalName: "北関東フーズホールディングス株式会社",
      tradeName: "北関東フーズHD",
      status: "active",
      creditHold: false,
      tradeSuspended: false,
      ownerId: "bob",
      segment: "enterprise",
      tags: ["group"],
      countryCode: "JP",
      taxId: "1111111111111",
      currency: "JPY",
      creditLimit: 100_000_000,
      paymentTermsDays: 45,
      invoiceEmail: "ap@kitakanto-hd.example",
      addresses: [
        addr("b1", "hq", "宇都宮市本町1-1"),
        addr("b2", "bill_to", "宇都宮市本町1-1", { label: "グループ経理" }),
      ],
      contacts: [
        contact("bc1", "高橋 財務", {
          role: "billing",
          isPrimary: true,
          email: "ap@kitakanto-hd.example",
        }),
      ],
    }),
  );
  ops.push({
    accountId: "acc_sb_parent",
    openOrderCount: 0,
    openOrderAmount: 0,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 0,
  });

  accounts.push(
    base({
      id: "acc_sb_child",
      code: "HD-UTE",
      legalName: "北関東フーズ株式会社 宇都宮事業所",
      tradeName: "北関東フーズ 宇都宮",
      status: "active",
      creditHold: false,
      tradeSuspended: false,
      ownerId: "bob",
      parentAccountId: "acc_sb_parent",
      segment: "enterprise",
      tags: ["dc"],
      countryCode: "JP",
      taxId: "1111111111112",
      currency: "JPY",
      creditLimit: 10_000_000,
      paymentTermsDays: 45,
      alertNote: "請求は親HD。子に請求書を送らないこと",
      // intentionally no bill_to
      addresses: [
        addr("b3", "hq", "宇都宮市流通団地2-2", { prefecture: "栃木県" }),
        addr("b4", "ship_to", "宇都宮市流通団地2-2", {
          label: "第一DC",
          prefecture: "栃木県",
          isDefaultForRole: true,
        }),
        addr("b5", "ship_to", "宇都宮市流通団地3-3", {
          label: "第二DC",
          prefecture: "栃木県",
          isDefaultForRole: false,
        }),
      ],
      contacts: [
        contact("bc2", "伊藤 現場", {
          role: "operations",
          isPrimary: true,
          phone: "028-000-0000",
        }),
      ],
    }),
  );
  ops.push({
    accountId: "acc_sb_child",
    openOrderCount: 5,
    openOrderAmount: 2_100_000,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 900_000,
    lastOrderAt: "2026-07-18T00:00:00.000Z",
  });

  // S-C credit hold + overdue
  accounts.push(
    base({
      id: "acc_sc",
      code: "HGN-220",
      legalName: "東雲電機株式会社",
      tradeName: "東雲電機",
      status: "active",
      creditHold: true,
      creditHoldReason: "延滞61日超・経理依頼（2026-06-01）",
      tradeSuspended: false,
      ownerId: "carol",
      segment: "mid",
      countryCode: "JP",
      taxId: "2222222222222",
      currency: "JPY",
      creditLimit: 15_000_000,
      paymentTermsDays: 30,
      invoiceEmail: "ar@shinonome.example",
      addresses: [
        addr("c1a", "hq", "大阪市北区1-1"),
        addr("c1b", "bill_to", "大阪市北区1-1"),
        addr("c1c", "ship_to", "東大阪市2-2", { prefecture: "大阪府" }),
      ],
      contacts: [
        contact("cc1", "中村 経理", {
          role: "billing",
          isPrimary: true,
          email: "ar@shinonome.example",
        }),
      ],
    }),
  );
  ops.push({
    accountId: "acc_sc",
    openOrderCount: 1,
    openOrderAmount: 300_000,
    overdueInvoiceCount: 3,
    overdueAmount: 1_280_000,
    accruedReceivables: 14_500_000,
    lastPaymentAt: "2026-03-01T00:00:00.000Z",
  });

  // S-D parent tight credit, child independent
  accounts.push(
    base({
      id: "acc_sd_parent",
      code: "GLOB-JP",
      legalName: "グローバル部品 日本支社",
      tradeName: "グローバル部品 日本",
      status: "active",
      creditHold: false,
      tradeSuspended: false,
      ownerId: "alice",
      segment: "enterprise",
      countryCode: "JP",
      taxId: "3333333333333",
      currency: "JPY",
      creditLimit: 50_000_000,
      paymentTermsDays: 30,
      invoiceEmail: "jp@globalparts.example",
      addresses: [
        addr("d1", "hq", "港区1-1"),
        addr("d2", "bill_to", "港区1-1"),
        addr("d3", "ship_to", "港区1-1"),
      ],
      contacts: [
        contact("dc1", "Brown JP", {
          isPrimary: true,
          email: "jp@globalparts.example",
        }),
      ],
    }),
  );
  ops.push({
    accountId: "acc_sd_parent",
    openOrderCount: 8,
    openOrderAmount: 12_000_000,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 49_800_000, // nearly at limit, not held
  });

  accounts.push(
    base({
      id: "acc_sd_child",
      code: "GLOB-JP-NGO",
      legalName: "グローバル部品 名古屋工場",
      tradeName: "グローバル部品 名古屋",
      status: "active",
      creditHold: false,
      tradeSuspended: false,
      ownerId: "alice",
      parentAccountId: "acc_sd_parent",
      segment: "enterprise",
      countryCode: "JP",
      taxId: "3333333333334",
      currency: "JPY",
      creditLimit: 5_000_000,
      paymentTermsDays: 30,
      invoiceEmail: "ngo@globalparts.example",
      addresses: [
        addr("d4", "hq", "名古屋市中区1-1", { prefecture: "愛知県" }),
        addr("d5", "bill_to", "名古屋市中区1-1", { prefecture: "愛知県" }),
        addr("d6", "ship_to", "名古屋市港区2-2", {
          prefecture: "愛知県",
          label: "工場出荷場",
        }),
      ],
      contacts: [
        contact("dc2", "田中 工場", {
          role: "operations",
          isPrimary: true,
          phone: "052-000-0000",
        }),
      ],
    }),
  );
  ops.push({
    accountId: "acc_sd_child",
    openOrderCount: 3,
    openOrderAmount: 800_000,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 1_000_000,
  });

  // S-E prospect incomplete
  accounts.push(
    base({
      id: "acc_se",
      code: "PR-880",
      legalName: "見込 合同会社ライトワークス",
      tradeName: "ライトワークス",
      status: "prospect",
      creditHold: false,
      tradeSuspended: false,
      ownerId: "carol",
      segment: "smb",
      countryCode: "JP",
      currency: "JPY",
      creditLimit: 0,
      paymentTermsDays: 30,
      addresses: [addr("e1", "hq", "札幌市中央区1-1", { prefecture: "北海道" })],
      contacts: [],
    }),
  );
  ops.push({
    accountId: "acc_se",
    openOrderCount: 0,
    openOrderAmount: 0,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 0,
  });

  // S-F long legal name + multi ship
  accounts.push(
    base({
      id: "acc_sf",
      code: "LONG-01",
      legalName:
        "東日本地域統合ロジスティクス・アンド・サプライチェーン・マネジメント株式会社",
      tradeName: "東日本ロジ",
      status: "active",
      creditHold: false,
      tradeSuspended: false,
      ownerId: "bob",
      segment: "enterprise",
      countryCode: "JP",
      taxId: "4444444444444",
      currency: "JPY",
      creditLimit: 30_000_000,
      paymentTermsDays: 60,
      invoiceEmail: "bill@higashi-logi.example",
      addresses: [
        addr("f1", "hq", "さいたま市大宮区1-1", { prefecture: "埼玉県" }),
        addr("f2", "bill_to", "さいたま市大宮区1-1", { prefecture: "埼玉県" }),
        addr("f3", "ship_to", "川口市1-1", {
          prefecture: "埼玉県",
          label: "川口DC",
          isDefaultForRole: true,
        }),
        addr("f4", "ship_to", "越谷市2-2", {
          prefecture: "埼玉県",
          label: "越谷DC",
          isDefaultForRole: false,
        }),
        addr("f5", "ship_to", "所沢市3-3", {
          prefecture: "埼玉県",
          label: "所沢DC",
          isDefaultForRole: false,
        }),
      ],
      contacts: [
        contact("fc1", "吉田 物流", { isPrimary: true, role: "operations" }),
      ],
    }),
  );
  ops.push({
    accountId: "acc_sf",
    openOrderCount: 4,
    openOrderAmount: 1_500_000,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 4_000_000,
  });

  // S-G force hold, no overdue
  accounts.push(
    base({
      id: "acc_sg",
      code: "QLT-09",
      legalName: "品質精密工業株式会社",
      tradeName: "品質精密",
      status: "active",
      creditHold: true,
      creditHoldReason:
        "品質クレーム調査中（営業本部長指示）— 与信枠には余裕あり",
      tradeSuspended: false,
      ownerId: "alice",
      segment: "mid",
      countryCode: "JP",
      taxId: "5555555555555",
      currency: "JPY",
      creditLimit: 8_000_000,
      paymentTermsDays: 30,
      invoiceEmail: "bill@hinshitsu.example",
      addresses: [
        addr("g1", "hq", "浜松市1-1", { prefecture: "静岡県" }),
        addr("g2", "bill_to", "浜松市1-1", { prefecture: "静岡県" }),
        addr("g3", "ship_to", "浜松市2-2", { prefecture: "静岡県" }),
      ],
      contacts: [
        contact("gc1", "松本 QA", { isPrimary: true, role: "operations" }),
      ],
    }),
  );
  ops.push({
    accountId: "acc_sg",
    openOrderCount: 0,
    openOrderAmount: 0,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 500_000,
  });

  // S-H long terms + event
  accounts.push(
    base({
      id: "acc_sh",
      code: "TERM-60",
      legalName: "長期サイト商事株式会社",
      tradeName: "長期サイト商事",
      status: "active",
      creditHold: false,
      tradeSuspended: false,
      ownerId: "bob",
      segment: "smb",
      countryCode: "JP",
      taxId: "6666666666666",
      currency: "JPY",
      creditLimit: 3_000_000,
      paymentTermsDays: 60,
      invoiceEmail: "pay@choki.example",
      addresses: [
        addr("h1", "hq", "福岡市博多区1-1", { prefecture: "福岡県" }),
        addr("h2", "bill_to", "福岡市博多区1-1", { prefecture: "福岡県" }),
        addr("h3", "ship_to", "福岡市博多区1-1", { prefecture: "福岡県" }),
      ],
      contacts: [
        contact("hc1", "井上 営業", { isPrimary: true, role: "other" }),
      ],
    }),
  );
  ops.push({
    accountId: "acc_sh",
    openOrderCount: 1,
    openOrderAmount: 120_000,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 200_000,
  });
  events.push({
    id: "ev_sh1",
    accountId: "acc_sh",
    at: "2026-06-01T00:00:00.000Z",
    actorId: "bob",
    kind: "updated",
    summary: "支払条件を Net30 → Net60 に変更",
  });

  // S-I suspended
  accounts.push(
    base({
      id: "acc_si",
      code: "STOP-1",
      legalName: "停止商事株式会社",
      tradeName: "停止商事",
      status: "suspended",
      statusReason: "取引方針見直しにより停止",
      creditHold: false,
      tradeSuspended: true,
      tradeSuspendReason: "出荷停止中",
      ownerId: "carol",
      segment: "smb",
      countryCode: "JP",
      taxId: "7777777777777",
      currency: "JPY",
      creditLimit: 1_000_000,
      paymentTermsDays: 30,
      invoiceEmail: "x@stop.example",
      addresses: [
        addr("i1", "hq", "仙台市1-1", { prefecture: "宮城県" }),
        addr("i2", "bill_to", "仙台市1-1", { prefecture: "宮城県" }),
      ],
      contacts: [
        contact("ic1", "斎藤", { isPrimary: true }),
      ],
    }),
  );
  ops.push({
    accountId: "acc_si",
    openOrderCount: 0,
    openOrderAmount: 0,
    overdueInvoiceCount: 1,
    overdueAmount: 50_000,
    accruedReceivables: 50_000,
  });

  // S-J active missing primary
  accounts.push(
    base({
      id: "acc_sj",
      code: "NOPRIM",
      legalName: "代表不在テスト株式会社",
      tradeName: "代表不在テスト",
      status: "active",
      creditHold: false,
      tradeSuspended: false,
      ownerId: "alice",
      segment: "smb",
      countryCode: "JP",
      taxId: "8888888888888",
      currency: "JPY",
      creditLimit: 2_000_000,
      paymentTermsDays: 30,
      invoiceEmail: "x@noprim.example",
      addresses: [
        addr("j1", "hq", "京都市1-1", { prefecture: "京都府" }),
        addr("j2", "bill_to", "京都市1-1", { prefecture: "京都府" }),
        addr("j3", "ship_to", "京都市2-2", { prefecture: "京都府" }),
      ],
      contacts: [
        contact("jc1", "誰か", { role: "billing", isPrimary: false }),
      ],
    }),
  );
  ops.push({
    accountId: "acc_sj",
    openOrderCount: 0,
    openOrderAmount: 0,
    overdueInvoiceCount: 0,
    overdueAmount: 0,
    accruedReceivables: 0,
  });

  // Filler for paging
  for (let i = 1; i <= 30; i++) {
    const id = `acc_fill_${i}`;
    accounts.push(
      base({
        id,
        code: `F-${String(i).padStart(3, "0")}`,
        legalName: `充填サンプル株式会社 ${i}`,
        tradeName: `充填${i}`,
        status: i % 7 === 0 ? "prospect" : "active",
        creditHold: false,
        tradeSuspended: false,
        ownerId: i % 3 === 0 ? "alice" : i % 3 === 1 ? "bob" : "carol",
        segment: i % 2 === 0 ? "smb" : "mid",
        countryCode: "JP",
        taxId: i % 5 === 0 ? undefined : `9${String(i).padStart(12, "0")}`,
        currency: "JPY",
        creditLimit: 1_000_000 * (i % 5 + 1),
        paymentTermsDays: 30,
        invoiceEmail: i % 5 === 0 ? undefined : `f${i}@fill.example`,
        addresses: [
          addr(`${id}_hq`, "hq", `サンプル区${i}-${i}`),
          ...(i % 5 === 0
            ? []
            : [
                addr(`${id}_bill`, "bill_to", `サンプル区${i}-${i}`),
                addr(`${id}_ship`, "ship_to", `サンプル区${i}-倉庫`),
              ]),
        ],
        contacts:
          i % 4 === 0
            ? []
            : [
                contact(`${id}_c`, `担当${i}`, {
                  isPrimary: true,
                  email: `f${i}@fill.example`,
                }),
              ],
        updatedAt: new Date(Date.parse(now) - i * 86_400_000).toISOString(),
      }),
    );
    ops.push({
      accountId: id,
      openOrderCount: i % 4,
      openOrderAmount: (i % 4) * 100_000,
      overdueInvoiceCount: i % 11 === 0 ? 1 : 0,
      overdueAmount: i % 11 === 0 ? 40_000 : 0,
      accruedReceivables: (i % 6) * 100_000,
    });
  }

  // baseline events for a few
  for (const a of accounts.slice(0, 8)) {
    events.push({
      id: `ev_${a.id}_c`,
      accountId: a.id,
      at: a.createdAt,
      actorId: a.updatedBy,
      kind: "created",
      summary: "取引先を登録",
    });
  }
  events.push({
    id: "ev_sc_hold",
    accountId: "acc_sc",
    at: "2026-06-01T00:00:00.000Z",
    actorId: "carol",
    kind: "credit_hold_changed",
    summary: "与信停止を設定（延滞61日超）",
  });

  return { accounts, ops, events };
}
