# account-desk design system

Example-local design system for a **dense B2B operations desk**.  
Not a publishable package. Not imported from repo root.

## Research basis

| Source | What we take | What we reject |
| --- | --- | --- |
| [IBM Carbon — Spacing](https://carbondesignsystem.com/elements/spacing/overview/) | 2/4/8 scale tokens (`space-01`…); stack gaps from same scale | Carbon React dependency; expressive marketing type |
| [IBM Carbon — Typography (productive)](https://carbondesignsystem.com/elements/typography/type-sets/) | **14px base**, fixed productive headings for dense product UI | Expressive 16px marketing scale as default |
| [IBM Carbon — Data table](https://carbondesignsystem.com/components/data-table/usage/) | Table gets max width; toolbar + search + filters; not inside nested cards | Decorative row chrome |
| [PatternFly — Tokens](https://www.patternfly.org/tokens/about-tokens) | Semantic tokens (color/status/focus) over raw hex in components | Full PatternFly component pack |
| [GOV.UK — Error summary](https://design-system.service.gov.uk/components/error-summary/) | Page-level error list linking to fields | Toast-only validation |
| [GOV.UK — Validation pattern](https://design-system.service.gov.uk/patterns/validation/) | Field error + summary together | Silent client-only checks |
| B2B guide §6–§9, §13 | Empty vs zero vs forbidden; density for comparison | Visual novelty |

## Goals

1. **Scan density** — comparable data in tables; sections not card stacks.
2. **Predictable chrome** — one border language, one focus ring, status colors with meaning.
3. **Anti-slop** — ban multi-shadow, gradient fills, KPI card rows, card grids for rows.
4. **A11y** — visible focus, labels, keyboard paths, error summary links.
5. **Zero kit lock-in** — CSS variables + thin React primitives only.

## Non-goals

- Multi-brand theming engine
- Dark mode perfection (light is primary; tokens may allow later)
- Icon font library
- Chart / sparkline kit
- Storybook monorepo

## Architecture

```text
src/design-system/
  tokens.css          # sole place for raw values
  components/*        # thin primitives (no business rules)
  index.ts            # public exports

src/styles/app.css    # imports tokens + Tailwind; maps utilities to tokens

features/*/ui/*       # business composition — uses DS, never redefines colors
```

**Import rule:** features may import `~/design-system`.  
design-system must not import features or domain.

## Token layers

| Layer | Prefix | Example |
| --- | --- | --- |
| Primitive | `--raw-*` | `--raw-gray-700` |
| Semantic | `--color-*`, `--space-*`, `--font-*`, `--border-*`, `--focus-*` | `--color-danger`, `--space-05` |
| Component | only if unavoidable | prefer semantic |

### Spacing (Carbon-aligned)

| Token | px |
| --- | --- |
| `--space-01` | 2 |
| `--space-02` | 4 |
| `--space-03` | 8 |
| `--space-04` | 12 |
| `--space-05` | 16 |
| `--space-06` | 24 |
| `--space-07` | 32 |
| `--space-08` | 40 |

Dense desk defaults: table cell padding ≈ `--space-03` vertical / `--space-05` horizontal.

### Typography

| Role | Size | Weight |
| --- | --- | --- |
| body | 14px / 1.45 | 400 |
| label | 12px / 1.3 | 600 |
| meta | 12px / 1.3 | 400 muted |
| title | 18px / 1.3 | 600 |
| section | 14px / 1.3 | 600 |

Font stack: system UI (no webfont dependency).

### Color (semantic)

| Token | Role |
| --- | --- |
| `--color-bg` | page |
| `--color-surface` | panels |
| `--color-border` | 1px structure |
| `--color-text` | primary text |
| `--color-text-muted` | secondary |
| `--color-focus` | focus ring only emphasis |
| `--color-danger` / `--color-danger-bg` | errors, destructive |
| `--color-warning` / `--color-warning-bg` | hold, incomplete |
| `--color-success` / `--color-success-bg` | ready, ok |
| `--color-info` / `--color-info-bg` | neutral info |

**Ban:** `box-shadow` multi-layer decorative; `linear-gradient` fills for chrome; border-radius > 4px for surfaces.

## Primitives

| Component | Use when | Do not use when |
| --- | --- | --- |
| `PageHeader` | route title + primary actions | decorative hero |
| `Toolbar` | filters above a table | floating action bubble |
| `DataTable` | comparable rows | non-tabular content |
| `Section` | detail/edit blocks | wrapping each field in a card |
| `DefinitionList` | scannable key/value | long prose |
| `StatusCluster` | ≤2 chips in one cell | badge party |
| `Banner` | alertNote, page notices | every section header |
| `EmptyState` | empty / zero / forbidden / error (variants) | one generic illustration |
| `ErrorSummary` | form page top | replacing field errors |
| `Field` / `Select` / `TextArea` | labeled inputs | unlabeled placeholders only |
| `Button` | actions (primary / secondary / danger / ghost) | links that look like buttons without href |
| `Stack` | consistent gap | ad-hoc margin soup |

## Patterns

### List desk

```text
PageHeader
Toolbar (filters bound to URL)
result count (text, not KPI cards)
DataTable
EmptyState variant when needed
```

### Detail desk

```text
PageHeader (back keeps list query)
Banner? (alertNote)
Section × N (same order as edit)
nested tables for addresses / contacts
read-only ops summary + events tables
```

### Edit desk

```text
ErrorSummary
Section × N (same order as detail)
nested fieldsets/tables for collections
footer: Save / Cancel + dirty indicator
```

## Dependency policy

| Allowed | Forbidden for UI chrome |
| --- | --- |
| React, TanStack (Start/Router/Query/Form/Table), Zod | MUI, Chakra, Ant, Carbon React, PatternFly React, shadcn full kit, Radix (unless a proven a11y gap appears) |
| Tailwind v4 as utility engine | emotion/styled-components runtime |
| Playwright, Vitest | Chromatic-only workflow as gate |

## Verification

- Visual: no card grid on list; no multi-shadow in CSS.
- a11y: keyboard path list → detail → edit → save.
- Copy: empty vs filter-zero differ.
- Token: new colors only via `tokens.css`.
