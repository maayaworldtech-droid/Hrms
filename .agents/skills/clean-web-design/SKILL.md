---
name: clean-web-design
description: >
  Essential design principles, strict constraints, and anti-patterns to avoid generic AI-generated slop, bloated UI templates, and visual clutter when designing or building websites and web apps. Enforces restraint, high information density, clear typography hierarchy, functional component design, and purpose-driven layout over decorative bloat. Activate whenever designing, building, reviewing, or styling any frontend UI, web application, dashboard, or website.
license: MIT
---

# Clean Web Design: Anti-Slop UI & Product-Grade Frontend Standards

This skill prevents the common pitfalls of generic, template-driven, and bloated interface design. It guarantees that every interface built is authentic, functional, purposeful, and optimized for real humans doing real tasks.

---

## The Core Philosophy: Restraint Over Decoration

A design is finished not when there is nothing left to add, but when there is nothing left to take away. Every box, border, shadow, icon, and color must earn its place by solving a distinct user problem.

---

## 1. Container & Layout Restraint (Anti-Card Bloat)

- **No Nested Cards:** Never place cards inside cards inside cards. A card is a standalone content unit, not a substitute for spatial grouping.
- **Card Budget:** Ask: "Does this content actually need a bordered card?" Most content works better with whitespace, subtle dividers, or clean list rows.
- **No Uniform Card Grids:** Do not make every section identical 3-column cards. Different types of data require different presentations (tables, definition lists, inline key-values, timelines).
- **Purposeful Borders:** Avoid double borders, heavy outlines, and excessive divider lines. Use background contrast or whitespace first.
- **Stop Border-Radius Inflation:** Avoid `rounded-3xl` or excessive pill radii on rectangular elements. Use subtle radii (`rounded-md` or `rounded-lg`) that feel professional, not cartoonish.
- **No Gratuitous Glassmorphism:** Never use frosted glass / backdrop-blur unless actively layering over complex scrollable media where content separation demands it.

---

## 2. Color & Visual Effects Discipline

- **Restrain Accent Colors:** Do not bathe the screen in generic purple, royal blue, or vibrant gradient fills. Choose one brand tone and use neutral slates/grays for 90% of the UI.
- **Zero Gratuitous Gradients:** Gradients are rarely appropriate on background cards, metric tiles, or body sections. Use flat, clean, solid backgrounds.
- **Drop the Shadows & Glows:** Eliminate heavy drop-shadows, colored glow halos (`shadow-indigo-500/50`), and neon accents. Rely on 1px borders (`border-slate-200`) or clean surface colors.
- **Strict Status Semantics:** Reserve green strictly for success, red for errors/danger, amber for warnings, and neutral/blue for informational states. Never use status colors decoratively.

---

## 3. Typography & Information Hierarchy

- **Maximum 3 Font Sizes per View:** Establish an unambiguous scale:
  1. Primary Title / Metric
  2. Section Heading / Label
  3. Body / Value text
  4. (Optional) Small metadata / caption
- **No Competing Elements:** One primary focal point per screen. If every card has bold saturated headers and colorful badges, nothing stands out.
- **Tame Headings:** Headings must fit the context. A dashboard widget does not need a `text-3xl` header.
- **High Text Contrast:** Never use light gray text (`text-slate-300` or `#A0AEC0`) on white or light gray surfaces. Ensure all labels meet WCAG AAA / AA contrast ratios.
- **Stop Uppercase Overuse:** Avoid writing entire lines or labels in uppercase letters (`ALL CAPS`). Use standard sentence case or title case.

---

## 4. Icon & Badge Pruning

- **Icons Must Clarify, Not Decorate:** If plain text is self-explanatory, do not prepend an icon. 
- **Zero Emojis in Enterprise & Clean UI:** Never use consumer emojis in professional software interfaces. Use crisp, consistent outline SVG icons (e.g. Lucide) with uniform stroke width (`stroke-[1.75px]`).
- **Eliminate Badge Epidemic:** Do not badge every single keyword, status, category, and date. Badges lose all meaning when the entire screen is covered in colored pills.
- **No Pill Buttons Everywhere:** Reserve rounded-full pill buttons only for tags or search filters. Interactive buttons should have standard button geometry.

---

## 5. Spacing, Density & Screen Real Estate

- **Respect Screen Space:** Avoid excessive padding (`p-10` or giant vertical margins) that forces the user to scroll endlessly to see basic tables or metrics.
- **Consistent Rhythm:** Stick to a 4px/8px spatial system (e.g., `gap-2`, `gap-4`, `gap-6`). Do not mix arbitrary ad-hoc margins.
- **High Information Density for Productivity:** Business apps, dashboards, and portals are productivity tools. Users want to see relevant information at a glance, not scroll through fluffy whitespace.

---

## 6. Buttons, Actions & Interactive States

- **One Primary Action per Section:** Only the single most important action gets the primary solid fill. Everything else is secondary (outline), ghost, or text.
- **No Repeated Action Buttons:** Never duplicate the same button across multiple neighboring panels.
- **Unambiguous Interactive States:**
  - Clickable elements must look clickable (hover states, pointer cursors, distinct affordances).
  - Disabled states must look clearly disabled (reduced opacity, `not-allowed` cursor, clear reason if needed).
- **Mandatory Feedback & States:** Always design:
  1. Loading state (skeleton or clean spinner, not broken empty boxes)
  2. Empty state (helpful guidance and direct creation trigger)
  3. Error state (actionable recovery message)
  4. Confirmation dialog for destructive actions (delete, revoke, cancel)

---

## 7. Form Design Integrity

- **Logical Grouping:** Group related fields together. Never dump 20 ungrouped fields onto one screen.
- **Sensible Field Layout:** Place fields in a natural reading order. Use appropriate input types (native dates, numbers, masks).
- **Readable Labels:** Keep field labels visible, high-contrast, and directly above the corresponding inputs. Never use light placeholder text as a replacement for labels.

---

## 8. Mobile-First & Responsive Ergonomics

- **Never Just Shrink Desktop UI:** A desktop layout crammed into a 375px viewport with horizontal scrollbars is unacceptable.
- **Replace Wide Tables with Mobile Cards:** On small viewports, convert multi-column tables into concise, touchable data cards.
- **Touch-Friendly Targets:** Interactive elements on mobile must be at least 44px in height/width (`h-11` or `h-12`).
- **Clean Bottom Navigation:** Bottom navigation must be uncluttered (3 to 5 primary destinations max), pinned cleanly, and not crowd the screen content.

---

## 9. Content, Data & Business Logic Authenticity

- **Realistic Data Over Placeholder Fluff:** Never use `Lorem Ipsum`, `John Doe`, `$999,999`, or fake nonsense. Use domain-accurate, contextual data that reflects real workflows.
- **Consistent Numbers & Calculations:** Make sure totals, sums, remaining balances, and line items actually add up across all cards and views.
- **No Generic Greetings or Dashboard Clutter:** Avoid fluffy banners like *"Welcome back, user! Here is your wonderful day!"*. Jump straight into actionable status and workflow telemetry.
- **No Vanity Charts:** Don't throw decorative line charts or pointless circular progress rings where a clean number and trend delta would be ten times faster to read.
- **Concise UI Copy:** Cut verbose descriptions down to clear, concise labels.

---

## 10. Pre-Flight Checklist: Before Delivering Any UI

Before concluding any frontend design or implementation, review this checklist:
- [ ] Are there any nested cards? (If yes, flatten them).
- [ ] Are there unnecessary gradients, glows, or colored shadows? (If yes, remove them).
- [ ] Are there emojis in the UI? (If yes, replace with icons or remove).
- [ ] Are icons used only where they provide clarity? (If redundant, remove).
- [ ] Does every page have a single clear focus and primary action?
- [ ] Are font sizes restrained to 3 or 4 distinct levels?
- [ ] Is information density sufficient without requiring excess scrolling?
- [ ] On mobile, are tables eliminated in favor of clean touch cards?
- [ ] Do all calculations, balances, and numbers match across components?
- [ ] Are loading, empty, and error states accounted for?
