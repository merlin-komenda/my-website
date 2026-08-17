# Redesign assessment — `redesign/evolt-devices`

Written before implementation. Covers CSS duplication across the five pages, where each of the six spec'd changes has to repeat, and anything in the repo that conflicts with the spec.

## 1. CSS duplication across the five pages

There is no shared stylesheet — every page (`/index.html`, `/experience/index.html`, `/how-i-work/index.html`, `/givebutter/index.html`, `/propel26/index.html`) ships a full, independent `<style>` block. The following rule groups are duplicated near-verbatim (formatting differs slightly page to page, but the declarations match) across **all five**:

- `:root` custom properties (`--bg`, `--text`, `--muted`, `--muted2`, `--line`, `--terracotta`, `--max`, `--font-serif`, `--font-sans`) — givebutter and propel26 drop `--sage`/`--bg-work` since they don't need them; propel26 adds a one-off `--bg-alt`.
- Reset (`*, *::before, *::after`, `html, body`, `body`, `a`, `.wrap`)
- Nav: `.nav`, `.nav-inner`, `.nav-brand`, `.nav-links`, `.nav-cta`, `.nav-menu-btn`, `.nav-mobile`, mobile breakpoint — identical on all five, including the mobile-menu JS block at the bottom of every file.
- Footer: `footer`, `.footer-inner`, `.footer-copy`, `.footer-links` — identical on all five.
- Chat widget: `#cpBtn` through `.cp-footer-l`, plus the whole `Ask Merlin` widget markup and its IIFE script — identical on all five (givebutter is the one page that omits the widget entirely).

Section-level "label" styling is duplicated with different names but the same declarations: `.section-label` (index, how-i-work), `.page-header-label` (experience, how-i-work, givebutter, propel26), `.case-tag`/`.work-tag` (index, how-i-work), `.resource-label`/`.card-eyebrow` (propel26) — all are `font-size:11px; font-weight:600; letter-spacing:1.2–2px; text-transform:uppercase; color:var(--muted2)`.

None of this is being consolidated into a shared file in this pass — the brief scopes this as a per-page structural change, and pulling five independent `<style>` blocks into one shared stylesheet would be a build-system change beyond what's asked. Each change below is applied inline in each page's existing `<style>` block, same as the current duplication pattern.

## 2. Where each change has to repeat

1. **Slash eyebrow** — one `.eyebrow` class definition, added to the `:root`-adjacent rules in all five `<style>` blocks (5 places). Applied to the existing label elements: `.section-label`/`.page-header-label` on every page (7 usage sites: index ×2, experience ×1, how-i-work ×2, givebutter ×1, propel26 ×2 resource labels), plus the homepage `.hero-eyebrow`. `--font-mono` also needs adding to all five `:root` blocks.
2. **Column framing** — two fixed-position rule elements (`.col-rule-l`, `.col-rule-r`) inserted right after `<body>` on all five pages (5 markup insertions), plus one shared CSS rule definition repeated in each `<style>` block.
3. **Section rules** (`.rule-major`) — mostly redundant with the existing `border-bottom: 1px solid var(--line)` already on `.section`/`section` on every page (that value is already `rgba(22,20,16,.1)`, no dashes/texture). The reusable class still needs defining in all five `<style>` blocks for the few places using a bare `<hr>` (propel26's `hr.soft`) or that need an explicit rule where none exists today.
4. **Tagline treatment** — index's `.hero-tagline` and givebutter's `.subhead` already match the spec (serif, italic, sentence case, `strong` preserved, positioned under the H1). Experience's `.sub` and propel26's `.sub` are currently sans-serif body copy and need restyling to the same treatment (2 places). How-i-work's page header has no tagline/sub element at all — nothing to touch there, since no copy is being added.
5. **Nav CTA pill** — `.nav-cta` text/href change repeats twice per page (desktop `.nav-links` + `.nav-mobile`) × 5 pages = 10 edits, plus the homepage hero CTA pair (2 new elements, index only).
6. **Work hierarchy** — index.html only, inside `.work-grid`.

## 3. Conflicts with the spec

- **No existing "Google Calendar popup handler."** The only Calendar integration anywhere in the repo is a plain `<a href="https://calendar.app.google/qd66qHTzCbsaNUEa7" target="_blank" rel="noopener">` link on `/givebutter/`. There is no JS popup/modal handler in `context.js`, `mk-logo.js`, or inline scripts — grepped for `calendar|popup|gcal`, no matches outside that one anchor. **Resolution:** "Book time" on the homepage hero is wired as the same plain link pattern (new tab, same URL) used on `/givebutter/`, since that's the only existing precedent. Flagging this rather than inventing a modal/popup component, which would be new functionality beyond a structural-device pass.
- **`evolt-homepage.png` was never available as a file.** It wasn't present in the repo, and there's no way for me to save a chat-pasted image to disk directly. Per your direction, I'm proceeding without placing it in the repo — the reference is used only for visual/proportion judgment, not committed. There is nothing to move or `.vercelignore`.
- **`propel26-stage-800.jpg` didn't exist either.** Only `propel26-stage-1600.jpg` was found (in `~/Downloads`, not the repo). Per your direction I generated the 800px variant myself with `sips -Z 800` (no re-crop, no filters — a straight downsize of the same b/w, already-optimized source) and moved both files to the repo root alongside `headshot.jpg`.
- **Work hierarchy has fewer content items than the spec describes.** There's an uncommitted, unrelated WIP change already on `main` (stashed and carried onto this branch per your instruction) that reduced the homepage `.work-grid` from three cards to two, merging the old "redesigned around the customer" and "coaching" cards into a single new Propel26-focused card. The spec's "lead item full width, other two share a row, third gets a single sentence" describes four items' worth of visual weight; only two exist. **Resolution:** since content is unchanged this pass, I'm building a two-tier hierarchy from what's there — the Propel26 card as the full-width lead (with the photo), the Enterprise card compressed to a single-sentence treatment — rather than inventing a third item or restoring dropped copy.
- **`/givebutter/` already has scroll-triggered fade/translate motion** (`.fade-up` + `IntersectionObserver`) predating this pass. The "no motion" invariant applies to what I'm adding, not a mandate to strip pre-existing behavior outside the requested changes — leaving it as is and noting it here rather than silently expanding scope.
- No hardcoded hex values beyond the existing `--terracotta: #5a7a3a` / base palette are introduced anywhere in this pass; the nav CTA's "dark pill" uses `var(--text)` (already-defined token), not a new color.
