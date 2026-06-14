---
name: Snapifit-AI
description: A quiet, AI-assisted health journal — quick logging, systematic analysis, intelligent coaching.
colors:
  charcoal-ink: "#1C1C1E"
  paper-cream: "#FAFAF7"
  margin-white: "#FFFFFF"
  soft-ink: "#3A3A3C"
  pencil-grey: "#86868B"
  ruled-line: "#EAEAE5"
  ruled-line-strong: "#D8D8D2"
  apricot-food: "#FF9500"
  cinnabar-exercise: "#FF3B30"
  jade-weight: "#34C759"
  indigo-status: "#5856D6"
  rose-mood: "#FF2D55"
  cobalt-ai: "#0A84FF"
  iris-behavior: "#A855F7"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Source Han Sans SC\", \"Microsoft YaHei\", \"Segoe UI\", system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Source Han Sans SC\", \"Microsoft YaHei\", \"Segoe UI\", system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\""
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Source Han Sans SC\", \"Microsoft YaHei\", \"Segoe UI\", system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Source Han Sans SC\", \"Microsoft YaHei\", \"Segoe UI\", system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"ss01\", \"cv11\""
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"PingFang SC\", \"Source Han Sans SC\", \"Microsoft YaHei\", \"Segoe UI\", system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.02em"
rounded:
  pip: "3px"
  chip: "6px"
  tile-sm: "8px"
  control: "10px"
  card: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.charcoal-ink}"
    textColor: "{colors.margin-white}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.soft-ink}"
    textColor: "{colors.margin-white}"
  button-outline:
    backgroundColor: "{colors.margin-white}"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-ghost:
    backgroundColor: "{colors.paper-cream}"
    textColor: "{colors.pencil-grey}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  card-surface:
    backgroundColor: "{colors.margin-white}"
    rounded: "{rounded.card}"
    padding: "20px"
  tile-food:
    backgroundColor: "{colors.apricot-food}"
    textColor: "{colors.margin-white}"
    rounded: "{rounded.control}"
    size: "32px"
  tile-exercise:
    backgroundColor: "{colors.cinnabar-exercise}"
    textColor: "{colors.margin-white}"
    rounded: "{rounded.control}"
    size: "32px"
  input-text:
    backgroundColor: "{colors.margin-white}"
    textColor: "{colors.charcoal-ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "40px"
  chip-meal-breakfast:
    backgroundColor: "#FFF7ED"
    textColor: "#C2410C"
    rounded: "{rounded.chip}"
    padding: "2px 7px"
  pip-on:
    backgroundColor: "{colors.charcoal-ink}"
    rounded: "{rounded.pip}"
    height: "6px"
  pip-off:
    backgroundColor: "{colors.ruled-line}"
    rounded: "{rounded.pip}"
    height: "6px"
---

# Design System: Snapifit-AI

## 1. Overview

**Creative North Star: "The Quiet Health Journal"**

Snapifit-AI is a journal a doctor might keep for themselves — paper-cream pages, charcoal ink, the occasional category sticker pressed into the corner of an entry. Nothing on the page exists to be impressive; everything exists to be **read clearly six months from now**. The interface is the page, the data is the handwriting, and the AI is the quiet assistant that sometimes underlines the relevant passages without ever interrupting.

This system is explicitly **not** a SaaS dashboard, **not** a gym-bro athletic brand, **not** a clinical chart system, and **not** a Material 3 surface play. There are no gradients, no glassmorphism, no neon, no FAB. Color is a label, not a mood. Shadow is not a layer; the border is. The reader's eye lands on numbers — calories, weight, sleep hours, pip counts — not on chrome.

**Key Characteristics:**

- **Paper-cream canvas** (`#FAFAF7`), never pure white at the page level.
- **Charcoal ink** (`#1C1C1E`) as the only voice that carries across the whole product.
- **Six category accent colors** restricted to 32px tiles, 8px dots, and 2px progress fills — never card surfaces, never text bodies.
- **Flat by default**: 1px borders define cards; shadows are forbidden as a visual style.
- **Tabular numerals everywhere** that a number appears. Numbers are the protagonist.
- **No gradients, anywhere, ever** — a hard rule, not a preference.

## 2. Colors

A restrained palette in the [Restrained → Committed] register: one charcoal primary doing 90% of the lift, six category accents reserved as semantic stamps, and a tinted neutral system that always pulls slightly warm (the cream is the brand).

### Primary

- **Charcoal Ink** (`#1C1C1E` · `hsl(240 3% 11%)`): The single voice of the product. Used for primary text, primary buttons, the active sidebar pill, the ring stroke, the dark bar of every two-color chart, the user avatar background, the logo mark. If only one color appears in a screenshot of Snapifit, it's this one.

### Secondary — Category Accents

Six fixed-meaning accents. They are **never decorative**. Each one means a specific data category, and that mapping is product-wide.

- **Apricot — Food** (`#FF9500` · `hsl(35 100% 50%)`): Calorie intake, food entries, carbohydrate axis on charts.
- **Cinnabar — Exercise** (`#FF3B30` · `hsl(3 100% 59%)`): Calorie expenditure, exercise entries, "burn" values, also doubles as destructive (delete) because they share a hue and Snapifit only deletes log entries.
- **Jade — Weight** (`#34C759` · `hsl(135 59% 49%)`): Weight, body composition, calorie deficit (positive health outcome).
- **Indigo — Status** (`#5856D6` · `hsl(241 61% 59%)`): Daily status (mood / stress / sleep quality / sleep duration), the multi-dimensional record.
- **Rose — Mood** (`#FF2D55` · `hsl(349 100% 59%)`): The mood axis specifically (when status is broken out).
- **Cobalt — AI** (`#0A84FF` · `hsl(210 100% 52%)`): AI suggestions, the chat surface, AI persona avatars, the "AI is acting" status bar.
- **Iris — Behavior** (`#A855F7` · `hsl(271 91% 65%)`): Behavior-expert AI persona; rare, used only inside multi-agent consultation contexts.

### Neutral

- **Paper Cream** (`#FAFAF7` · `hsl(60 23% 97%)`): The page background. Warm, never pure. The brand is the cream.
- **Margin White** (`#FFFFFF`): Card / surface background. Reads as the "writing space" against the cream margin.
- **Soft Ink** (`#3A3A3C` · `hsl(240 2% 23%)`): Secondary text and body prose when charcoal would feel too heavy.
- **Pencil Grey** (`#86868B` · `hsl(240 2% 54%)`): Muted text — labels, units, captions, the "Last updated" line.
- **Ruled Line** (`#EAEAE5` · `hsl(60 11% 91%)`): Standard 1px borders, dividers, the off-state pip, the empty progress track.
- **Ruled Line Strong** (`#D8D8D2` · `hsl(60 7% 84%)`): Stronger border for inputs, outline buttons, hover states.

### Named Rules

**The Charcoal Voice Rule.** Across any single screen, charcoal ink and the cream/white neutrals must cover **at least 85%** of pixels. If a category accent is filling more than the 32×32 tile, the 8×8 dot, the 2px ring stroke, or a single meal-chip background, it is wrong.

**The Category Lock Rule.** Each accent has exactly one meaning. **Never** swap them for visual variety. Apricot is always food; Jade is always weight or deficit; Cobalt is always AI. A workout chart never paints exercise time in Jade because "it looks healthier" — that breaks the contract.

**The No-Gradient Rule.** No `linear-gradient`, no `radial-gradient`, no `background-clip: text`. Two-color visualization uses two **solid** colors. Hero numbers use a single solid color. The previous design's emerald gradient is the named anti-reference; do not regress.

**The Meal-Chip Pastel Set.** Breakfast `#FFF7ED`/`#C2410C` (`--meal-breakfast-bg` / `--meal-breakfast-fg`), Lunch `#FEF3C7`/`#92400E` (`--meal-lunch-bg` / `--meal-lunch-fg`), Dinner `#EDE9FE`/`#6D28D9` (`--meal-dinner-bg` / `--meal-dinner-fg`), Snack `#DCFCE7`/`#15803D` (`--meal-snack-bg` / `--meal-snack-fg`). These pastel backgrounds are the **only** sanctioned tinted backgrounds outside the cream/white system. Never invent a new pastel pair for a new category. Consume the tokens, not the raw hex.

## 3. Typography

**Display Font:** `-apple-system, BlinkMacSystemFont, "PingFang SC", "Source Han Sans SC", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif`

A single system-font stack, deliberate. The journal voice is the local OS's voice — San Francisco on macOS/iOS, PingFang on Chinese systems, Segoe on Windows. No web font load, no FOIT, no brand "designer" face. This is the doctor's handwriting in whatever language the patient speaks.

**Character:** Quiet, tabular, slightly tightened at large sizes. Letter-spacing tightens negative (`-0.02em` to `-0.03em`) at display and headline sizes; body runs at default tracking; small labels widen positively (`0.02em`) when set in uppercase. `font-feature-settings: "ss01", "cv11"` is on globally for the alternate-style features the system font ships with — subtle, but it's the texture of the page.

### Hierarchy

- **Display** (700, `clamp(1.5rem, 4vw, 1.875rem)` = 24–30px, line 1.15, tracking -0.02em): The page-header H1 in `PageHeader`. One per route. Never used inside a card.
- **Headline** (700, 24–30px, line 1.1, tracking -0.02em, **tabular-nums on**): The dashboard's hero numbers — the ring center number, the stat-card big value, the calorie-balance figure. This is where the eye lands.
- **Title** (600, 15px, line 1.3, tracking -0.01em): Card titles, sidebar nav labels, entry-row names. The "this thing is named X" tier.
- **Body** (400, 15px, line 1.5, `font-feature-settings: "ss01", "cv11"`): Default text. AI-suggestion paragraphs, descriptions, prose. Cap line length at 65–75ch for prose-heavy regions (chat, suggestions).
- **Label** (600, 13px, line 1.2, tracking 0.02em, frequently uppercase): The small CARD-TITLE caption above a card's content, the side-bar section divider, the suggestion-block heading. **Uppercase only at the 13px tier or smaller.**
- **Micro** (500, 11–12px, line 1.3, tracking 0.02em): The smallest tier — `.micro` chips, period-tab labels, the "Last updated 2 min ago" line. Pencil-grey only. Never bold.

### Named Rules

**The Tabular-Nums Rule.** Every number that represents a health metric — calories, grams, kg, minutes, reps, heart rate, pip counts, percentages — uses `font-variant-numeric: tabular-nums`. The numbers must align vertically when stacked in a list. If a column of numbers doesn't line up at the decimal, this rule is being violated.

**The Display-Is-Page-H1 Rule.** Only the page header may use the Display tier. Cards use Headline at most. No card title is ever 24px+. This forces the eye to register the route header first, then drop into the cards beneath.

**The Uppercase Floor Rule.** Uppercase typography only appears at 13px or smaller (Label and Micro tiers). The page H1, card headlines, button labels — none of these are uppercased. Uppercase reads as **caption / tag / divider**, not as **content**.

## 4. Elevation

This system is **flat by intention**. There are no shadows on cards, no elevation tokens, no hover lift. Depth is conveyed by:

1. **The cream/white layering** — cards (`#FFFFFF`) sit on the page (`#FAFAF7`). The 3% lightness gap is enough; no border would also work, but the 1px border carries the journal aesthetic.
2. **1px borders** in `Ruled Line` (`#EAEAE5`). Borders define every surface — cards, inputs, chips, dividers. Always exactly 1px. Never 2px. Never colored unless it's a focus ring.
3. **Inset hairline rings** for selected segmented-control pills: `box-shadow: 0 0 0 1px var(--line) inset`. This is the **only** sanctioned `box-shadow` value in the system — and it's a ring, not a drop.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. No `box-shadow` is used to imply elevation. Existing `shadow-lg` / `shadow-xl` declarations in legacy shadcn `Card` are **drift**, to be removed when touched — the project-canonical card class is `.health-card` (border + no shadow), and new card surfaces should not introduce shadows.

**The Border-Is-The-Shadow Rule.** Where another system would reach for `shadow-sm`, Snapifit uses a 1px `Ruled Line` border. Where another system would reach for `shadow-md` for a popover, Snapifit uses a 1px border plus the inherent contrast between Margin White and Paper Cream. The hover-lift pattern (`transform: translateY(-1px)` on buttons) is permitted on buttons only; it is **never** applied to cards.

**The No-Glass Rule.** No `backdrop-filter: blur(...)`, anywhere. Glassmorphism is forbidden. Disabled or empty states reduce the underlying content's opacity (30%) and overlay a near-solid `Margin White` panel (`bg-card/95`) — never a frosted-glass blur.

## 5. Components

The component family is **quiet, transparent, and focused on numbers**. State expresses itself through color, position, and weight — never through transform, shadow, or scale. A button that's hovered changes its background lightness; it does not lift, glow, or grow.

### Buttons

- **Shape:** Subtly rounded (`10px` radius, `--r-btn`). Same radius on every variant.
- **Primary:** Charcoal Ink fill, Margin White text, no border. Padding `8px 14px`, height 36px. Hover: background shifts to Soft Ink (`#3A3A3C`), and a `translateY(-1px)` micro-lift is permitted on buttons (the one place transform is allowed).
- **Outline / Secondary:** Margin White fill, Charcoal Ink text, `Ruled Line Strong` border (1px). Hover: background → Paper Cream, border → Charcoal Ink.
- **Ghost / Bare:** No background, no border, Pencil Grey text. Hover: text → Charcoal Ink, background → `rgba(0,0,0,0.04)`. Used in toolbars, table-row actions, and toolbar groups.
- **Destructive:** Cinnabar (`#FF3B30`) fill, Margin White text. Used sparingly — only "Delete entry" and "Abandon workout" call for it.
- **Icon-only:** 36×36 square at the same radius. The icon is the entire label.

### Chips

- **Meal chips** (breakfast / lunch / dinner / snack): The pastel set from the Color section. 10px bold uppercase Chinese label (早/午/晚/加), `6px` radius, `2px 7px` padding. Never used outside the meal context.
- **Micro chip** (`.micro`): Pencil Grey text on a `rgba(0,0,0,0.04)` background, 11px, `6px` radius. The "second-class citizen" data — units, secondary stats, "+2 kcal" deltas.
- **Period-tab pill** (active state of segmented control): Margin White fill on a `rgba(0,0,0,0.05)` track, charcoal text, with the `box-shadow: 0 0 0 1px var(--line) inset` hairline ring.
- **Stamp** (`.stamp.new`): A small tinted pill for "NEW" labels — `#DBEAFE` ish background, cobalt text, 10px medium, 1.5px 6px padding.

### Cards / Containers

- **Corner Style:** 16px radius (`--r-card`). Always 16px. Nested elements may step down to 10–12px; the outer surface holds the 16.
- **Background:** Margin White (`#FFFFFF`) — never tinted, never gradient.
- **Border:** 1px Ruled Line. Never colored. Never thicker.
- **Shadow Strategy:** None. See [§4 Elevation](#4-elevation).
- **Internal Padding:** 20px default (`--spacing.xl`). Tight rows inside cards step down to 12px.
- **Card head:** A small label-tier title (sometimes with a 32px Tile and a category accent) flush-left, optional `card-action` ("查看更多 →") flush-right, both vertically centered. The label is uppercase 13px Pencil Grey.

### Tiles (signature component)

The category-color glyph block. 32×32 with a 10px radius, white icon centered, single solid color background pulled from the category palette.

- **Purpose:** Visual category stamp at the head of any data card or list-row group. Says "this is a [food / exercise / weight / status / mood / AI / behavior] thing" without using a word.
- **Sizes:** 18 (inline), 32 (default — card head, list group), 36 (slightly larger pages), 44 (settings-style large affordances).
- **Variants:** `food | exercise | weight | status | mood | ai | ink | purple | indigo`. The `ink` variant uses Charcoal Ink and is the "default / neutral" stamp when no category applies.

### Inputs / Fields

- **Style:** Margin White fill, 1px Ruled Line border, 10px radius (`--r-btn`). Height 40px (`h-10`), padding `10px 12px`. Body-tier text inside, Pencil Grey placeholder.
- **Focus:** Border shifts to Charcoal Ink. Background may shift from `--surface-subtle` (`#FBFBF9`, Paper Cream tinted, used in textarea defaults) to Margin White when focused. Optional 2px focus ring uses Charcoal Ink at 30% opacity.
- **Textarea:** Same border + radius, `--surface-subtle` (`#FBFBF9`) cream background at rest, white when focused, vertical resize allowed.
- **Image slot:** A dashed 1px Ruled-Line-Strong box, 36×36, 8px radius. Pencil Grey "+" or icon. Hovers to Charcoal Ink border.

### Navigation

- **Desktop sidebar** (220px expanded / 64px collapsed): Vertical list, 9px vertical padding per item, 10px radius, 12px gap between icon and label. **Active state** is a solid Charcoal Ink pill with Margin White text and icon — no underline, no left-stripe. **Inactive** is Soft Ink text with no background; hover applies `rgba(0,0,0,0.03)` background.
- **Mobile bottom-tab** (sm720 and below, fixed bottom, 56px tall): Five tabs equally spaced, no background fill for active, **just** color shift (Pencil Grey → Charcoal Ink) and the active icon is filled. Bottom safe-area inset honored.
- **Top-bar / Page header** (`PageHeader` component): H1 Display + optional pencil-grey subtitle, right-side actions row. 24px bottom margin on mobile, 32px on sm720+.

### Ring (signature component)

The progress-circle component used for the daily kcal-balance hero. SVG-based, 160px default diameter, 10px stroke. Background ring uses Ruled Line; foreground ring uses Charcoal Ink (or a category color for context-specific rings). Center holds a Headline-tier tabular-nums number plus a Micro-tier label. The stroke transitions over 0.6s ease — the **only** non-instant animation in the dashboard's hero.

### Pips (signature component)

The 4-step status rating row used for mood / stress / sleep quality / sleep duration. 4 horizontal bars, 6px tall, 3px radius, separated by 4px gaps. Off state is Ruled Line; on state is Charcoal Ink (not the category color — pips inherit charcoal because the count is what's read, not the hue). The pip count is the data; the label above it tells you what "3 of 4" means.

### KcalRow (signature component)

A two-column data row used inside cards to break down a hero number. Left: 8px category-color swatch dot + Pencil Grey label. Right: bold tabular-nums value, optionally tinted Jade (positive deficit) or Cinnabar (over-budget). 1px Ruled Line divider between rows, no divider after the last row.

## 6. Do's and Don'ts

### Do:

- **Do** treat Paper Cream (`#FAFAF7`) as the page background everywhere — never substitute pure white at the page level.
- **Do** use Charcoal Ink (`#1C1C1E`) as the primary voice for text, buttons, ring strokes, and active nav states. The product should read as "charcoal on cream" before anything else.
- **Do** confine category accents to **32×32 tiles, 8×8 dots, 2px progress fills, and meal chips**. Anywhere else they appear, justify in code review.
- **Do** enable `font-variant-numeric: tabular-nums` on every health metric, weight readout, kcal value, time duration, and pip count.
- **Do** prefer 1px Ruled Line borders for separation — between cards, between rows, around inputs. Borders are how depth is expressed.
- **Do** keep the H1 (Display tier) **only** on the page header. Cards top out at Headline-tier numbers and Title-tier names.
- **Do** allow the one micro-lift (`translateY(-1px)`) on buttons during hover. Not on cards, not on tiles, not on inputs.
- **Do** use the pastel meal-chip set (orange / amber / violet / green) for breakfast / lunch / dinner / snack. Do not invent new meal categories or new pastel pairs.

### Don't:

- **Don't** use any gradient — no `linear-gradient`, no `radial-gradient`, no `background-clip: text`. The previous emerald-gradient design is the named anti-reference. (Carries forward from PRODUCT.md's *"SaaS 模板风"* anti-reference.)
- **Don't** apply `box-shadow` as a card elevation. The only sanctioned shadow value is the inset hairline ring on segmented-control active pills (`0 0 0 1px var(--line) inset`).
- **Don't** colorize card surfaces, card backgrounds, or text bodies with category accents. Apricot/Cinnabar/Jade/Indigo/Rose/Cobalt are **labels**, not **moods**. (Carries forward from PRODUCT.md's *"医疗临床感"* and *"传统健身 App"* anti-references.)
- **Don't** use Material 3 surface-tone layers, FABs, or Filled Tonal Button patterns. Even when the Android port arrives, the visual language is owned by this DESIGN.md, not by M3. (Carries forward from PRODUCT.md's *"Material 3 / 安卓原生味"* anti-reference.)
- **Don't** apply `backdrop-filter: blur(...)`. Glassmorphism is forbidden anywhere — including disabled / empty-state overlays. Dim the underlying chart with `opacity-30` and cover it with a near-solid `bg-card/95` panel instead.
- **Don't** introduce a side-stripe border (`border-left: 3px solid var(--c-food)`). The category Tile or 8px dot expresses category — never a colored stripe down a card edge.
- **Don't** use uppercase typography above the 13px Label tier. The page H1, card headlines, and button labels stay sentence-case.
- **Don't** introduce new fonts. The system-font stack is the brand. No Google Fonts, no Inter, no custom face.
- **Don't** swap a category accent for visual variety. Apricot is **always** food. Jade is **always** weight/deficit. Cobalt is **always** AI. Breaking the lock breaks the user's ability to read color as data.
- **Don't** wrap a card in another card. Nested cards are the SaaS-template smell test; if a card needs structure inside, use 1px Ruled Line dividers and Title/Body typography, not another Margin White surface.
