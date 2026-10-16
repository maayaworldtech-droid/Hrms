# design.md — Premium Web Design System

> A reusable, production-grade design system distilled from the visual language of Apple, Stripe, Notion, Zoho CRM / Zoho People, and other leading SaaS products.
> Use it as the single source of truth for design tokens, component standards, and implementation rules.

---

## 0. How to read this document

| Part | Purpose |
|------|---------|
| **Part 1 — Analysis** | Why premium products feel premium; what each reference does and why it works |
| **Part 2 — Foundations** | Design tokens: color, type, spacing, grid, radius, elevation, motion |
| **Part 3 — Components** | Specs for nav, hero, buttons, cards, forms, tables, dashboards, etc. |
| **Part 4 — Patterns & Quality** | Page patterns, accessibility, responsiveness, performance, copy |
| **Part 5 — Implementation** | CSS variables, Tailwind config, base styles, rules, QA checklist |

**Important caveat on the reference values.** The measurements below (hex values, font sizes, radii) are *approximations of publicly observable patterns*. Sites redesign often, and fonts like SF Pro, Söhne, and Zoho Puvi are proprietary. Treat the references as **calibration points**, not specs to copy. The tokens in Parts 2–5 are *original* values built from the same principles, using freely licensed fonts. To verify any reference, open DevTools → Computed styles on the live site.

---

# PART 1 — ANALYSIS

## 1.1 What makes a website feel "premium"

Premium is not decoration. It is the *absence of visual noise* combined with *obsessive consistency*. People read it subconsciously as "someone cared about every detail, so the product is reliable."

| # | Principle | What it looks like in practice | Why it works |
|---|-----------|-------------------------------|--------------|
| 1 | **Restraint** | One accent color, 2–3 type weights, 1–2 shadow styles | Fewer decisions for the eye = calm, confidence |
| 2 | **Generous whitespace** | 96–160px between sections, wide margins around hero text | Space signals value; crowding signals discount |
| 3 | **Strong, simple hierarchy** | One clear focal point per screen; 4–5 distinct text levels | Users know where to look in under a second |
| 4 | **Typographic precision** | Tight tracking on large headings, 1.5–1.65 line height on body, tabular numerals for data | Type is ~90% of a SaaS page; quality type = quality product |
| 5 | **Systematic consistency** | Same radius, spacing, and shadow logic everywhere | Predictability builds trust and reduces cognitive load |
| 6 | **Soft, layered depth** | Multi-layer, low-opacity, tinted shadows; 1px hairline borders | Mimics real light; avoids the "heavy drop-shadow" look |
| 7 | **Cohesive, limited color** | Neutral canvas + one brand hue + semantic colors | Color is used for *meaning* (action, status), not decoration |
| 8 | **High-quality assets** | Real product UI, crisp photography, custom illustration; no generic stock | Authentic visuals prove the product exists and works |
| 9 | **Purposeful motion** | 150–300ms eased transitions in response to user action; one orchestrated hero moment | Motion explains change; excessive motion reads as cheap |
| 10 | **Alignment & optical balance** | Everything on a grid; icons optically centered; consistent baselines | Misalignment of 2px is felt even when it isn't seen |
| 11 | **Complete states** | Hover, focus, active, disabled, loading, empty, error all designed | Finished products handle the unhappy path gracefully |
| 12 | **Confident, plain copy** | Short headlines, active verbs, no filler or hype | Words are part of the design; vague copy undermines polish |
| 13 | **Performance** | Fast first paint, no layout shift, smooth scrolling | A slow premium site is not premium |

### The premium formula (memorize this)

```
Premium = Restraint + Space + Type quality + Consistency + Subtle depth + Craft in states/motion
```

### Color psychology cheat-sheet

| Hue | Perception | Typical use |
|-----|-----------|-------------|
| Blue | Trust, stability, competence | Finance, enterprise, CRM/HR (Apple link blue, Zoho, Stripe-adjacent) |
| Indigo / violet | Innovation, sophistication | Developer & fintech (Stripe's blurple) |
| Near-black / warm charcoal | Authority, focus, editorial calm | Notion, Apple body text |
| Green | Growth, success, confirmation | Positive states, "approved", revenue |
| Amber | Attention without alarm | Warnings, pending |
| Red | Urgency, risk | Errors, destructive actions only — never decoration |
| Warm neutrals | Human, approachable | Notion-style content products |
| Cool neutrals | Precise, technical | Data-heavy dashboards |

---

## 1.2 Reference analysis

### Apple (apple.com)

**Philosophy:** The product is the hero. Everything else gets out of the way.

| Aspect | Observed pattern (approx.) |
|--------|---------------------------|
| **Color** | Text `#1d1d1f` (not pure black); secondary `#6e6e73`; canvas alternates `#ffffff` and `#f5f5f7`; interactive blue `#0071e3`; dark sections `#000` / `#1d1d1f` with white text. Color mostly comes from product photography. |
| **Typography** | SF Pro Display (≥20px) and SF Pro Text (<20px) — optical sizing. Hero headlines ~56–96px, weight 600, line-height ≈1.05–1.1, **negative tracking** (≈ −0.01 to −0.03em). Body ≈17px / 1.47 line-height. |
| **Spacing** | Very large vertical rhythm; sections are full-bleed bands; copy blocks are narrow and centered; heavy use of negative space around the product. |
| **Visual** | Large radius tiles (≈18–28px); almost no borders or shadows — separation comes from background color changes; huge, high-resolution imagery. |
| **Components** | Global nav ≈44px tall, translucent with `backdrop-filter: saturate(180%) blur(20px)`; **pill buttons** (radius ≈980px) in solid blue; text links with a trailing chevron ("Learn more ›"); sticky secondary nav on product pages. |
| **Motion** | Scroll-linked reveals, parallax and sticky storytelling, smooth ease curves (≈ `cubic-bezier(0.28, 0.11, 0.32, 1)`). |

**Why it works:** Extreme hierarchy (one headline, one subline, two links), full-bleed imagery, and typographic confidence. There is almost nothing to read, so everything that *is* there feels important.

**Borrow:** translucent blur nav, alternating canvas bands, tight-tracked large headings, pill CTAs, text-link secondary actions.
**Don't borrow:** scroll-jacking and heavy animation without the engineering budget; photography-dependent layouts if you don't have product imagery.

---

### Stripe (stripe.com)

**Philosophy:** Make financial infrastructure feel elegant, trustworthy, and technical — by letting craft show.

| Aspect | Observed pattern (approx.) |
|--------|---------------------------|
| **Color** | Deep navy headings (~`#0a2540` family) rather than black; body slate (~`#425466`); light canvas (~`#f6f9fc`); signature indigo/"blurple" (~`#635bff`); vivid gradient accents (cyan, magenta, orange, violet) concentrated in hero art. |
| **Typography** | Custom grotesque (Söhne-based) with refined weights (300–600). Headlines large, light-to-medium weight with tight tracking; **tabular numerals** for money; monospace for code. |
| **Spacing** | Spacious 4/8px-based rhythm; skewed/angled section dividers; content aligned to a visible column grid. |
| **Visual** | **Layered, tinted shadows** (e.g., `0 50px 100px -20px rgba(50,50,93,.25), 0 30px 60px -30px rgba(0,0,0,.3)`); moderate radii (≈4–8px for controls, ≈12px+ for large panels); animated gradient-mesh hero; product UI & code snippets *as* illustration. |
| **Components** | Nav with mega-menu dropdowns on hover/focus; dual CTA (filled primary + ghost secondary); logos strip as social proof; docs with 3-column layout (nav / content / code). |
| **Motion** | Subtle hover lifts, animated gradients, code typing, smooth menu transitions. |

**Why it works:** It looks engineered. Gradient + hairlines + realistic UI mockups communicate "this is a serious product built by serious people," and the layered shadows give depth without heaviness.

**Borrow:** tinted layered shadows, tabular numerals, product-UI-as-illustration, mega-menu behavior, navy-not-black text.
**Don't borrow:** gradient mesh everywhere — use in one hero moment only.

---

### Notion (notion.so)

**Philosophy:** A calm, human, tool-for-thought. Friendly and minimal, never corporate.

| Aspect | Observed pattern (approx.) |
|--------|---------------------------|
| **Color** | Warm charcoal text (`rgb(55,53,47)` ≈ `#37352f`); secondary gray (~`#787774`); white canvas with warm-gray surfaces (~`#f7f6f3`); borders as translucent warm gray (`rgba(55,53,47,0.09)`); blue accent (~`#2383e2`). |
| **Typography** | Inter-style sans with system fallbacks; optional serif for editorial warmth; headings 600–700, tight line-height (≈1.1–1.2), generous body line-height (≈1.5–1.6). |
| **Spacing** | Airy marketing pages; compact, dense app UI (14px base, 4–6px radii). |
| **Visual** | Hand-drawn, black-outline illustrations with playful color fills; screenshots of real product with soft shadow; hairline borders instead of heavy shadows. |
| **Components** | Minimal nav, black primary button (marketing) or blue (app), keyboard-shortcut hints, hover states that reveal controls (progressive disclosure). |
| **Motion** | Very restrained; fast (≈100–200ms) hover/focus transitions. |

**Why it works:** Warm neutrals + low-contrast borders + illustration give personality *without* clutter. The UI recedes so content is the focus.

**Borrow:** translucent-alpha borders/hover fills (works on any background), warm neutrals for content-first tools, progressive disclosure, shortcut hints.
**Don't borrow:** playful illustration style unless it matches your brand voice.

---

### Zoho CRM & Zoho People (HRMS) — enterprise reference

**Philosophy:** Breadth, density, and configurability for business users who live in the tool all day.

| Aspect | Observed pattern (approx.) |
|--------|---------------------------|
| **Color** | Zoho's four-color brand mark (red/green/blue/yellow) appears in logos; **product UI is mostly blue-led on light gray canvas with white cards**; status colors carry meaning (pipeline stages, leave status). |
| **Typography** | Zoho's custom family (Puvi) in newer surfaces; 13–14px base for density; clear sectioned headings. |
| **Layout** | Persistent top module bar or left rail; **list view + filter panel + detail view + related lists** pattern; Kanban pipelines; dashboards of KPI cards and charts; self-service portals (leave, attendance, payslips). |
| **Components** | Dense data tables with inline actions, saved filters/custom views, multi-step forms, calendar/attendance widgets, approval workflows. |

**Why it works for its audience:** Predictable module architecture means users learn one pattern and apply it everywhere. Information density is high *and* structured.

**What to learn:** information architecture (list → filter → detail → related), saved views, status chips, approval flows, role-based dashboards.
**What to improve when building your own:** more whitespace and a tighter type scale, fewer simultaneous nav items, reduced border density, consistent iconography, calmer colors. Enterprise ≠ cluttered.

---

### Bonus references worth studying

| Product | Learn from |
|---------|-----------|
| **Linear** | Dark-mode craft, extremely tight spacing and type, subtle gradients, keyboard-first UX |
| **Vercel** | Monochrome palette, hairline borders, developer-grade typography (Geist), grid backgrounds |
| **Airbnb / Figma** | Friendly rounded forms, vibrant but disciplined accent use, excellent empty/onboarding states |
| **Salesforce Lightning / Atlassian** | Rigorous enterprise tokens, accessibility baked-in, data-table conventions |

---

## 1.3 Cross-reference synthesis

| Dimension | Apple | Stripe | Notion | Zoho (enterprise) | **Our rule** |
|-----------|-------|--------|--------|-------------------|-------------|
| Text color | `#1d1d1f` | navy/slate | warm charcoal | dark gray | **Never pure `#000` — use tinted near-black** |
| Canvas | white / `#f5f5f7` | white / `#f6f9fc` | white / warm gray | light gray + white cards | **White + one subtle off-white** |
| Accent | blue | indigo | blue | blue | **One brand hue** |
| Heading tracking | negative | slight negative | slight negative | normal | **Negative on ≥28px** |
| Radius | 12–28px | 4–12px | 4–8px | 2–6px | **Scale by size (see §2.5)** |
| Depth | color-banding | layered shadows | hairline borders | borders + light shadow | **Hairline border + soft shadow, sparingly** |
| Density | very low | low–medium | medium | high | **Low (marketing) / Medium (app) / High (admin)** |
| Motion | cinematic | subtle | minimal | functional | **Functional by default; one hero moment** |

---

# PART 2 — FOUNDATIONS (DESIGN TOKENS)

## 2.1 Design principles (the rules behind the tokens)

1. **Content first.** UI chrome recedes; content and the primary action lead.
2. **One focal point per viewport.** If two things compete, demote one.
3. **Tokens, not values.** No raw hex, px, or ms in components — reference tokens only.
4. **Space does the separating.** Prefer whitespace → background shift → hairline border → shadow, in that order.
5. **Color carries meaning.** Brand = action. Green/amber/red = status. Gray = everything else.
6. **Every interactive element has all its states.** Default, hover, focus-visible, active, disabled, loading.
7. **Accessible by default.** WCAG 2.2 AA is the floor, not a bonus.
8. **Spend boldness in one place.** One memorable element per page (a hero visual, a headline treatment); keep everything else quiet.
9. **Avoid template tells.** See §4.7.

---

## 2.2 Color system

### 2.2.1 Structure

Three layers: **primitives** (raw scales) → **semantic tokens** (meaning) → **component tokens** (optional overrides). Components use semantic tokens only; dark mode swaps semantic mappings.

### 2.2.2 Primitive scales

**Neutral (cool slate — default for data-rich/SaaS products)**

| Token | Hex | Typical use |
|-------|-----|-------------|
| `gray-0` | `#FFFFFF` | Surfaces |
| `gray-25` | `#FCFCFD` | Raised page bg |
| `gray-50` | `#F7F8FA` | Alt section bg, app canvas |
| `gray-100` | `#F0F2F5` | Hover fills, subtle chips |
| `gray-200` | `#E4E7EC` | Borders (default) |
| `gray-300` | `#D0D5DD` | Input borders, strong dividers |
| `gray-400` | `#98A2B3` | Disabled text, decorative icons (≈2.6:1 — **not** for body text) |
| `gray-500` | `#667085` | Tertiary text, placeholders (≈4.8:1 on white ✔) |
| `gray-600` | `#475467` | Secondary text |
| `gray-700` | `#344054` | Labels, strong secondary |
| `gray-800` | `#1D2939` | Headings on tinted bg |
| `gray-900` | `#101828` | **Primary text** (≈17:1 on white) |
| `gray-950` | `#0C111D` | Dark mode canvas |

> **Warm alternative (Notion-like, content products):** replace the neutral scale with warm grays — text `#37352F`, secondary `#787774`, surface `#F7F6F3`, border `rgba(55,53,47,.09)`. Pick *one* neutral family per product; never mix.

**Brand (default: "Azure" — change one scale to re-brand the whole system)**

| Token | Hex | Notes |
|-------|-----|-------|
| `brand-50` | `#EEF4FF` | Tinted backgrounds, selected rows |
| `brand-100` | `#DBE7FF` | Hover on tinted bg |
| `brand-200` | `#BDD3FF` | Focus ring tint, light borders |
| `brand-300` | `#8FB4FF` | |
| `brand-400` | `#5C8BFF` | Dark-mode text/links |
| `brand-500` | `#3B68F5` | Links on white (≈4.7:1 ✔) |
| `brand-600` | `#2A4FE0` | **Primary button bg** (white text ≈6.4:1 ✔) |
| `brand-700` | `#233FB8` | Hover |
| `brand-800` | `#20388F` | Active/pressed |
| `brand-900` | `#1F3372` | Deep accents |

**Semantic status**

| Role | Bg tint | Border | Solid | Text on tint |
|------|---------|--------|-------|--------------|
| Success | `#ECFDF3` | `#ABEFC6` | `#12B76A` | `#027A48` |
| Warning | `#FFFAEB` | `#FEDF89` | `#F79009` | `#B54708` |
| Danger | `#FEF3F2` | `#FECDCA` | `#F04438` | `#B42318` |
| Info | `#EEF4FF` | `#BDD3FF` | `#3B68F5` | `#233FB8` |

### 2.2.3 Semantic tokens (light → dark)

| Token | Light | Dark |
|-------|-------|------|
| `--bg-canvas` | `gray-0` | `gray-950` |
| `--bg-subtle` | `gray-50` | `#111827` |
| `--bg-surface` | `gray-0` | `#151B28` |
| `--bg-surface-raised` | `gray-0` | `#1B2232` |
| `--bg-hover` | `gray-100` | `rgba(255,255,255,.06)` |
| `--text-primary` | `gray-900` | `#F5F6F8` |
| `--text-secondary` | `gray-600` | `#B4BAC6` |
| `--text-tertiary` | `gray-500` | `#8B93A3` |
| `--text-on-brand` | `#FFFFFF` | `#FFFFFF` |
| `--border-subtle` | `gray-200` | `rgba(255,255,255,.08)` |
| `--border-strong` | `gray-300` | `rgba(255,255,255,.16)` |
| `--action-bg` | `brand-600` | `brand-500` |
| `--action-bg-hover` | `brand-700` | `brand-400` |
| `--link` | `brand-600` | `brand-400` |
| `--focus-ring` | `brand-500` | `brand-400` |

### 2.2.4 Color usage rules

- **60 / 30 / 10:** 60% canvas neutrals, 30% secondary surfaces/text, 10% brand + status.
- **One primary action per view** gets `--action-bg`. Everything else is secondary (outline/ghost/text).
- **Gradients:** at most **one** hero gradient per page, built from 2–3 *adjacent* hues, at low saturation for backgrounds. Never put text over gradients without verified contrast (add a scrim if needed).
- **Dark sections** (Apple-style) are allowed as *bands* for emphasis — keep them to one or two per page.
- **Never rely on color alone** to convey state: pair with icon or text.
- **Contrast floor:** body text ≥ 4.5:1, large text (≥24px, or ≥19px bold) ≥ 3:1, UI boundaries/icons ≥ 3:1.
- **Disabled** elements are exempt from contrast, but must remain legible (≈3:1).
- **Do not** use pure `#000` for text on white or pure `#FFF` for text on pure black at large sizes (halation / harshness). Use `gray-900` and `#F5F6F8`.

### 2.2.5 Data-visualization palette (colorblind-considerate, ordered)

| # | Hex | Name |
|---|-----|------|
| 1 | `#2A4FE0` | Azure |
| 2 | `#12B76A` | Green |
| 3 | `#F79009` | Amber |
| 4 | `#7A5AF8` | Violet |
| 5 | `#06AED4` | Cyan |
| 6 | `#EE46BC` | Magenta |
| 7 | `#667085` | Slate |
| 8 | `#DD2590` | Rose |

Rules: use ≤ 5 series per chart; label directly where possible; distinguish with shape/pattern/dash as well as hue; gridlines `gray-200` at 1px; axis labels 12px `gray-500`; numbers in tabular figures.

---

## 2.3 Typography

### 2.3.1 Font strategy

| Role | Recommended (free) | Fallback stack | Notes |
|------|--------------------|----------------|-------|
| **Primary UI + marketing** | **Inter** (variable) or **Geist** | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | Use variable font, `font-optical-sizing: auto` |
| **Alternative humanist** | Manrope, DM Sans, Plus Jakarta Sans, Instrument Sans | same | Pick **one** primary — not several |
| **Editorial / serif accent (optional)** | Newsreader, Source Serif 4, Fraunces | `Georgia, "Times New Roman", serif` | For long-form or brand warmth; give serif +0.05 line-height |
| **Code / data** | JetBrains Mono, Geist Mono, IBM Plex Mono | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | Only for code and truly tabular IDs |

- Max **two families** per site (one sans + optional serif or mono).
- Load via `font-display: swap`, **preload** the primary variable font, subset to needed glyphs/languages (include Latin-ext, and Devanagari/Telugu etc. if your audience needs it — pair Inter with Noto Sans Telugu/Devanagari, matching x-height).
- Enable on body: `font-feature-settings: "cv11", "ss01"` (Inter's single-storey a / alt digits) only if you like the look; always enable `font-variant-numeric: tabular-nums` for tables, prices, KPIs.

### 2.3.2 Type scale (marketing — fluid)

Ratio ≈ 1.25 (major third) at body, widening for display. Use `clamp(min, preferred, max)`.

| Token | Size (desktop) | Fluid CSS | Weight | Line-height | Letter-spacing | Use |
|-------|---------------|-----------|--------|-------------|----------------|-----|
| `display-2xl` | 72px | `clamp(2.75rem, 1.5rem + 5.2vw, 4.5rem)` | 600 | 1.02 | −0.035em | Hero headline (one per site) |
| `display-xl` | 60px | `clamp(2.5rem, 1.5rem + 4vw, 3.75rem)` | 600 | 1.05 | −0.03em | Landing hero |
| `display-lg` | 48px | `clamp(2.125rem, 1.4rem + 3vw, 3rem)` | 600 | 1.08 | −0.028em | Section hero |
| `h1` | 40px | `clamp(1.875rem, 1.3rem + 2.2vw, 2.5rem)` | 600 | 1.15 | −0.022em | Page title |
| `h2` | 32px | `clamp(1.625rem, 1.2rem + 1.6vw, 2rem)` | 600 | 1.2 | −0.02em | Section title |
| `h3` | 24px | `1.5rem` | 600 | 1.3 | −0.015em | Sub-section |
| `h4` | 20px | `1.25rem` | 600 | 1.4 | −0.01em | Card title |
| `body-lg` | 18px | `1.125rem` | 400 | 1.6 | −0.005em | Lead paragraph |
| `body` | 16px | `1rem` | 400 | 1.6 | 0 | Default |
| `body-sm` | 14px | `0.875rem` | 400 | 1.5 | 0 | Secondary text |
| `caption` | 12px | `0.75rem` | 400/500 | 1.4 | +0.01em | Meta, helper text |

### 2.3.3 Type scale (application / dashboard — fixed)

| Token | Size / LH | Weight | Use |
|-------|-----------|--------|-----|
| `app-title` | 24 / 32 | 600 | Page title |
| `app-section` | 18 / 28 | 600 | Card/section heading |
| `app-body` | 14 / 20 | 400 | Default UI text, table cells |
| `app-body-strong` | 14 / 20 | 500–600 | Labels, emphasis |
| `app-small` | 13 / 18 | 400 | Dense lists |
| `app-caption` | 12 / 16 | 500 | Helper text, badges |
| `app-kpi` | 32 / 40 | 600 | KPI numerals, `tabular-nums` |

### 2.3.4 Typography rules

1. **Hierarchy through size + weight + color — not all three at once.** Typically change two.
2. **Weights:** 400 (body), 500 (UI labels), 600 (headings). Use 700+ rarely. Avoid 300 below 20px.
3. **Tracking:** tighten as size grows (see table). Never track body text negatively. Avoid wide-tracked ALL CAPS labels as a default decoration.
4. **Line length:** 45–75 characters (≈ `max-width: 65ch`). Hero subtext ≤ 60ch.
5. **Alignment:** left-align paragraphs. Center only short hero copy (≤ 3 lines) and short CTAs. Never center long text or multi-line lists.
6. **Headline balance:** `text-wrap: balance` on headings; `text-wrap: pretty` on paragraphs.
7. **Numbers:** `font-variant-numeric: tabular-nums` for any column of numbers; right-align numeric columns.
8. **Links in prose:** underline or distinct color + underline on hover; never color-only in body copy.
9. **Don't** accent a single word in a headline with a different color/italic as a reflex; do it only when the word carries the meaning.
10. **Minimum** body size: 16px marketing, 14px app UI (13px for dense tables only).

---

## 2.4 Spacing & layout

### 2.4.1 Spacing scale (4px base, 8px rhythm)

| Token | px | rem | Typical use |
|-------|----|-----|-------------|
| `space-0.5` | 2 | 0.125 | Hairline adjustments |
| `space-1` | 4 | 0.25 | Icon–text gap (tight) |
| `space-2` | 8 | 0.5 | Inline gaps, small padding |
| `space-3` | 12 | 0.75 | Input padding-y, chip padding |
| `space-4` | 16 | 1 | Default gap, card padding (compact) |
| `space-5` | 20 | 1.25 | |
| `space-6` | 24 | 1.5 | Card padding (default), grid gutter |
| `space-8` | 32 | 2 | Group separation |
| `space-10` | 40 | 2.5 | |
| `space-12` | 48 | 3 | Between blocks in a section |
| `space-16` | 64 | 4 | Section padding (mobile) |
| `space-20` | 80 | 5 | Section padding (tablet) |
| `space-24` | 96 | 6 | Section padding (desktop) |
| `space-32` | 128 | 8 | Hero / major section padding |
| `space-40` | 160 | 10 | Apple-style "breathing" bands |

**Rules**
- **Proximity = relationship.** Gap *within* a group < gap *between* groups (at least 1.5–2×).
- Only use scale values. No `13px`, `22px`, `37px`.
- **Section vertical padding:** mobile 64px · tablet 80–96px · desktop 96–128px · hero 128–160px.
- **Heading → body gap:** 12–16px. **Body → CTA gap:** 24–32px. **Hero headline → subtext:** 16–24px.
- Cards: padding 24px (marketing), 16–20px (app). Keep identical across a card set.

### 2.4.2 Grid & containers

| Token | Value | Use |
|-------|-------|-----|
| `container-sm` | 640px | Forms, auth screens |
| `container-md` | 768px | Narrow content |
| `container-prose` | 720px / `65ch` | Articles, docs body |
| `container-lg` | 1024px | |
| `container-xl` | **1200px** | Default marketing container |
| `container-2xl` | 1280px | Wide marketing |
| `container-app` | fluid, max 1600px | App content area |

- **12-column grid**, gutter 24px (≥1024), 16px (<768); page margin 24px (≥768) / 16px (<768) / 32–48px (≥1280).
- **Breakpoints:** `sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`. Design **mobile-first**.
- Common splits: hero text 5–6 cols + visual 6–7 cols; feature grid 3 × 4 cols; pricing 3 × 4 cols; docs 2 / 7 / 3.
- **Alignment:** pick a primary text axis per section (left *or* centered) and hold it. Align icons, text, and edges to the grid.
- **Max text width on ultrawide:** content is centered in its container; backgrounds can go full-bleed.

### 2.4.3 App shell dimensions

| Element | Value |
|---------|-------|
| Top bar | 56px (64px marketing nav) |
| Sidebar | 240px expanded / 64px collapsed |
| Content padding | 24px (32px ≥1280) |
| Table row | 48px default, 40px compact, 56px comfortable |
| Page header | 24px bottom margin, title + actions on one row |
| Right-hand detail panel / drawer | 400–480px |

---

## 2.5 Shape, borders & elevation

### 2.5.1 Radius scale

| Token | px | Use |
|-------|----|-----|
| `radius-xs` | 4 | Checkboxes, tags, tooltips |
| `radius-sm` | 6 | Small buttons, badges |
| `radius-md` | **8** | Inputs, buttons (default app) |
| `radius-lg` | **12** | Cards, dropdowns, popovers |
| `radius-xl` | 16 | Large cards, modals |
| `radius-2xl` | 24 | Hero panels, media tiles (Apple-like) |
| `radius-full` | 9999 | Pills, avatars, marketing CTAs |

**Rules:** radius scales with element size (bigger surface → bigger radius). **Nested radius = outer radius − padding** (e.g., 16px card with 8px padding → 8px inner). Don't mix pill and square buttons on the same page. Pick one button shape per brand: *pill* (Apple-like) **or** *8px rounded* (Stripe/Notion-like).

### 2.5.2 Borders

- Default: `1px solid var(--border-subtle)`. Strong (inputs, emphasis): `--border-strong`.
- Prefer **translucent borders** (`rgba(16,24,40,.08)`) on tinted surfaces so they adapt automatically.
- Use borders to **encode structure** (a table, a list, an input) — not decoration.
- Dividers: 1px, full-width in lists, inset in cards.

### 2.5.3 Elevation (shadows)

Shadows are **layered** (ambient + key light), **low-opacity**, and **tinted** with the neutral/brand hue — never pure black at high opacity.

| Token | Value | Use |
|-------|-------|-----|
| `shadow-xs` | `0 1px 2px rgba(16,24,40,.05)` | Buttons, inputs |
| `shadow-sm` | `0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)` | Cards (resting) |
| `shadow-md` | `0 4px 8px -2px rgba(16,24,40,.08), 0 2px 4px -2px rgba(16,24,40,.04)` | Hovered cards, dropdowns |
| `shadow-lg` | `0 12px 24px -4px rgba(16,24,40,.10), 0 4px 8px -2px rgba(16,24,40,.04)` | Popovers, menus |
| `shadow-xl` | `0 24px 48px -12px rgba(16,24,40,.18)` | Modals, drawers |
| `shadow-float` | `0 50px 100px -20px rgba(42,79,224,.18), 0 30px 60px -30px rgba(16,24,40,.25)` | Hero product mockups (Stripe-style, use once) |
| `ring-focus` | `0 0 0 4px rgba(59,104,245,.24)` | Focus halo (+ 1px brand border) |

**Rules:**
- Max **two elevation levels visible** in one viewport region (e.g., resting card + one overlay).
- Prefer **border + shadow-xs/sm** over heavy shadows. In dark mode, use *lighter surfaces* + borders instead of shadows.
- Do not apply the same shadow to every element — elevation must signal hierarchy.

### 2.5.4 Backgrounds & surfaces

- Alternate **canvas → subtle** bands to separate sections without lines.
- Subtle texture allowed: 1–3% noise, or a faint dot/grid pattern (`radial-gradient` 1px dots at 24px) masked with a fade, for hero/CTA bands.
- Gradient wash recipe (hero): `radial-gradient(60% 50% at 70% 0%, rgba(92,139,255,.25), transparent 70%), radial-gradient(40% 40% at 20% 10%, rgba(122,90,248,.18), transparent 70%)` over `--bg-canvas`.
- Glass (nav, sticky bars): `background: rgba(255,255,255,.72); backdrop-filter: saturate(180%) blur(20px); border-bottom: 1px solid var(--border-subtle)`. Provide an opaque fallback.

---

## 2.6 Iconography, imagery & illustration

**Icons**
- One family only (recommended: **Lucide**, Phosphor, or Heroicons). Stroke **1.5px** at 20–24px; 1.25–1.5px for 16px.
- Sizes: 16 (inline/dense), 20 (default UI), 24 (nav, feature), 32–48 (feature tiles, empty states).
- Color: `currentColor`; default `--text-secondary`; brand only for active/selected.
- Optically center icons in buttons; gap to label = 8px (6px for sm).
- Icon-only buttons require `aria-label` and a tooltip; hit area ≥ 40px.
- Never use emoji as UI icons.

**Imagery**
- Show **the real product** (cropped, high-DPI, with realistic data) in browser/device frames with a hairline border + `shadow-float`.
- Photography: consistent grading, subject-forward, no generic handshake/laptop stock. Use `object-fit: cover`, explicit `aspect-ratio`, `loading="lazy"` (except hero), AVIF/WebP with `srcset`.
- Illustration: one style (geometric line, flat, or hand-drawn) with a limited palette taken from brand + neutrals.
- Logos in social-proof strips: monochrome (`gray-500` at ~70–100% opacity), uniform optical height (24–32px).

---

## 2.7 Motion

### 2.7.1 Tokens

| Token | Value | Use |
|-------|-------|-----|
| `duration-instant` | 80ms | Press feedback |
| `duration-fast` | 150ms | Hover, focus, color changes |
| `duration-base` | 200ms | Toggles, dropdowns |
| `duration-slow` | 300ms | Modals, drawers, accordions |
| `duration-slower` | 500–700ms | One-time hero reveals |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Most transitions |
| `ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances, overlays |
| `ease-apple` | `cubic-bezier(0.28, 0.11, 0.32, 1)` | Large layout/scroll moves |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits |

### 2.7.2 Motion rules

1. **Motion answers action.** Hover, press, open, expand, confirm — yes. Decorative loops everywhere — no.
2. **Animate `transform` and `opacity` only** (GPU-friendly). Avoid animating `width/height/top/left/box-shadow` on large areas.
3. **Exits are faster than entrances** (~60–70%).
4. **Stagger** lists by 30–60ms, max 6 items.
5. Hover lift: `translateY(-2px)` + `shadow-md` — **only on clickable cards**.
6. **One orchestrated hero moment** per page load. No fade-and-slide-up on every section by default.
7. **Always respect** `prefers-reduced-motion: reduce` (replace with instant/opacity-only).
8. Skeletons (shimmer ≤ 1.4s) for loads > 400ms; spinners only inside buttons or small regions.
9. Never block interaction for animation; no animation > 700ms.

---

## 2.8 Z-index scale

`base 0` · `raised 10` · `sticky 100` · `nav 200` · `dropdown 300` · `overlay 400` · `modal 500` · `toast 600` · `tooltip 700`.

---

# PART 3 — COMPONENT STANDARDS

All components: use tokens only, support light + dark, define every state, meet 3:1 contrast on boundaries, and have a minimum 40×40px (44×44 on touch) hit area.

## 3.1 Navigation

### Marketing nav
| Property | Spec |
|----------|------|
| Height | 64px desktop · 56px mobile |
| Surface | Glass (translucent + blur) with 1px bottom border that appears after scroll > 8px |
| Layout | Logo (left) · primary links (center or left) · secondary link + **one** primary CTA (right) |
| Links | 14–15px, weight 500, `--text-secondary` → `--text-primary` on hover; active = primary + 2px underline or 6px dot |
| Menus | Mega-menu opens on hover **and** focus/click; 150–200ms fade + 4px translate; 2–3 columns with icon + title + one-line description; keyboard navigable (arrow keys, Esc) |
| Mobile | Hamburger → full-height sheet; links 18px, 56px rows; CTA pinned at bottom |
| Limit | ≤ 6 top-level items |

### Application nav
- **Sidebar:** 240px / 64px collapsed. Items 36–40px tall, 8px radius, icon 20px + label 14px/500. Active = `brand-50` bg + `brand-700` text (+ 2px left bar optional). Group with 12px caption headers (sentence case, `--text-tertiary`).
- **Top bar:** 56px; global search (⌘K command palette), notifications, help, user menu. Breadcrumbs under 3 levels deep.
- **Tabs:** 40px tall; active = 2px bottom border in brand + primary text; no filled pills for page-level tabs.

---

## 3.2 Hero section

**Anatomy:** *(optional short eyebrow)* → **headline** → subtext → **CTA group** → *(trust signal)* → **visual**.

| Property | Spec |
|----------|------|
| Padding | 128–160px top, 96–128px bottom (desktop); 64–80px (mobile) |
| Headline | `display-xl`/`display-2xl`, ≤ 12 words, ≤ 3 lines, `text-wrap: balance` |
| Subtext | `body-lg`, `--text-secondary`, ≤ 60ch, ≤ 2–3 lines |
| CTAs | 1 primary + 1 secondary (ghost or text-link). 16–24px between buttons |
| Trust | Logo strip or one proof line ("Used by 12,000 teams") directly below CTAs, 48–64px gap |
| Visual | Real product UI (preferred) in a frame with hairline border and `shadow-float`; or one confident image. Reserve space (`aspect-ratio`) to avoid CLS |
| Layouts | (a) Centered text + wide visual below (Apple/Stripe); (b) 5/7 split text-left + visual-right (Notion/Linear) |
| Background | Plain canvas, or one subtle gradient wash / dot-grid mask. Never busy patterns behind text |

**Copy rules:** headline states the outcome in plain words; subtext adds the "how/for whom"; CTA names the action ("Start free trial", "Book a demo").

---

## 3.3 Buttons

| Variant | Use | Style |
|---------|-----|-------|
| **Primary** | The one main action | `--action-bg`, white text, `shadow-xs`; hover `--action-bg-hover`; active `brand-800` + `scale(.98)` |
| **Secondary** | Alternative action | White bg, `1px --border-strong`, `--text-primary`; hover `--bg-hover` |
| **Tertiary / Ghost** | Low emphasis | Transparent, `--text-primary`; hover `--bg-hover` |
| **Link** | Inline/navigational | `--link`, underline on hover, optional chevron icon (not on every link) |
| **Destructive** | Delete/irreversible | `danger-600` bg; or outline-danger for less emphasis; always confirm irreversible actions |

| Size | Height | Padding-x | Font | Radius |
|------|--------|-----------|------|--------|
| `sm` | 32px | 12px | 13–14px/500 | 8px |
| `md` | **40px** | 16px | 14px/500 | 8px |
| `lg` | 48px | 24px | 16px/500 | 10px (or full pill) |

**States:** hover (150ms) · focus-visible (ring) · active (darker, `scale(.98)`) · disabled (`opacity .5`, `cursor: not-allowed`, no hover) · **loading** (spinner replaces icon, label stays, width fixed, `aria-busy`).

**Rules:** label in sentence case, verb-first, ≤ 3 words ("Save changes", not "Submit"). Max **one** primary per section. Don't put two filled buttons side by side. Icon gap 8px. Use `<button>` for actions, `<a>` for navigation.

---

## 3.4 Cards

| Property | Spec |
|----------|------|
| Surface | `--bg-surface`, `1px --border-subtle`, `radius-lg` (12px) or `radius-xl` (16px) |
| Padding | 24px (marketing) · 16–20px (app) |
| Elevation | `shadow-sm` at rest **or** border only; hover (if clickable) → `shadow-md` + `translateY(-2px)` + border darkens |
| Structure | Media/icon → title (`h4`) → description (`body-sm`, secondary) → optional footer action |
| Gaps | icon→title 16px · title→desc 8px · desc→action 16–24px |

**Variants:** *Feature* (icon in 40px tinted square, radius 10px), *Media* (top image with 4:3/16:9, inner radius = outer − 0), *Stat/KPI* (label caption → numeral `app-kpi` → delta chip), *Pricing* (highlight recommended plan with brand border 2px + "Most popular" chip), *Testimonial* (quote 18px, avatar 40px, name + role).

**Rules:** don't chop everything into identical cards — vary scale (bento grid: one 2×2 feature tile beside smaller tiles), use background-band or list layouts when content is sequential. Entire card clickable = a single link/overlay with proper focus ring.

---

## 3.4b Bento / feature grids
- 12-col grid, 16–24px gap; tiles span 4/6/8 cols; each tile = one idea, one visual.
- Tile radius `radius-xl`/`2xl`, surface `--bg-subtle` (borderless, Apple-like) **or** white + hairline.
- Max 5–7 tiles; one hero tile is larger.

---

## 3.5 Forms & inputs

| Element | Spec |
|---------|------|
| Label | Above field, 14px/500 `--text-primary`; optional marker "(optional)" in tertiary — don't star every field |
| Input | Height 40px (48px on marketing/auth), padding-x 12px, `1px --border-strong`, radius 8px, bg `--bg-surface`, `shadow-xs` |
| Placeholder | `gray-500`, example-style only — never replaces a label |
| Hover | Border darkens one step |
| Focus | Border `--focus-ring` + `ring-focus` halo; no outline removal without replacement |
| Helper | 12–13px `--text-tertiary` below, 6px gap |
| Error | Border `danger-500`, icon + message in `danger-700`, linked via `aria-describedby`, `aria-invalid="true"` |
| Success | Check icon + (optional) green helper; use sparingly |
| Disabled | `--bg-subtle`, `--text-tertiary`, no shadow |

**Layout:** single column by default; max 2 columns for short related fields (First/Last name). Field gap 20–24px; section gap 32–40px. Group related fields with a heading and 1px divider.
**Components:** text, textarea (auto-grow), select/combobox (searchable if > 7 options), checkbox/radio (20px, radius 4/full), switch (40×24), date picker, file upload (drag zone, 1px dashed `--border-strong`, shows progress and errors), OTP input.
**Validation:** validate on blur, re-validate on input after first error; summarize errors at top for long forms; preserve user input; never clear on error. Primary action label states outcome ("Create account").
**Multi-step forms:** step indicator (3–5 steps), progress saved, Back/Next always visible, review step before submit.

---

## 3.6 Data tables (critical for CRM / HRMS)

| Property | Spec |
|----------|------|
| Header | 12–13px/500 `--text-secondary`, `--bg-subtle`, sticky, sort icon on hover/active; sentence case (no ALL CAPS needed) |
| Rows | 48px (default) / 40px (compact); 1px `--border-subtle` bottom; hover `--bg-hover`; selected `brand-50` |
| Cells | 14px; text left-aligned, **numbers right-aligned + tabular-nums**, dates consistent format; truncate with ellipsis + tooltip |
| First column | Primary identifier (name) in `--text-primary` 500; supporting meta in secondary beneath |
| Actions | Row-level "⋯" menu; bulk actions bar appears on selection (sticky top) |
| Status | **Badge/chip**: 22–24px tall, radius full, tinted bg + dark text + 6px dot (never color alone) |
| Toolbar | Search (left), filters (chips with remove), view switcher/saved views, density toggle, primary "Add record" (right) |
| Pagination | Footer: rows-per-page, range "1–25 of 1,240", prev/next; or infinite scroll with count |
| States | Loading skeleton rows · empty state with CTA · error with retry · "no results" with clear-filters |
| Responsive | Horizontal scroll with pinned first column, or collapse to card list < 768px |

**Standard enterprise module pattern (Zoho-style, modernized):** `List view (filters + saved views) → Detail view (summary header, tabs: Overview / Activity / Related / Files) → Edit drawer`. Keep the pattern identical across Leads, Contacts, Deals, Employees, Leave, Payroll, etc.

---

## 3.7 Dashboards

- **Header row:** page title (24/32) + date-range / filters + primary action. 24px below.
- **KPI row:** 3–5 stat cards, equal width; label (13px secondary) → value (32px/600 tabular) → delta chip (▲ green / ▼ red with sign **and** icon) → optional sparkline.
- **Main grid:** 12 cols, 24px gap. Prioritize: left/top = most important chart; right = lists/activity.
- **Charts:** follow §2.2.5; titles describe the insight ("Revenue up 12% vs last month"); legends inline/direct; tooltips on hover + keyboard; always provide a table/summary alternative for accessibility.
- **Role-based:** HR admin vs employee vs manager see different default widgets (e.g., HRMS: attendance today, pending approvals, upcoming leave, headcount trend; CRM: pipeline by stage, deals closing this month, activity feed, forecast vs target).
- **Density:** at most 8–10 widgets above the fold; progressive disclosure for the rest.
- **Pipeline/Kanban:** columns 280–320px, 12px card gap, card = title + value + owner avatar + due chip; drag affordance on hover; column header shows count + total.

---

## 3.8 Overlays & feedback

| Component | Spec |
|-----------|------|
| **Modal** | 480/560/720px widths, `radius-xl`, `shadow-xl`, scrim `rgba(16,24,40,.5)` + 4px blur; padding 24px; title 18–20px; footer right-aligned (secondary left of primary); focus trap, Esc closes, return focus to trigger |
| **Drawer** | 400–480px right panel for edit/detail; keeps list context visible |
| **Dropdown/Popover** | `radius-lg`, `shadow-lg`, 4px offset, items 36px, max-height 320px scroll |
| **Tooltip** | 12px, dark surface, 6px radius, 300ms delay, ≤ 2 lines; never contain essential info |
| **Toast** | Bottom-right (top-center mobile), 4–6s, includes undo for reversible actions, `role="status"` |
| **Banner/Alert** | Tinted semantic bg + border + icon; title + one-sentence guidance + action |
| **Badge/Chip** | 22–24px tall; neutral by default, semantic only for status |
| **Progress** | 4–8px bar radius full; determinate when possible |
| **Skeleton** | Matches final layout; `--bg-hover` shimmer |
| **Empty state** | 48px icon/illustration + title + one-line explanation + primary CTA ("Add your first employee") |
| **Error state** | What happened + how to fix + retry; no apology fluff, no raw codes unless in a details disclosure |

---

## 3.9 Footer

- Dark or `--bg-subtle` band; 4–5 link columns (≤ 6 links each), 14px, `--text-secondary`; brand + one-line description + language/region selector; legal row 13px with copyright, privacy, terms, status link. 64–96px top padding.

## 3.10 CTA band (pre-footer)

- Contrasting band (brand-900 or `--bg-subtle`), centered `h2` + one line + **one** primary + one secondary. Padding 96px. No new visual ideas — repeat the core promise.

## 3.11 Pricing

- 3 tiers max visible (+ enterprise "Contact sales"); recommended plan emphasized (2px brand border, chip, slight elevation — not scale transform). Billing toggle (monthly/annual with savings chip). Price: 40–48px/600 tabular; feature lists with check icons (16px, `--text-secondary` for included; omit rather than show X's). Comparison table below with sticky header.

---

# PART 4 — PATTERNS & QUALITY

## 4.1 Page patterns (marketing)

Recommended section order (adapt, don't pad):

1. **Nav** (glass)
2. **Hero** — outcome headline, 2 CTAs, product visual
3. **Social proof** — logo strip / one metric
4. **Core value** — 3 benefits *or* one bento grid
5. **Deep-dive feature rows** — alternating text/visual (max 3–4), each with one claim + proof
6. **Use cases / roles** (tabs or cards)
7. **Testimonial / case study** with measurable result
8. **Pricing** or "How to get started" (3 steps — only if truly sequential)
9. **FAQ** (accordion, 6–8 Qs; sentence-case, answer in ≤ 3 lines)
10. **CTA band**
11. **Footer**

Each section: **one idea**, one heading, one visual or list. Alternate canvas/subtle backgrounds for rhythm. Section transitions via spacing, not divider lines.

## 4.2 Accessibility (WCAG 2.2 AA minimum)

| Requirement | Standard |
|-------------|----------|
| Text contrast | ≥ 4.5:1 (≥ 3:1 for large text) |
| UI component / icon contrast | ≥ 3:1 |
| Focus | Always visible: 2px brand outline/halo, ≥ 3:1, 2px offset; use `:focus-visible` |
| Target size | ≥ 24×24px (WCAG 2.2 min); **we use ≥ 40px, 44px on touch** |
| Keyboard | Everything operable via keyboard; logical tab order; skip-to-content link; Esc closes layers; arrow keys in menus/tabs |
| Semantics | Landmarks (`header nav main aside footer`), one `h1`, no skipped heading levels, real `<button>/<a>/<label>` |
| Forms | Programmatic labels, `aria-describedby` for help/errors, error identification in text |
| Images | Meaningful `alt`; decorative `alt=""`; charts have text summary |
| Motion | Respect `prefers-reduced-motion`; no flashing > 3/sec; pause/stop for auto-playing media |
| Color | Never sole carrier of meaning; support `prefers-color-scheme` and `forced-colors` |
| Zoom | Usable at 200% zoom and 320px width; no horizontal scroll (except tables/code) |
| Language | `lang` attribute; support RTL via logical properties (`margin-inline-start`) |
| Auth | No cognitive tests; allow paste in password fields; accessible alternatives to CAPTCHA |

## 4.3 Responsiveness

- **Mobile-first**, test at 320 / 375 / 768 / 1024 / 1280 / 1536.
- Hero: stack; headline drops to `display-lg`; CTAs full-width stacked (48px).
- Grids: 12 → 8 → 4 columns; feature grid 3 → 2 → 1.
- Nav: collapse < 1024px. Sidebar becomes bottom tab bar or drawer < 768px.
- Tables: scroll-X with sticky first column, or transform to cards.
- Use `rem`/`clamp()`, `min()`/`max()`, container queries for components, `dvh` instead of `vh`, safe-area insets on mobile.
- Touch: no hover-only functionality; 8px min spacing between targets.
- Images: `srcset`/`sizes`, `aspect-ratio` set to prevent layout shift.

## 4.4 Performance (part of "premium")

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| Page weight (marketing, initial) | < 1 MB transferred |
| Fonts | ≤ 2 files above the fold, preloaded, `font-display: swap` |

Lazy-load below-the-fold media; avoid layout-shifting web fonts (use `size-adjust` fallback); compress to AVIF/WebP; defer non-critical JS; prefer CSS animation over JS.

## 4.5 Content & microcopy

- **Plain, specific, active.** "Save changes", not "Submit". "Add employee", not "Create new record entry".
- **Sentence case** everywhere (buttons, headings, nav). Title Case only for proper names.
- **Same word for the same action** across the whole flow: button says "Publish" → toast says "Published".
- **Errors:** say what happened and how to fix it. *"Enter a valid work email, e.g. name@company.com."* No blame, no apology filler.
- **Empty states:** invite action; don't be cute.
- **Numbers & dates:** locale-aware; consistent format (e.g., `16 Oct 2026`); currency with symbol and thousands separators.
- **Headlines:** ≤ 12 words, outcome-first, no buzzwords ("revolutionary", "seamless", "next-gen").
- Avoid decorative text: no eyebrow label above every heading, no middle-dot meta strings, no arrow appended to every link.

## 4.6 Micro-interaction catalog

| Interaction | Behavior |
|-------------|----------|
| Button press | `scale(.98)` for 80ms, return on release |
| Card hover | Lift 2px + shadow-md, 200ms `ease-standard` |
| Link hover | Underline slides/fades in, 150ms |
| Input focus | Border color + halo fade 150ms |
| Toggle | Thumb slides 200ms with slight overshoot (`ease-out-expo`) |
| Accordion | Height via CSS grid-rows `0fr → 1fr`, 250ms; chevron rotates 180° |
| Dropdown | Opacity 0→1 + `translateY(-4px→0)`, 150ms |
| Modal | Scrim fades 200ms; panel `scale(.97→1)` + fade, 250ms `ease-out-expo` |
| Save | Button → loading → check icon 1.2s → label returns; toast confirms |
| List item add/remove | Height collapse + fade 200ms; offer **Undo** |
| Page load (hero) | Single staggered reveal, ≤ 700ms total; once only |
| Scroll | Sticky nav border/blur on scroll; **avoid scroll-jacking** |

## 4.7 Anti-patterns & "template tells" — avoid

| Don't | Do instead |
|-------|-----------|
| Pure `#000` text on `#FFF` | `gray-900` on white |
| 3+ font families, or random weights | One family (+ optional serif/mono), 400/500/600 |
| Every section in identical rounded cards with the same grey shadow | Vary tile scale, use bands/lists, reserve shadow for elevation |
| One radius on everything | Radius scale tied to element size |
| Gradient washes on every section | One hero gradient, rest flat |
| Tracked-out ALL-CAPS eyebrow above every heading | Only when it adds real information (category, status) |
| Highlighting one word in every headline | Plain headlines; accent only for true emphasis |
| `01 / 02 / 03` numbering on non-sequential content | Numbers only for real steps |
| Fade-up on every section + hover animation on every card | One hero moment; interactions respond to user action |
| Center-aligned paragraphs and long lists | Left-align; center only short hero copy |
| Low-contrast light-gray text for "elegance" | `gray-600` min for secondary, `gray-500` for tertiary |
| Placeholder as label | Persistent visible label |
| Generic stock photos | Real product UI, custom illustration |
| Hover-only controls on touch | Always-visible fallback |
| Dense tables with borders on every cell | Row dividers only, generous row height |
| Mixed icon styles/weights | One icon set, one stroke width |
| Modal on top of modal | Drawer, inline expansion, or step flow |
| Disabled buttons without explanation | Enable and validate on click, or explain why with helper text |

---

# PART 5 — IMPLEMENTATION

## 5.1 `tokens.css` (drop-in)

```css
/* ============ PRIMITIVES ============ */
:root {
  /* Neutral */
  --gray-0:#fff; --gray-25:#fcfcfd; --gray-50:#f7f8fa; --gray-100:#f0f2f5;
  --gray-200:#e4e7ec; --gray-300:#d0d5dd; --gray-400:#98a2b3; --gray-500:#667085;
  --gray-600:#475467; --gray-700:#344054; --gray-800:#1d2939; --gray-900:#101828; --gray-950:#0c111d;

  /* Brand (swap this scale to re-brand) */
  --brand-50:#eef4ff;  --brand-100:#dbe7ff; --brand-200:#bdd3ff; --brand-300:#8fb4ff;
  --brand-400:#5c8bff; --brand-500:#3b68f5; --brand-600:#2a4fe0; --brand-700:#233fb8;
  --brand-800:#20388f; --brand-900:#1f3372;

  /* Status */
  --success-50:#ecfdf3; --success-200:#abefc6; --success-500:#12b76a; --success-700:#027a48;
  --warning-50:#fffaeb; --warning-200:#fedf89; --warning-500:#f79009; --warning-700:#b54708;
  --danger-50:#fef3f2;  --danger-200:#fecdca;  --danger-500:#f04438;  --danger-600:#d92d20; --danger-700:#b42318;

  /* Type */
  --font-sans: "Inter var", Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-serif: "Newsreader", Georgia, "Times New Roman", serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --text-display-2xl: clamp(2.75rem, 1.5rem + 5.2vw, 4.5rem);
  --text-display-xl:  clamp(2.5rem, 1.5rem + 4vw, 3.75rem);
  --text-display-lg:  clamp(2.125rem, 1.4rem + 3vw, 3rem);
  --text-h1: clamp(1.875rem, 1.3rem + 2.2vw, 2.5rem);
  --text-h2: clamp(1.625rem, 1.2rem + 1.6vw, 2rem);
  --text-h3: 1.5rem; --text-h4: 1.25rem;
  --text-lg: 1.125rem; --text-md: 1rem; --text-sm: .875rem; --text-xs: .75rem;

  /* Spacing */
  --space-1:.25rem; --space-2:.5rem; --space-3:.75rem; --space-4:1rem; --space-5:1.25rem;
  --space-6:1.5rem; --space-8:2rem; --space-10:2.5rem; --space-12:3rem; --space-16:4rem;
  --space-20:5rem; --space-24:6rem; --space-32:8rem; --space-40:10rem;

  /* Radius */
  --radius-xs:4px; --radius-sm:6px; --radius-md:8px; --radius-lg:12px;
  --radius-xl:16px; --radius-2xl:24px; --radius-full:9999px;

  /* Elevation */
  --shadow-xs:0 1px 2px rgb(16 24 40 / .05);
  --shadow-sm:0 1px 3px rgb(16 24 40 / .08), 0 1px 2px rgb(16 24 40 / .04);
  --shadow-md:0 4px 8px -2px rgb(16 24 40 / .08), 0 2px 4px -2px rgb(16 24 40 / .04);
  --shadow-lg:0 12px 24px -4px rgb(16 24 40 / .10), 0 4px 8px -2px rgb(16 24 40 / .04);
  --shadow-xl:0 24px 48px -12px rgb(16 24 40 / .18);
  --shadow-float:0 50px 100px -20px rgb(42 79 224 / .18), 0 30px 60px -30px rgb(16 24 40 / .25);
  --ring-focus:0 0 0 4px rgb(59 104 245 / .24);

  /* Motion */
  --dur-instant:80ms; --dur-fast:150ms; --dur-base:200ms; --dur-slow:300ms; --dur-slower:600ms;
  --ease-standard:cubic-bezier(.2,0,0,1);
  --ease-out-expo:cubic-bezier(.16,1,.3,1);
  --ease-apple:cubic-bezier(.28,.11,.32,1);

  /* Layout */
  --container-xl:1200px; --container-prose:65ch; --gutter:24px; --nav-h:64px;
}

/* ============ SEMANTIC (LIGHT) ============ */
:root, [data-theme="light"] {
  color-scheme: light;
  --bg-canvas:var(--gray-0);   --bg-subtle:var(--gray-50);
  --bg-surface:var(--gray-0);  --bg-raised:var(--gray-0);  --bg-hover:var(--gray-100);
  --text-primary:var(--gray-900); --text-secondary:var(--gray-600); --text-tertiary:var(--gray-500);
  --text-on-brand:#fff;
  --border-subtle:var(--gray-200); --border-strong:var(--gray-300);
  --action-bg:var(--brand-600); --action-bg-hover:var(--brand-700); --action-bg-active:var(--brand-800);
  --link:var(--brand-600); --focus:var(--brand-500);
  --selected-bg:var(--brand-50); --selected-text:var(--brand-700);
  --scrim:rgb(16 24 40 / .5);
  --glass-bg:rgb(255 255 255 / .72);
}

/* ============ SEMANTIC (DARK) ============ */
/* Follows the OS unless the user has explicitly chosen light */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --bg-canvas:var(--gray-950); --bg-subtle:#111827; --bg-surface:#151b28; --bg-raised:#1b2232;
    --bg-hover:rgb(255 255 255 / .06);
    --text-primary:#f5f6f8; --text-secondary:#b4bac6; --text-tertiary:#8b93a3;
    --border-subtle:rgb(255 255 255 / .08); --border-strong:rgb(255 255 255 / .16);
    --action-bg:var(--brand-500); --action-bg-hover:var(--brand-400); --action-bg-active:var(--brand-600);
    --link:var(--brand-400); --focus:var(--brand-400);
    --selected-bg:rgb(92 139 255 / .14); --selected-text:var(--brand-300);
    --scrim:rgb(0 0 0 / .6); --glass-bg:rgb(12 17 29 / .72);
  }
}
/* Explicit user choice always wins */
[data-theme="dark"] {
  color-scheme: dark;
  --bg-canvas:var(--gray-950); --bg-subtle:#111827; --bg-surface:#151b28; --bg-raised:#1b2232;
  --bg-hover:rgb(255 255 255 / .06);
  --text-primary:#f5f6f8; --text-secondary:#b4bac6; --text-tertiary:#8b93a3;
  --border-subtle:rgb(255 255 255 / .08); --border-strong:rgb(255 255 255 / .16);
  --action-bg:var(--brand-500); --action-bg-hover:var(--brand-400); --action-bg-active:var(--brand-600);
  --link:var(--brand-400); --focus:var(--brand-400);
  --selected-bg:rgb(92 139 255 / .14); --selected-text:var(--brand-300);
  --scrim:rgb(0 0 0 / .6); --glass-bg:rgb(12 17 29 / .72);
}
```

## 5.2 `base.css` (reset + defaults)

```css
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:calc(var(--nav-h) + 16px)}
body{
  margin:0;background:var(--bg-canvas);color:var(--text-primary);
  font:400 var(--text-md)/1.6 var(--font-sans);
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
  text-rendering:optimizeLegibility;font-optical-sizing:auto;
}
h1,h2,h3,h4{margin:0;font-weight:600;text-wrap:balance;color:var(--text-primary)}
h1{font-size:var(--text-h1);line-height:1.15;letter-spacing:-.022em}
h2{font-size:var(--text-h2);line-height:1.2; letter-spacing:-.02em}
h3{font-size:var(--text-h3);line-height:1.3; letter-spacing:-.015em}
h4{font-size:var(--text-h4);line-height:1.4; letter-spacing:-.01em}
p{margin:0;text-wrap:pretty;max-width:var(--container-prose)}
a{color:var(--link);text-underline-offset:3px;text-decoration-thickness:1px}
img,svg,video{max-width:100%;display:block}
table{border-collapse:collapse;font-variant-numeric:tabular-nums}
:focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:4px}
::selection{background:var(--brand-200);color:var(--gray-900)}

.container{width:100%;max-width:var(--container-xl);margin-inline:auto;padding-inline:clamp(16px,4vw,32px)}
.section{padding-block:clamp(4rem,3rem + 5vw,8rem)}
.section--subtle{background:var(--bg-subtle)}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip-link{position:absolute;left:8px;top:-48px;background:var(--bg-surface);padding:8px 12px;border-radius:8px;z-index:700}
.skip-link:focus{top:8px}

@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;
    transition-duration:.01ms!important;scroll-behavior:auto!important}
}
```

## 5.3 Core component CSS

```css
/* ---------- Button ---------- */
.btn{
  --h:40px; --px:16px;
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  height:var(--h);padding-inline:var(--px);
  font:500 var(--text-sm)/1 var(--font-sans);white-space:nowrap;
  border:1px solid transparent;border-radius:var(--radius-md);
  cursor:pointer;text-decoration:none;
  transition:background-color var(--dur-fast) var(--ease-standard),
             border-color var(--dur-fast) var(--ease-standard),
             box-shadow var(--dur-fast) var(--ease-standard),
             transform var(--dur-instant) var(--ease-standard);
}
.btn:active{transform:scale(.98)}
.btn:focus-visible{outline:none;box-shadow:var(--ring-focus)}
.btn[disabled],.btn[aria-disabled="true"]{opacity:.5;cursor:not-allowed;transform:none;pointer-events:none}
.btn--sm{--h:32px;--px:12px;font-size:.8125rem}
.btn--lg{--h:48px;--px:24px;font-size:var(--text-md);border-radius:10px}
.btn--pill{border-radius:var(--radius-full)}

.btn--primary{background:var(--action-bg);color:var(--text-on-brand);box-shadow:var(--shadow-xs)}
.btn--primary:hover{background:var(--action-bg-hover)}
.btn--primary:active{background:var(--action-bg-active)}
.btn--secondary{background:var(--bg-surface);color:var(--text-primary);border-color:var(--border-strong);box-shadow:var(--shadow-xs)}
.btn--secondary:hover{background:var(--bg-hover)}
.btn--ghost{background:transparent;color:var(--text-primary)}
.btn--ghost:hover{background:var(--bg-hover)}
.btn--danger{background:var(--danger-600);color:#fff}
.btn--danger:hover{background:var(--danger-700)}

/* ---------- Card ---------- */
.card{
  background:var(--bg-surface);border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg);padding:var(--space-6);box-shadow:var(--shadow-xs);
}
.card--interactive{transition:transform var(--dur-base) var(--ease-standard),
  box-shadow var(--dur-base) var(--ease-standard),border-color var(--dur-base) var(--ease-standard)}
.card--interactive:hover{transform:translateY(-2px);box-shadow:var(--shadow-md);border-color:var(--border-strong)}
.card--tile{background:var(--bg-subtle);border-color:transparent;border-radius:var(--radius-2xl);box-shadow:none}

/* ---------- Input ---------- */
.field{display:grid;gap:6px}
.field__label{font:500 var(--text-sm)/1.4 var(--font-sans);color:var(--text-primary)}
.field__help{font-size:var(--text-xs);color:var(--text-tertiary)}
.field__error{font-size:var(--text-xs);color:var(--danger-700)}
.input{
  height:40px;width:100%;padding-inline:12px;
  font:400 var(--text-md)/1.4 var(--font-sans);color:var(--text-primary);
  background:var(--bg-surface);border:1px solid var(--border-strong);
  border-radius:var(--radius-md);box-shadow:var(--shadow-xs);
  transition:border-color var(--dur-fast),box-shadow var(--dur-fast);
}
.input::placeholder{color:var(--text-tertiary)}
.input:hover{border-color:var(--gray-400)}
.input:focus{outline:none;border-color:var(--focus);box-shadow:var(--ring-focus)}
.input[aria-invalid="true"]{border-color:var(--danger-500)}
.input[aria-invalid="true"]:focus{box-shadow:0 0 0 4px rgb(240 68 56 / .2)}
.input:disabled{background:var(--bg-subtle);color:var(--text-tertiary);box-shadow:none;cursor:not-allowed}

/* ---------- Badge ---------- */
.badge{display:inline-flex;align-items:center;gap:6px;height:24px;padding-inline:10px;
  border-radius:var(--radius-full);font:500 var(--text-xs)/1 var(--font-sans);
  background:var(--bg-hover);color:var(--text-secondary)}
.badge::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.badge--success{background:var(--success-50);color:var(--success-700)}
.badge--warning{background:var(--warning-50);color:var(--warning-700)}
.badge--danger{background:var(--danger-50);color:var(--danger-700)}
.badge--info{background:var(--brand-50);color:var(--brand-700)}

/* ---------- Glass nav ---------- */
.nav{
  position:sticky;top:0;z-index:200;height:var(--nav-h);
  display:flex;align-items:center;
  background:var(--bg-canvas); /* opaque fallback */
  border-bottom:1px solid transparent;
  transition:border-color var(--dur-base);
}
@supports (backdrop-filter:blur(1px)){
  .nav{background:var(--glass-bg);backdrop-filter:saturate(180%) blur(20px)}
}
.nav[data-scrolled="true"]{border-bottom-color:var(--border-subtle)}

/* ---------- Table ---------- */
.table{width:100%;font-size:var(--text-sm)}
.table th{position:sticky;top:0;background:var(--bg-subtle);text-align:left;
  font-weight:500;font-size:.8125rem;color:var(--text-secondary);
  padding:12px 16px;border-bottom:1px solid var(--border-subtle)}
.table td{height:48px;padding:0 16px;border-bottom:1px solid var(--border-subtle)}
.table tbody tr:hover{background:var(--bg-hover)}
.table tr[aria-selected="true"]{background:var(--selected-bg)}
.table .num{text-align:right;font-variant-numeric:tabular-nums}

/* ---------- Hero helpers ---------- */
.hero{padding-block:clamp(4rem,2rem + 8vw,10rem) clamp(4rem,2rem + 5vw,8rem);text-align:center}
.hero h1{font-size:var(--text-display-xl);line-height:1.05;letter-spacing:-.03em;max-width:18ch;margin-inline:auto}
.hero p{font-size:var(--text-lg);color:var(--text-secondary);max-width:60ch;margin:var(--space-5) auto 0}
.hero__cta{display:flex;gap:var(--space-4);justify-content:center;margin-top:var(--space-8);flex-wrap:wrap}
.hero__visual{margin-top:var(--space-16);border:1px solid var(--border-subtle);
  border-radius:var(--radius-xl);box-shadow:var(--shadow-float);overflow:hidden;aspect-ratio:16/10}
```

## 5.4 Tailwind config mapping (v3)

```js
// tailwind.config.js
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", md: "2rem" }, screens: { xl: "1200px" } },
    extend: {
      colors: {
        gray:  { 25:"#fcfcfd",50:"#f7f8fa",100:"#f0f2f5",200:"#e4e7ec",300:"#d0d5dd",400:"#98a2b3",
                 500:"#667085",600:"#475467",700:"#344054",800:"#1d2939",900:"#101828",950:"#0c111d" },
        brand: { 50:"#eef4ff",100:"#dbe7ff",200:"#bdd3ff",300:"#8fb4ff",400:"#5c8bff",
                 500:"#3b68f5",600:"#2a4fe0",700:"#233fb8",800:"#20388f",900:"#1f3372" },
        success:{ 50:"#ecfdf3",200:"#abefc6",500:"#12b76a",700:"#027a48" },
        warning:{ 50:"#fffaeb",200:"#fedf89",500:"#f79009",700:"#b54708" },
        danger: { 50:"#fef3f2",200:"#fecdca",500:"#f04438",600:"#d92d20",700:"#b42318" },
      },
      fontFamily: {
        sans:  ["Inter var","Inter","ui-sans-serif","system-ui","-apple-system","Segoe UI","Roboto","sans-serif"],
        serif: ["Newsreader","Georgia","serif"],
        mono:  ["JetBrains Mono","ui-monospace","SFMono-Regular","Menlo","monospace"],
      },
      fontSize: {
        xs:["0.75rem",{lineHeight:"1.4",letterSpacing:"0.01em"}],
        sm:["0.875rem",{lineHeight:"1.5"}],
        base:["1rem",{lineHeight:"1.6"}],
        lg:["1.125rem",{lineHeight:"1.6",letterSpacing:"-0.005em"}],
        xl:["1.25rem",{lineHeight:"1.4",letterSpacing:"-0.01em"}],
        "2xl":["1.5rem",{lineHeight:"1.3",letterSpacing:"-0.015em"}],
        "3xl":["2rem",{lineHeight:"1.2",letterSpacing:"-0.02em"}],
        "4xl":["2.5rem",{lineHeight:"1.15",letterSpacing:"-0.022em"}],
        "5xl":["3rem",{lineHeight:"1.08",letterSpacing:"-0.028em"}],
        "6xl":["3.75rem",{lineHeight:"1.05",letterSpacing:"-0.03em"}],
        "7xl":["4.5rem",{lineHeight:"1.02",letterSpacing:"-0.035em"}],
      },
      borderRadius: { xs:"4px", sm:"6px", md:"8px", lg:"12px", xl:"16px", "2xl":"24px" },
      boxShadow: {
        xs:"0 1px 2px rgb(16 24 40 / .05)",
        sm:"0 1px 3px rgb(16 24 40 / .08), 0 1px 2px rgb(16 24 40 / .04)",
        md:"0 4px 8px -2px rgb(16 24 40 / .08), 0 2px 4px -2px rgb(16 24 40 / .04)",
        lg:"0 12px 24px -4px rgb(16 24 40 / .10), 0 4px 8px -2px rgb(16 24 40 / .04)",
        xl:"0 24px 48px -12px rgb(16 24 40 / .18)",
        float:"0 50px 100px -20px rgb(42 79 224 / .18), 0 30px 60px -30px rgb(16 24 40 / .25)",
        focus:"0 0 0 4px rgb(59 104 245 / .24)",
      },
      transitionTimingFunction: {
        standard:"cubic-bezier(.2,0,0,1)", "out-expo":"cubic-bezier(.16,1,.3,1)", apple:"cubic-bezier(.28,.11,.32,1)",
      },
      transitionDuration: { fast:"150ms", base:"200ms", slow:"300ms" },
      maxWidth: { prose:"65ch" },
    },
  },
};
```

## 5.5 Implementation rules (non-negotiable)

1. **Tokens only.** No raw hex, px values off the scale, or ad-hoc shadows in component code. Lint with Stylelint (`declaration-property-value-disallowed-list`) or Tailwind's restricted config.
2. **Semantic tokens in components.** Components read `--text-primary`, `--bg-surface`, etc. — never `--gray-900` directly. This makes dark mode and re-branding a one-file change.
3. **Mobile-first CSS.** Base styles for small screens; enhance with `min-width` queries.
4. **Semantic HTML before ARIA.** Use ARIA only to fill gaps.
5. **Every component ships with states**: default, hover, focus-visible, active, disabled, loading, error (where relevant), plus light + dark.
6. **Never remove focus outlines** without a visible replacement.
7. **Document in Storybook** (or equivalent): props, states, a11y notes, do/don't. Run `axe` and visual-regression tests (Chromatic/Playwright) in CI.
8. **Avoid specificity wars.** Single-class selectors (BEM or utility); no `!important` except the reduced-motion reset.
9. **Layout via grid/flex + `gap`**, not margins on children; spacing between sections via section padding, not stacked margins.
10. **Images and media** always declare dimensions/`aspect-ratio`.
11. **Animation** only through tokens (`--dur-*`, `--ease-*`) and only on `transform`/`opacity`.
12. **One source of truth:** Figma variables ⇄ `tokens.css` (sync with Style Dictionary or Tokens Studio).
13. **Review gate:** no UI merges without passing the checklist below.

## 5.6 Figma setup (for the design team)

- **Variables:** Primitives → Semantic (Light/Dark modes) → Component. Mirror token names exactly.
- **Text styles:** one per row of §2.3.2 and §2.3.3.
- **Effect styles:** `shadow-xs … float`, `focus-ring`.
- **Grid styles:** 12-col @1200 (24 gutter), 8-col @768, 4-col @375.
- **Components:** Auto Layout everywhere; variants for state × size × type; a Figma component per entry in Part 3.
- **Naming:** `Component/Variant/State` (e.g., `Button/Primary/Hover`).

## 5.7 Pre-launch QA checklist

**Visual polish**
- [ ] Only tokens used; no off-scale spacing, radii, or colors
- [ ] One primary action per section; one focal point per viewport
- [ ] Type scale respected; headings tight-tracked; line length ≤ 75ch
- [ ] Numbers use tabular figures and right-align in tables
- [ ] Section rhythm uses alternating canvas/subtle bands, not divider lines
- [ ] At most one gradient hero treatment and one `shadow-float`
- [ ] Icons from a single family and stroke weight; optically centered
- [ ] Images crisp at 2×, consistent treatment, no layout shift

**Interaction**
- [ ] All interactive elements have hover, focus-visible, active, disabled states
- [ ] Loading, empty, error, and success states designed for every data view
- [ ] Transitions 150–300ms with token easing; hero reveal ≤ 700ms and runs once
- [ ] Destructive actions confirm; reversible actions offer undo

**Accessibility**
- [ ] Contrast verified (text 4.5:1, UI 3:1) in light **and** dark
- [ ] Full keyboard path; skip link; logical focus order; focus trapped in modals
- [ ] Headings in order; landmarks present; form labels and errors wired with ARIA
- [ ] `prefers-reduced-motion` and `prefers-color-scheme` respected
- [ ] Works at 200% zoom and 320px viewport

**Responsive & performance**
- [ ] Verified at 320 / 375 / 768 / 1024 / 1280 / 1536
- [ ] Tables and navigation have mobile treatments
- [ ] LCP < 2.5s · INP < 200ms · CLS < 0.1
- [ ] Fonts preloaded and subset; images AVIF/WebP with `srcset`

**Content**
- [ ] Sentence case, active verbs; consistent terminology across flows
- [ ] Error messages say what happened and how to fix it
- [ ] No filler eyebrows, buzzwords, or decorative meta strings

---

## 5.8 Quick-start recipe: from zero to premium in one hour

1. Import `tokens.css` + `base.css`; set `--brand-*` to your brand hue (keep the lightness steps).
2. Load Inter (variable), preload, apply `font-display: swap`.
3. Build the page in the §4.1 order using `.container`, `.section`, `.card`, `.btn`.
4. Give the hero real product UI inside `.hero__visual`.
5. Replace anything off-scale. Remove one decoration from every section.
6. Run the §5.7 checklist; fix contrast, focus, and states first.

> **The test of premium:** squint at the page. If there is one clear focal point, calm spacing, and consistent edges — and nothing you'd want to remove — it's done.

---

*Maintain this file as the living source of truth. Changes to tokens require a version bump (semver) and a changelog entry.*

**Version 1.0.0**
