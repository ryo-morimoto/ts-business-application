/**
 * Seed-fixed catalog + appraisal layers (CMS M does not edit these).
 * Cloned into each RuleSet so pin freezes the full rule package.
 */
import type {
  AppraisalRule,
  CatalogLayer,
  Category,
  SelectOption,
} from "./types";
import { CATEGORIES } from "./types";

const CONDITION_OPTIONS: SelectOption[] = [
  { value: "good", label: "良好" },
  { value: "fair", label: "可" },
  { value: "unusable", label: "使用不可" },
];

const PLATFORM_OPTIONS: SelectOption[] = [
  { value: "switch", label: "Switch" },
  { value: "ps5", label: "PS5" },
  { value: "ps4", label: "PS4" },
  { value: "other", label: "その他" },
];

export const CATEGORY_LABELS: Record<Category, string> = {
  game_soft: "ゲームソフト",
  apparel: "衣類",
  watch_jewelry: "時計・宝飾",
  ac_outdoor: "エアコン室外機",
};

export function buildSeedCatalog(): CatalogLayer {
  return {
    categories: {
      game_soft: {
        label: CATEGORY_LABELS.game_soft,
        requiresAuthenticity: false,
        fields: [
          { id: "title", label: "タイトル", kind: "text", required: true },
          {
            id: "platform",
            label: "機種",
            kind: "select",
            required: true,
            options: PLATFORM_OPTIONS,
          },
          { id: "working", label: "動作OK", kind: "boolean", required: true },
          { id: "package", label: "箱有", kind: "boolean", required: false },
        ],
      },
      apparel: {
        label: CATEGORY_LABELS.apparel,
        requiresAuthenticity: true,
        fields: [
          { id: "brand", label: "ブランド", kind: "text", required: true },
          { id: "size", label: "サイズ", kind: "text", required: false },
          {
            id: "condition",
            label: "状態",
            kind: "select",
            required: true,
            options: CONDITION_OPTIONS,
          },
        ],
      },
      watch_jewelry: {
        label: CATEGORY_LABELS.watch_jewelry,
        requiresAuthenticity: true,
        fields: [
          { id: "brand", label: "ブランド", kind: "text", required: true },
          { id: "model", label: "型番", kind: "text", required: true },
          { id: "serial", label: "シリアル", kind: "text", required: true },
          {
            id: "materials",
            label: "素材",
            kind: "text",
            required: false,
          },
          {
            id: "boxPapers",
            label: "箱・保証書",
            kind: "boolean",
            required: false,
          },
        ],
      },
      ac_outdoor: {
        label: CATEGORY_LABELS.ac_outdoor,
        requiresAuthenticity: false,
        fields: [
          { id: "maker", label: "メーカー", kind: "text", required: true },
          {
            id: "modelNumber",
            label: "型番",
            kind: "text",
            required: true,
          },
          {
            id: "serialOrLot",
            label: "製造番号/ロット",
            kind: "text",
            required: false,
          },
          {
            id: "notes",
            label: "備考",
            kind: "textarea",
            required: false,
          },
        ],
      },
    },
  };
}

/** Declarative appraisal rules applied after catalog + compliance. */
export function buildSeedAppraisal(): AppraisalRule[] {
  return [
    {
      type: "block_if_authenticity",
      values: ["reject"],
      code: "authenticity_reject",
      message: "買取基準外のため成約できません",
    },
    {
      type: "block_if_authenticity",
      values: ["hold"],
      code: "authenticity_hold",
      message:
        "真贋保留のため成約できません（再査定または不正品申告を検討）",
    },
    {
      type: "block_if_line_attr",
      category: "apparel",
      attr: "condition",
      equals: "unusable",
      code: "apparel_unusable",
      message: "使用不可の衣類は買取不可",
    },
    {
      type: "require_attr_if_missing",
      category: "ac_outdoor",
      whenAttrMissing: "serialOrLot",
      thenRequire: "notes",
      code: "ac_outdoor_serial_or_notes",
      message: "室外機は製造番号/ロットが無い場合、備考が必須です",
    },
    {
      type: "require_offer_positive",
      code: "offer_not_positive",
      message: "買取提示額は1円以上が必要です",
    },
  ];
}

export function seedLayers(): {
  catalog: CatalogLayer;
  appraisal: AppraisalRule[];
} {
  return {
    catalog: buildSeedCatalog(),
    appraisal: buildSeedAppraisal(),
  };
}

export function allCategoryOptions(): SelectOption[] {
  return CATEGORIES.map((c) => ({
    value: c,
    label: CATEGORY_LABELS[c],
  }));
}
