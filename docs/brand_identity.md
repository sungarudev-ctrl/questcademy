# 🎨 ExamGPT — Brand Design System

A complete identity: name rationale, color psychology, type scale, motion, and cross-platform tokens. Designed for **trust** (education), **focus** (long study sessions), **energy** (motivation), and **clarity** (dense math content).

---

## 1. 🧠 Brand Foundations

### 1.1 Brand Personality

| Trait | What it means in UI |
|---|---|
| **Calm confidence** | Deep, low-saturation base — never loud |
| **Sharp intelligence** | High-contrast accents, mathematical precision |
| **Encouraging** | Warm secondary colors for streaks, wins |
| **Trustworthy** | Serious, restrained, non-gamified at core |
| **Modern learner** | Soft shadows, rounded corners, subtle motion |

### 1.2 Voice

- **Direct** — "Solve it." not "Let's solve it together!"
- **Encouraging, not patronizing** — "Almost. Here's why."
- **Precise** — Always correct LaTeX, always cited steps
- **Quietly ambitious** — "Your target: 1420. Current: 1420. ✅"

### 1.3 Name Rationale

**ExamGPT** — signals AI (GPT-family association) + exam focus. Clean, searchable, evocative. Companion brand mark: an **open bracket with a rising graph** (math + progress).

---

## 2. 🎨 Color System

### 2.1 Brand Palette (Core)

| Role | Name | Hex | Usage |
|---|---|---|---|
| **Primary** | Indigo 600 | `#4F46E5` | CTA, active nav, links |
| **Primary Hover** | Indigo 500 | `#6366F1` | Hover states |
| **Primary Deep** | Indigo 700 | `#4338CA` | Pressed, gradient ends |
| **Accent** | Violet 500 | `#8B5CF6` | Secondary CTAs, AI marks |
| **Accent Glow** | Violet 400 | `#A78BFA` | AI thinking, gradient head |

### 2.2 Semantic Palette

| Role | Name | Hex | Usage |
|---|---|---|---|
| **Success** | Emerald 500 | `#10B981` | Correct answers, mastery, streaks |
| **Warning** | Amber 500 | `#F59E0B` | Weak topics, hints |
| **Error** | Red 500 | `#EF4444` | Wrong answers, warnings |
| **Info** | Sky 500 | `#0EA5E9` | Tips, tooltips |

### 2.3 Subject Color Coding (identity system)

Each subject gets a signature accent — used for chips, headers, mastery rings.

| Subject | Hex | Name |
|---|---|---|
| Mathematics | `#4F46E5` | Indigo |
| Physics | `#8B5CF6` | Violet |
| Chemistry | `#10B981` | Emerald |
| Biology | `#22C55E` | Green |
| English | `#F59E0B` | Amber |
| Computer Science | `#0EA5E9` | Sky |

### 2.4 Neutral Scale (Dark-First)

Designed dark-first because students study at night. Light mode is available but secondary.

**Dark Mode (default):**

| Token | Hex | Usage |
|---|---|---|
| `bg-canvas` | `#0A0A0F` | Page background |
| `bg-surface` | `#0F0F18` | Cards, phone shell |
| `bg-elevated` | `#14141F` | Modals, dropdowns |
| `bg-hover` | `#1A1A24` | Hover, list rows |
| `bg-input` | `#1F1F2E` | Input fields |
| `border-subtle` | `#2A2A3A` | Dividers, card borders |
| `border-strong` | `#3F3F52` | Focus rings |
| `text-primary` | `#F8FAFC` | Body |
| `text-secondary` | `#CBD5E1` | Subheads |
| `text-muted` | `#94A3B8` | Captions |
| `text-disabled` | `#64748B` | Disabled |

**Light Mode:**

| Token | Hex |
|---|---|
| `bg-canvas` | `#FFFFFF` |
| `bg-surface` | `#F8FAFC` |
| `bg-elevated` | `#FFFFFF` |
| `border-subtle` | `#E2E8F0` |
| `text-primary` | `#0F172A` |
| `text-secondary` | `#334155` |
| `text-muted` | `#64748B` |

### 2.5 Signature Gradients

```css
/* Primary CTA gradient */
--grad-primary: linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%);

/* AI thinking / glow */
--grad-ai: linear-gradient(135deg, #6366F1 0%, #A78BFA 100%);

/* Streak / heat */
--grad-streak: linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);

/* Mastery ring (conic) */
--grad-mastery: conic-gradient(#10B981 0% 80%, #1F1F2E 80% 100%);
```

### 2.6 Accessibility (WCAG AA minimum)

| Pair | Contrast | Result |
|---|---|---|
| `#F8FAFC` on `#0A0A0F` | 18.9:1 | ✅ AAA |
| `#94A3B8` on `#0A0A0F` | 8.6:1 | ✅ AAA |
| `#FFFFFF` on `#4F46E5` | 7.4:1 | ✅ AA+ |
| `#FFFFFF` on `#8B5CF6` | 4.9:1 | ✅ AA |
| Success `#10B981` on `#0A0A0F` | 7.1:1 | ✅ AAA |

**Rule:** never use color alone to convey meaning — always pair with icon or text.

---

## 3. ✍️ Typography

### 3.1 Font Stack

| Role | Family | Source |
|---|---|---|
| **UI / Body** | Inter | Google Fonts / variable |
| **Display / Headlines** | Inter Display | Google Fonts |
| **Math / LaTeX** | KaTeX_Main (bundled) | KaTeX |
| **Code / Mono** | JetBrains Mono | Google Fonts |
| **Fallback** | system-ui, -apple-system, Segoe UI, Roboto | OS |

**Why Inter:** neutral, highly legible at small sizes, excellent numerals, free, variable. Pairs cleanly with KaTeX.

### 3.2 Type Scale

Modular scale, ratio **1.25** (major third), base **16px**.

| Token | Size | Line | Weight | Usage |
|---|---|---|---|---|
| `display-2xl` | 60px | 68px | 800 | Landing hero |
| `display-xl` | 48px | 56px | 800 | Marketing H1 |
| `display-lg` | 40px | 48px | 700 | App section hero |
| `heading-xl` | 32px | 40px | 700 | Page titles |
| `heading-lg` | 24px | 32px | 700 | Screen titles |
| `heading-md` | 20px | 28px | 600 | Card titles |
| `heading-sm` | 18px | 26px | 600 | Subheads |
| `body-lg` | 17px | 26px | 400 | Lesson body |
| `body-md` | 15px | 24px | 400 | Default UI |
| `body-sm` | 13px | 20px | 400 | Captions |
| `label-md` | 14px | 20px | 500 | Buttons, chips |
| `label-sm` | 12px | 16px | 600 | Tags (uppercase, tracking) |
| `mono-md` | 14px | 22px | 400 | Formulas, code |

### 3.3 Letter Spacing

| Context | Tracking |
|---|---|
| Display | `-0.02em` |
| Headings | `-0.01em` |
| Body | `0` |
| Uppercase labels | `0.06em` |
| Mono | `0` |

### 3.4 Number Rules

- **Tabular numerals** everywhere data appears (`font-feature-settings: "tnum"`).
- Timer, scores, stats must never jitter.
- Fractions in KaTeX, never in body text.

---

## 4. 📏 Spacing, Radius, Elevation

### 4.1 Spacing (8pt grid)

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`

Tailwind scale aligns: `p-1 = 4px`, `p-4 = 16px`, etc.

### 4.2 Radius

| Token | Value | Usage |
|---|---|---|
| `radius-xs` | 4px | Chips |
| `radius-sm` | 8px | Buttons (small), inputs |
| `radius-md` | 12px | Cards, buttons (default) |
| `radius-lg` | 16px | Panels, modals |
| `radius-xl` | 24px | Hero cards |
| `radius-full` | 9999px | Pills, avatars |

### 4.3 Elevation (soft shadows, dark-mode tuned)

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.35);
--shadow-md: 0 4px 12px rgba(0,0,0,0.40);
--shadow-lg: 0 12px 32px rgba(0,0,0,0.55);
--shadow-glow-primary: 0 0 24px rgba(99,102,241,0.45);
--shadow-glow-success: 0 0 20px rgba(16,185,129,0.35);
```

---

## 5. 🧩 Component Tokens

### 5.1 Buttons

| Variant | BG | Text | Border | Hover |
|---|---|---|---|---|
| **Primary** | `--grad-primary` | white | none | brightness 1.05 |
| **Secondary** | transparent | `#A78BFA` | `#4F46E5` 1px | bg `#4F46E5`/10 |
| **Ghost** | transparent | `#CBD5E1` | none | bg `#1A1A24` |
| **Danger** | `#EF4444` | white | none | `#DC2626` |

Sizes: `sm` (32px) · `md` (40px) · `lg` (48px). Radius `md`.

### 5.2 Chips / Tags

- Pill shape, `label-sm`, subject-tinted at 15% alpha bg + 30% border.
- Example: Physics chip = `bg-violet-500/15 border-violet-500/30 text-violet-300`.

### 5.3 Cards

- `bg-surface`, `border-subtle`, `radius-md`, `shadow-sm`.
- Interactive cards lift on hover: `shadow-md`, border → `border-strong`.

### 5.4 Inputs

- `bg-input`, `border-subtle`, `radius-md`, `body-md`.
- Focus: 2px ring `#6366F1` at 40% alpha + border → `#6366F1`.
- Error: border `#EF4444`, helper text red below.

### 5.5 Mastery Indicator

- **Ring** (conic gradient) for lesson-level.
- **Bar** (segmented) for concept-level.
- **Heatmap** (5-step intensity) for topic grids.

Color map: `0–25%` red · `25–50%` amber · `50–75%` indigo · `75–90%` emerald · `90–100%` emerald + glow.

---

## 6. 🎞️ Motion System

### 6.1 Timing

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `instant` | 100ms | linear | Hover, ripple |
| `fast` | 180ms | `cubic-bezier(.2,.8,.2,1)` | Buttons, chips |
| `base` | 240ms | `cubic-bezier(.2,.8,.2,1)` | Screen transitions |
| `slow` | 400ms | `cubic-bezier(.4,0,.2,1)` | Modals, drawers |
| `celebrate` | 800ms | spring | Correct answer, streak |

### 6.2 Signature Animations

- **AI thinking**: pulsing gradient dot + shimmer on text placeholder.
- **Correct answer**: checkmark draw + subtle scale (1 → 1.04 → 1) + emerald glow.
- **Wrong answer**: gentle shake (±4px, 3 cycles) + red flash on border.
- **Streak milestone**: confetti burst (respects `prefers-reduced-motion`).
- **Lesson complete**: mastery ring fills + soft chime.

### 6.3 Reduced Motion

All non-essential motion disabled when `prefers-reduced-motion: reduce`. Crossfades become instant. Celebrations become static badges.

---

## 7. 🖼️ Iconography & Illustration

- **Icons:** Lucide (2px stroke, 24px grid) — consistent, open-source.
- **Illustrations:** geometric, low-detail, 2 colors max (primary + accent), no faces.
- **Empty states:** line-art with one accent hue — never full-color cartoons.
- **Avatars:** initials on gradient — no default "person" silhouettes.

---

## 8. 📐 Grid & Layout

| Breakpoint | Width | Columns | Gutter |
|---|---|---|---|
| `sm` | <640 | 4 | 16px |
| `md` | 640–1024 | 8 | 20px |
| `lg` | 1024–1440 | 12 | 24px |
| `xl` | >1440 | 12 | 32px |

**Content max-width:** `720px` for reading (lessons), `1200px` for dashboards.

**Mobile lesson reader:** single column, generous line-height (1.65), 20px side padding.

---

## 9. 🔤 Logo & Wordmark

### 9.1 Wordmark

- "ExamGPT" set in **Inter Display, weight 800**, letter-spacing `-0.02em`.
- The "GPT" always in gradient: Indigo → Violet.
- Minimum size: 20px tall. Clear space: 1× cap height on all sides.

### 9.2 Symbol

- **Mark:** stylized open bracket `{` merged with an upward graph line.
- Rendered on `--grad-primary`, `radius-md`.
- Works at 16px (favicon) and 512px (app icon).

### 9.3 Logo Variants

| Variant | Usage |
|---|---|
| Full (mark + wordmark) | Marketing, splash |
| Mark only | App icon, favicon, chat avatar |
| Mono white | Dark surfaces |
| Mono black | Light surfaces |

---

## 10. 🌐 Cross-Platform Token Delivery

Single source of truth — generated, not hand-copied.

### 10.1 `shared/design/tokens.json`

```json
{
  "color": {
    "primary": { "600": "#4F46E5", "500": "#6366F1", "700": "#4338CA" },
    "accent":  { "500": "#8B5CF6", "400": "#A78BFA" },
    "success": "#10B981",
    "warning": "#F59E0B",
    "error":   "#EF4444",
    "bg": {
      "canvas":   "#0A0A0F",
      "surface":  "#0F0F18",
      "elevated": "#14141F",
      "hover":    "#1A1A24",
      "input":    "#1F1F2E"
    },
    "text": {
      "primary":   "#F8FAFC",
      "secondary": "#CBD5E1",
      "muted":     "#94A3B8",
      "disabled":  "#64748B"
    }
  },
  "radius": { "sm": 8, "md": 12, "lg": 16, "xl": 24, "full": 9999 },
  "space":  [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96],
  "font": {
    "family": { "ui": "Inter", "mono": "JetBrains Mono", "math": "KaTeX_Main" },
    "size": {
      "display-xl": 48, "heading-lg": 24, "heading-md": 20,
      "body-lg": 17, "body-md": 15, "body-sm": 13, "label-sm": 12
    }
  },
  "shadow": {
    "sm": "0 1px 2px rgba(0,0,0,0.35)",
    "md": "0 4px 12px rgba(0,0,0,0.40)",
    "lg": "0 12px 32px rgba(0,0,0,0.55)"
  }
}
```

### 10.2 Generate to each platform

**Web (Tailwind):** `tailwind.config.ts` reads tokens via a small Node script → produces `theme.extend`.

**Flutter:** `dart run design_tokens` → outputs `lib/core/theme.dart` with `Color`, `TextStyle`, `EdgeInsets` constants.

**Python (backend emails, PDFs):** Jinja templates reference the same JSON.

**Figma:** pull tokens via Tokens Studio → single source.

### 10.3 Example: `web/tailwind.config.ts`

```ts
import tokens from "../shared/design/tokens.json";

export default {
  theme: {
    extend: {
      colors: {
        primary: tokens.color.primary,
        accent:  tokens.color.accent,
        success: tokens.color.success,
        bg:      tokens.color.bg,
        text:    tokens.color.text,
      },
      borderRadius: {
        sm: tokens.radius.sm + "px",
        md: tokens.radius.md + "px",
        lg: tokens.radius.lg + "px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
};
```

### 10.4 Example: `mobile/lib/core/theme.dart` (generated)

```dart
import 'package:flutter/material.dart';

class AppColors {
  static const primary600 = Color(0xFF4F46E5);
  static const accent500  = Color(0xFF8B5CF6);
  static const success    = Color(0xFF10B981);
  static const bgCanvas   = Color(0xFF0A0A0F);
  static const bgSurface  = Color(0xFF0F0F18);
  static const textPrimary   = Color(0xFFF8FAFC);
  static const textSecondary = Color(0xFFCBD5E1);
}

class AppRadius {
  static const sm = 8.0;
  static const md = 12.0;
  static const lg = 16.0;
  static const xl = 24.0;
}

class AppText {
  static const headingLg = TextStyle(
    fontFamily: 'Inter', fontSize: 24, height: 32/24,
    fontWeight: FontWeight.w700, color: AppColors.textPrimary,
  );
  static const bodyMd = TextStyle(
    fontFamily: 'Inter', fontSize: 15, height: 24/15,
    color: AppColors.textPrimary,
  );
}
```

---

## 11. 🎯 Do's & Don'ts

### Do
- Use **subject color** to orient, not to decorate.
- Keep lesson body **17px / 1.65** line height — long-form reading matters.
- Reserve **gradient** for primary CTA + AI marks only.
- Pair every color state with an icon or label.
- Bump KaTeX color slightly warmer than body (`#C7D2FE` on dark) — it reads better.

### Don't
- Don't use pure black `#000` or pure white `#FFF` — use `#0A0A0F` and `#F8FAFC`.
- Don't animate more than two things at once.
- Don't gamify with pop colors — this is prep, not a game.
- Don't mix more than one accent subject color in a single card.
- Don't put serif fonts anywhere — inconsistent with brand.

---

## 12. 📦 Brand Assets Checklist

- [ ] `logo-full.svg`, `logo-mark.svg`, mono variants
- [ ] App icon: 1024, 512, 256, 192, 180, 152, 120, 76 (iOS), adaptive (Android)
- [ ] Favicon: `.ico`, `16`, `32`, `apple-touch-icon`
- [ ] OG image template (1200×630) — reusable with title slot
- [ ] Splash screen: dark canvas + mark + tagline
- [ ] Social kit: Twitter, LinkedIn, YouTube banners
- [ ] Email template: header + footer with tokens applied
- [ ] Fonts: Inter variable (woff2), JetBrains Mono, KaTeX bundle
- [ ] Design tokens JSON + generators (Tailwind + Dart + Python)
- [ ] Figma library published + shared
