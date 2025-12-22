# Design Principles — PRISM Protocol v3 (2025)
Awwwards-grade interaction system for a spatial, kinetic, hyper-fluid interface.
Version: 1.0

---

## 1) Purpose and Scope
This document defines the **design system doctrine** for the codebase: visual language, motion grammar, typography, color physics, accessibility rules, and performance constraints.

**In scope**
- Design tokens (color, type, elevation, motion)
- Interaction patterns and state transitions
- Component behavior expectations
- Layout composition rules
- A11y + performance requirements

**Out of scope**
- Product strategy, IA rewrites, feature additions
- Backend, data model changes
- Copywriting beyond tone constraints

---

## 2) North Star Outcomes
The interface must feel:
1. **Alive** (continuous motion, responsive surfaces, kinetic type)
2. **Physical** (depth, material cues, light response)
3. **Intentional** (reduced noise, Rams-level hierarchy)
4. **Trustworthy** (accessibility, stability, performance)

Success is measured by:
- **Continuity:** transitions never “jump”; state changes are perceivable morphs
- **Tactility:** hover/focus communicate pressure, depth, and intent
- **Readability:** typographic hierarchy is unambiguous
- **A11y compliance:** keyboard + screen reader flows remain first-class
- **Performance:** consistent, smooth interaction under normal device constraints

---

## 3) Design Philosophy
### 3.1 Fluidity over Stability (No Teleporting)
**Definition:** UI state changes must preserve spatial continuity.  
**Operationalization:**
- Prefer **morphing** (size/shape/blur/opacity) over swapping elements
- Use shared layout transitions where possible (e.g., shared element concepts)
- Avoid abrupt reflow; if layout changes are necessary, animate with FLIP principles

### 3.2 Tactility and Material Truth
**Definition:** Surfaces communicate material via light, grain, and edge behavior.  
**Operationalization:**
- Surfaces are layered: base + inner ring + specular highlight + noise overlay
- Hover increases “pressure” (slight lift + tighter highlight + subtle tilt)
- Focus increases “clarity” (distinct ring system, not just color change)

### 3.3 Perceptual Color Physics (P3-Ready)
**Definition:** Color decisions use perceptual parameters, not arbitrary RGB.  
**Operationalization:**
- All system colors are defined in `oklch()`
- Gradients are tokenized (no hand-mixed per-component gradients)
- Shadows do not rely on muddy RGB; depth is achieved via layered compositing

### 3.4 Kinetic Typography
**Definition:** Type responds to interaction but remains readable.  
**Operationalization:**
- Fluid scale via `clamp()` tokens
- Variable font axes supported: `wght`, `wdth`, `slnt` (and `opsz` if available)
- Responsive accents: small changes only (avoid novelty jitter)

---

## 4) System Tokens (Source of Truth)
All design decisions must route through tokens. No one-off values.

### 4.1 Color Tokens
**Surface ladder**
- `surface-0` (deep base)
- `surface-1` (primary panel)
- `surface-2` (raised panel)
- `surface-3` (floating UI)
- `surface-glass` (translucent, blur-capable surface)

**Text ladder**
- `text-0` (primary)
- `text-1` (secondary)
- `text-muted` (tertiary)
- `text-inverse` (on strong surfaces)

**Stroke and ring**
- `stroke-subtle`, `stroke-strong`
- `ring-1`, `ring-2` (double-ring focus system)

**Brand**
- `brand-accent` (single accent)
- `brand-aurora-*` (mesh stops)
- `brand-aurora-gradient` (canonical gradient recipe)

**Rules**
- Gradients must come from named gradient tokens only
- No component-specific hex values
- Contrast must be validated (especially on glass)

### 4.2 Typography Tokens
**Font families**
- `font-sans` must be variable (supports `wght`, `wdth`, `slnt`)
- Optional `font-mono` for code/telemetry contexts

**Scale**
- Define `--step--1` to `--step-6` using `clamp()`
- Headings use steps, body uses steps, microcopy uses steps

**Rules**
- Only use token steps, no raw `rem` sizes in components
- Default letter-spacing is conservative; avoid “stylized” tracking for body text
- Line-height must maintain readability on dense surfaces

### 4.3 Elevation Tokens
Elevation is not a single shadow; it is a **recipe**:
- base shadow stack
- inner ring (etched)
- optional backdrop blur behavior (only for glass)
- optional specular highlight

**Layers**
- `elev-0` (flat)
- `elev-1` (resting surface)
- `elev-2` (interactive hover)
- `elev-3` (floating UI, nav capsule)
- `elev-4` (modal/dialog)

**Rules**
- Glass surfaces require an inner ring and controlled blur
- Elevation must not rely on heavy blur radius that harms performance

### 4.4 Motion Tokens
**Default springs**
- `spring-ui`: stiffness ~400, damping ~30
- `spring-modal`: slightly softer; still snappy and premium

**Bezier**
- `ease-emphasis`: `cubic-bezier(0.76, 0, 0.24, 1)`

**Forbidden**
- `linear`, `ease-in-out`

**Rules**
- Motion is consistent across the system: components inherit motion tokens
- Always support `prefers-reduced-motion` (disable velocity effects; keep essential fades)

---

## 5) Interaction Grammar
### 5.1 State Transition Rules
Every component state must have:
- `rest` → `hover` → `pressed` → `focus` → `disabled` → `loading`
- Motion continuity between states (no abrupt swaps)

**Operational rules**
- Hover: small lift + highlight shift + micro-scale (subtle)
- Pressed: compress + reduce lift + tighten highlight
- Focus: double ring + ring offset + maintain hover lift logic
- Disabled: reduce contrast + remove lift + preserve layout

### 5.2 Cursor and Proximity Behaviors (Optional but Canonical)
- Magnetic behavior only where it adds clarity (primary CTA, key controls)
- Thresholds must be capped; do not cause disorientation

### 5.3 Scroll Velocity Effects
**Goal:** add a sense of momentum without harming readability.
- Apply small skew/stretch to large sections only
- Clamp intensity; never distort body text excessively
- Disable under `prefers-reduced-motion`

---

## 6) Spatial Composition and Layout
### 6.1 Grid Doctrine
- Use a responsive grid with deliberate asymmetry (bento/masonry)
- Maintain a clear hierarchy: hero → narrative blocks → feature bento → deep details

**Rules**
- Negative space is part of the system (avoid dense stacking)
- Asymmetry must still align to a baseline grid
- Avoid hard “boxed” layouts; surfaces should breathe

### 6.2 Navigation: Dynamic Capsule (“Dynamic Island”)
- Floating capsule that expands based on context (scroll/hover/route)
- Must remain accessible:
  - keyboard reachable
  - visible focus
  - ARIA labels where needed
- Should not occlude content on small viewports (adaptive positioning)

---

## 7) Component Expectations (Behavioral Specs)
These are behavioral constraints; visuals must be token-driven.

### 7.1 Buttons (Magnetic, Morphing)
- Primary CTAs: magnetic pull within a capped threshold
- Button → modal transitions should use shared continuity (shape expansion)
- Must have distinct focus state (double ring + offset)

### 7.2 Inputs (Organic Focus Morph)
- Rest: minimal footprint
- Focus: expands into a container with floating label
- Error: clear messaging + ring variant (do not rely on color alone)

### 7.3 Cards (Bento 2.0)
- Spotlight radial following pointer (subtle)
- Tilt/parallax using preserve-3d (small angles)
- Noise grain overlay always present at low opacity
- Card interactions must not “fight” with scroll (avoid heavy transforms during scroll)

---

## 8) Accessibility Requirements (Non-Negotiable)
### 8.1 Focus System
- Double ring: `ring-1` + `ring-2` with offset
- Focus must be visible on all surfaces including glass
- Never remove outlines without replacing them with tokenized focus rings

### 8.2 Keyboard and Semantics
- All interactive elements must be keyboard operable
- Correct roles: button vs link vs toggle
- ARIA used only when necessary (avoid redundant ARIA)

### 8.3 Reduced Motion
- If `prefers-reduced-motion`:
  - disable velocity-based skew/stretch
  - reduce parallax and magnetic behaviors
  - keep essential transitions short and non-distracting

### 8.4 Contrast and Readability
- Validate contrast for text on translucent surfaces
- Avoid placing small text over complex gradients without a stabilizing overlay

---

## 9) Performance Requirements
### 9.1 Motion and Rendering
- Prefer transform + opacity animations (GPU-friendly)
- Avoid animating layout properties unless necessary; if necessary, keep scope tight
- Avoid large, unbounded backdrop blurs
- Debounce pointer tracking; use requestAnimationFrame patterns

### 9.2 Payload Discipline
- Fonts: variable fonts only, subset where possible
- Effects: noise overlays should be lightweight (CSS-driven)
- No interaction should trigger full-page rerenders

---

## 10) Tone and Visual Restraint
Awwwards-grade does not mean maximal effects everywhere.

**Rules**
- Reserve intense effects for hero moments and primary interactions
- Secondary UI remains calm, legible, and structured
- Every flourish must justify itself: clarity, hierarchy, or delight—never decoration alone

---

## 11) Implementation Guardrails
### 11.1 Token Exclusivity
- Colors must come from tokens (CSS vars exposed through Tailwind)
- Type sizes must come from the fluid scale tokens
- Spacing uses `rem`, not `px` (hairlines allowed)

### 11.2 Component API Stability
- Do not break existing component props unless explicitly approved
- Refactors must preserve semantics and testability

### 11.3 QA Checklist
- Keyboard traversal (tab order + focus visibility)
- Reduced motion compliance
- Contrast on glass surfaces
- Mobile viewport occlusion (nav capsule)
- Scroll performance and jank
- Hover/focus parity (no “mouse-only” affordances)

---

## 12) Decision Hierarchy (When Conflicts Occur)
1. Accessibility
2. Performance
3. Clarity of hierarchy and intent
4. Visual craft and motion delight

---

## 13) Glossary (Operational Definitions)
- **Morph:** a continuous transformation of the same UI object across states (shape/size/position/blur)
- **Glass-steel:** translucent surface with etched inner ring + specular highlight + controlled blur
- **Aurora mesh:** multi-stop gradient system with tokenized stops and consistent lightness ramp
- **Velocity effect:** subtle deformation tied to scroll speed, clamped and disabled under reduced motion

---
End of document.
