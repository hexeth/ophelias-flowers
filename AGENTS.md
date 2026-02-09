# AGENTS.md — Ophelia's Flowers

## Project Overview

**Ophelia's Flowers** is a micro-scale ecommerce storefront selling dahlia tubers to local hobbyists and gardeners. The site is seasonal by nature — dahlias are ordered in late winter/spring for spring planting. The product catalog is small (tens of varieties, not thousands) and changes infrequently.

The goal is a **high-performance, lightweight** storefront — fast to load, simple to maintain, and cheap to operate.

---

## Architecture

### Tech Stack

| Layer      | Technology                                     |
| ---------- | ---------------------------------------------- |
| Framework  | Astro (SSG + SSR)                              |
| Language   | TypeScript (strict mode)                       |
| Styling    | Tailwind CSS                                   |
| Typography | Playfair Display (Google Fonts, headings only) |
| Deployment | Cloudflare Pages (with CI/CD pipeline)         |
| Testing    | Vitest (unit), Playwright (e2e)                |
| Images     | Astro `<Image>` / `<Picture>` + sharp          |

### No Client Framework

There is no React, Vue, Svelte, or other UI framework. Interactive elements use:

- Native HTML elements (`<dialog>`, `<details>`, `<form>`)
- Vanilla JS via Astro `<script>` tags (scoped, minimal)
- Semantic HTML + ARIA attributes for accessibility

This is a deliberate constraint. The interactive surface (cart drawer, quantity inputs, checkout form) does not justify a framework dependency.

### SSG / SSR Split

| Concern                    | Rendering | Why                                                    |
| -------------------------- | --------- | ------------------------------------------------------ |
| Product catalog pages      | SSG       | Small, slowly-changing catalog. Rebuild on push.       |
| Static pages (about, etc.) | SSG       | No dynamic content.                                    |
| Cart mutations             | SSR       | Astro Actions. Server-side, no client JS needed.       |
| Pre-order submission       | SSR       | Astro Actions. Validates and sends email notification. |

### Deployment Model

Cloudflare Pages with CI/CD. A push to the main branch triggers a rebuild and deploy. Product catalog changes (Markdown updates, stock status changes) follow this same path — edit, commit, deploy.

---

## Design Direction

**Elegant Brutalist.** The tension between refinement and rawness defines the aesthetic — a refined serif typeface set against an undecorated, structurally honest grid. The photography provides warmth and richness; the UI provides restraint and clarity.

### Core Principles

- **Minimal UI chrome.** No rounded corners, drop shadows, or gradient fills. Borders are structural, not decorative.
- **Raw, exposed structure.** The grid and layout are visible and intentional. The design looks like it was built, not decorated.
- **Generous whitespace.** Content breathes. Dense layouts are avoided. Whitespace is a first-class design element, not leftover space.
- **No gratuitous animation.** Motion is functional only (cart feedback, page transitions). No hover effects beyond color shifts. No parallax, scroll-triggered transitions, or decorative animation.

### Typography

Typography is the primary design lever — it carries the entire aesthetic when photography isn't present.

- **Heading typeface:** Load a single refined serif — **Playfair Display** (Google Fonts). Used for `h1`, `h2`, and display text. The contrast of a high-stroke-contrast serif against the raw grid _is_ the brutalist tension.
- **Body typeface:** System font stack (`system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`). Clean, invisible, fast.
- **Scale:** Use an extreme contrast ratio between heading and body sizes:
  - `h1`: `text-6xl` on mobile, `text-7xl` on `sm`, `text-8xl` on `lg`. Negative letter-spacing (`tracking-tighter`).
  - `h2`: `text-3xl` on mobile, `text-4xl` on `lg`.
  - `h3`: `text-xl`, semibold, sans-serif.
  - Body: `text-base`, `leading-relaxed`.
- **Uppercase accents:** Category labels, stock status, navigation links, and button text use `text-xs uppercase tracking-widest` sans-serif. This creates a second rhythm against the serif headings.

### Color Palette

A warm, restrained palette. The flowers provide color; the UI provides a quiet stage.

| Token          | Value     | Usage                                                                     |
| -------------- | --------- | ------------------------------------------------------------------------- |
| `cream`        | `#faf8f5` | Page background. Warm, not clinical white.                                |
| `ink`          | `#1a1a1a` | Primary text, borders, buttons. Softer than pure black.                   |
| `stone-500`    | `#78716c` | Secondary text, captions, muted UI.                                       |
| `stone-300`    | `#d6d3d1` | Dividers, disabled states, table borders.                                 |
| `dahlia-wine`  | `#722f37` | Primary accent. Low-stock warnings, required field markers, error states. |
| `dahlia-blush` | `#d4a0a0` | Soft accent. Hover tints, subtle highlights.                              |
| `botanical`    | `#4a6741` | "In Stock" and success states. Grounded, natural green.                   |
| `white`        | `#ffffff` | Card insets, input backgrounds, inverted button text.                     |

All color combinations must meet WCAG AA contrast ratios. Test `ink` on `cream`, `stone-500` on `cream`, `dahlia-wine` on `cream`, and `botanical` on `cream` before use.

### Layout & Spacing

#### Responsive Spacing Scale

Padding and margins shift across breakpoints to respect screen real estate:

| Context              | Mobile (`< sm`) | Tablet (`sm`–`lg`) | Desktop (`lg`+)    |
| -------------------- | --------------- | ------------------ | ------------------ |
| Page horizontal pad  | `px-4`          | `px-8`             | `px-12` or `px-16` |
| Section vertical pad | `py-10`         | `py-14`            | `py-20`            |
| Component gaps       | `gap-4`         | `gap-6`            | `gap-8`            |

Do **not** use a single fixed padding value (e.g., `px-6 py-12`) across all viewports.

#### Grid Patterns

- **Product listing grid:** `grid-cols-1` on mobile, `sm:grid-cols-2`, `lg:grid-cols-3`. Simple, predictable.
- **Homepage featured section:** Asymmetric layout — one featured variety at `col-span-2` (2/3 width) with two smaller cards stacked alongside. This creates visual hierarchy without decoration.
- **Product detail page:** Two-column layout on desktop (`lg:grid-cols-2`), single column stacked on mobile. Image column first.
- **Max content width:** Prose and form content cap at `max-w-2xl`. Product grids cap at `max-w-6xl`. Full-bleed sections (hero, feature banners) have no max-width.

### Page-Specific Design Guidance

#### Homepage

The homepage is **editorial, not transactional**. It should feel like the cover of a plant catalog, not a product listing.

- **Hero section:** Full-bleed hero image of a single standout dahlia bloom. Text overlaid on a semi-transparent dark gradient at the bottom — large serif heading, one line of subtext, and a CTA button. The image should dominate the viewport above the fold.
- **Featured varieties:** Below the hero. Asymmetric grid (one large, two small) rather than a uniform 3-column grid.
- **Seasonal awareness:** Include a short seasonal message. The site sells a seasonal product — it should acknowledge the current growing cycle. Example: "Pre-orders open for spring 2026 planting."

#### Product Detail Page

- Image fills its grid column fully, bordered. Consider a portrait aspect ratio for the detail image (`3/4` or `2/3`) since dahlia blooms are roughly circular and benefit from vertical framing.
- Description text (`<Content />`) should render in a `prose` block with adequate typographic styling.

#### Cart & Checkout

- Keep functional and clean. These pages exist to complete a task, not to impress.
- Use the `fieldset` / `legend` pattern for form grouping — it's semantic and visually distinctive in the brutalist style.
- Buttons: Primary actions use filled `ink`-background buttons. Secondary actions use outlined `ink`-border buttons.

### Component Design Tokens

| Element                 | Specification                                                                    |
| ----------------------- | -------------------------------------------------------------------------------- |
| **Buttons (primary)**   | `bg-ink text-white border border-ink`, uppercase, `tracking-widest`, `text-sm`   |
| **Buttons (secondary)** | `bg-transparent text-ink border border-ink`, same type treatment                 |
| **Buttons (disabled)**  | `border-stone-300 text-stone-300`, `cursor-not-allowed`                          |
| **Input fields**        | `border border-ink bg-white`, `px-4 py-3`, `focus:ring-2 focus:ring-ink`         |
| **Cards**               | `border border-ink`, no rounding, no shadow. Image top, content bottom.          |
| **Dividers**            | `border-t border-ink` for major sections. `border-t border-stone-300` for minor. |
| **Stock: available**    | `text-botanical`, uppercase, `text-xs tracking-wider`                            |
| **Stock: low**          | `text-dahlia-wine`, uppercase, `text-xs tracking-wider`                          |
| **Stock: sold-out**     | `text-stone-300 line-through`, uppercase, `text-xs tracking-wider`               |

### Interaction & Motion

- **Hover states:** Color transitions only (`transition-colors`). Buttons invert fill on hover. Links shift color. No scale, transform, or opacity transitions.
- **Cart feedback:** When an item is added, briefly pulse the cart icon badge (a single CSS scale animation, `150ms ease-out`). The button text changes to "Added" for `1.2s` with `disabled` state.
- **Page transitions:** Use Astro View Transitions API with a simple crossfade (`200ms`). No slide or morph transitions.
- **Focus indicators:** Visible `ring-2 ring-ink ring-offset-2` on all interactive elements. Never suppress the focus ring.

### Footer

The footer is not throwaway space. For a small nursery, it builds trust and connection.

- **Required content:** Copyright, tagline, contact email, and physical growing region/location.
- **Optional content:** Social media links (icon-only, monochrome), newsletter signup (single email input + submit), link to About page.
- **Layout:** Two or three columns on desktop, stacked on mobile. Same `border-t border-ink` top border. Background matches page `cream`.

---

## Data Model

### Product Catalog — Astro Content Collections

Products are stored as **Markdown files** in the repository, managed via Astro Content Collections with Zod-typed frontmatter schemas. There is no database or CMS.

#### Variety Schema (frontmatter)

```yaml
---
name: "Café au Lait"
slug: "cafe-au-lait"
sku: "DAH-CAL-001"
price: 8.50
stock: "available" # available | low | sold-out
category: "dinnerplate" # dinnerplate | ball | pompon | cactus | etc.
color: ["blush", "cream"]
bloomSize: "8-10 inches"
height: "3-4 feet"
image: "./cafe-au-lait.jpg"
---
A classic dinnerplate dahlia with enormous creamy blush blooms...
```

- **`stock`** is manually managed. Update the frontmatter, push, and the site rebuilds with the correct label.
- **`price`** is in USD, stored as a number (not a string).
- **`sku`** follows a consistent pattern: `DAH-{ABBREV}-{SEQ}`.
- The Markdown body is the product description, rendered on the product detail page.

### Commerce Entities

Use **industry-standard terminology** throughout the codebase:

| Term            | Meaning                                                         |
| --------------- | --------------------------------------------------------------- |
| **Variety**     | A dahlia variety (the product). Corresponds to a Markdown file. |
| **SKU**         | Stock Keeping Unit. Unique identifier for a purchasable item.   |
| **Line Item**   | A SKU + quantity in a cart or order.                            |
| **Cart**        | A collection of Line Items before checkout.                     |
| **Order**       | A finalized cart with payment and fulfillment details.          |
| **Stock-out**   | A variety with `stock: "sold-out"`. Cannot be added to cart.    |
| **Fulfillment** | The shipping/delivery of an order.                              |

Do **not** invent proprietary abstractions. If there is a standard commerce term for it, use it.

---

## Commerce Logic

### Lean-First Approach

The commerce layer is intentionally minimal:

1. **Cart** — Client-side state (localStorage). No server-side cart persistence for v1.
2. **Pre-Order Submission** — An Astro Action receives the cart contents and customer details, validates them, and sends an email notification to the shop owner.
3. **Email Notification** — The order details are sent via an email provider (e.g., Resend). No payment is collected at submission time.
4. **Order Confirmation** — The customer sees a confirmation page after successful submission. The shop owner follows up manually to arrange payment and fulfillment.

This is a **pre-order model**: customers express intent to purchase, and the shop owner handles payment and logistics offline. This fits the small-batch, seasonal nature of the business.

### Vendor-Agnostic Design

Business logic must be **decoupled from external service providers**. Concretely:

- Define an `EmailProvider` interface (TypeScript) for sending order notification emails.
- The initial implementation targets Resend (simple fetch-based, no SDK), but the interface boundary allows future migration.
- A `PaymentProvider` interface is defined for future use when online payment is needed. It is not active in v1.
- Provider details (API keys, secrets) live in environment variables, never in source code.
- No provider SDK types should leak into domain types. Map to/from domain types at the adapter boundary.

---

## Image Strategy

Dahlia photography is the primary visual asset and the sole source of color and emotion on the site. Images must be treated as first-class design elements, not afterthoughts.

### Optimization

- Use Astro's `<Picture>` component (not `<Image>`) for all product images to serve multiple formats.
- Output formats: **AVIF** (primary), **WebP** (fallback), **JPEG** (legacy fallback).
- Generate responsive `srcset` with breakpoints at `400w`, `600w`, `800w`, `1200w`.
- Lazy-load all images below the fold. Hero images and above-the-fold content use `loading="eager"`.
- Store source images at high resolution (minimum 1600px on the long edge) in the repository. The build pipeline handles all optimization.

### Aspect Ratios & Framing

| Context             | Aspect Ratio | Rationale                                                                                                                                            |
| ------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variety card (grid) | `3/4`        | Portrait orientation. Dahlia blooms are roughly circular — vertical framing gives breathing room above and below the bloom and feels more editorial. |
| Product detail page | `3/4`        | Consistent with cards. Large, generous, fills its column.                                                                                            |
| Homepage hero       | `16/9`       | Landscape, full-bleed. Cinematic framing for a single hero bloom.                                                                                    |

### Alt Text

Every product image must have a descriptive `alt` attribute following the pattern: `"{Variety name} dahlia bloom"` — e.g., `"Café au Lait dahlia bloom"`. Decorative images (backgrounds, dividers) use `alt=""`.

---

## Quality & Accessibility

### Accessibility

**WCAG 2.1 AA compliance is the baseline.** This means:

- Semantic HTML elements used correctly (`<nav>`, `<main>`, `<article>`, `<button>`, `<label>`, etc.).
- All interactive elements are keyboard-navigable.
- Focus management is handled for dynamic UI (e.g., cart drawer traps focus when open).
- Color contrast meets AA ratios (4.5:1 for normal text, 3:1 for large text).
- All images have meaningful `alt` text.
- Forms have associated labels and error messages are announced to screen readers.

No component library is used. Accessibility is achieved through correct HTML and ARIA attributes, tested manually and in CI.

### Testing

| Type | Tool                  | Scope                                                                         |
| ---- | --------------------- | ----------------------------------------------------------------------------- |
| Unit | Vitest                | Commerce logic, cart calculations, price formatting, payment adapter mapping. |
| E2E  | Playwright            | Checkout flow smoke tests, add-to-cart, stock-out states.                     |
| A11y | Playwright + axe-core | Automated accessibility checks in CI.                                         |

Tests run in CI on every pull request. The main branch must always be green.

---

## Conventions

### File Structure (planned)

```
src/
  actions/          # Astro Actions (cart, checkout)
  components/       # Astro components (.astro)
  content/
    varieties/      # Markdown files for each dahlia variety
  layouts/          # Page layouts
  lib/              # Shared utilities, types, commerce logic
    commerce/       # Cart, line item, pricing logic
    email/          # Email provider interface + adapter (order notifications)
    payment/        # Payment provider interface + adapter (future use)
  pages/            # Astro pages (file-based routing)
  styles/           # Global styles, Tailwind config
public/
  images/           # Optimized source images
```

### Naming

- **Files**: `kebab-case` for all files and directories.
- **Types/Interfaces**: `PascalCase` (e.g., `LineItem`, `PaymentProvider`).
- **Functions/variables**: `camelCase`.
- **Constants**: `SCREAMING_SNAKE_CASE` for true constants, `camelCase` for derived values.
- **CSS**: Tailwind utility classes. No custom CSS unless Tailwind cannot express the style. No CSS-in-JS.

### Code Style

- TypeScript **strict mode** enabled. No `any` types without explicit justification.
- Prefer named exports over default exports.
- Keep components small. A component that exceeds ~100 lines likely needs decomposition.
- No unused imports, variables, or dead code. Configure linting to enforce this.

### Git

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `style:`, `test:`, `refactor:`.
- Main branch is protected. All changes via pull request.
- Keep commits atomic — one logical change per commit.

---

## Out of Scope (v1)

The following are explicitly deferred:

- **Online payment processing** — The `PaymentProvider` interface exists for future use, but v1 uses email-based pre-orders with offline payment.
- **Blog / content marketing** — Not needed for initial launch.
- **User accounts / authentication** — Checkout is guest-only.
- **Server-side cart persistence** — Cart lives client-side.
- **Advanced inventory management** — Stock is a manual frontmatter field, not a real-time decrement system.
- **Multi-currency / i18n** — USD only, English only.
- **Search** — Catalog is small enough to browse. Filter by category/color is sufficient.
