# Design System Specification: The Living Interface

## 1. Overview & Creative North Star
The "Living Interface" is a design system crafted to transcend static utility. It is built on the **Creative North Star of "The Luminous Void"**—an immersive experience where the interface does not feel like a set of buttons on a screen, but a reactive, sentient presence emerging from deep obsidian space.

By moving away from traditional grid-heavy layouts, this design system utilizes intentional asymmetry and "state-morphing" to communicate. It breaks the "template" look by prioritizing the core AI entity as the anchor, using overlapping glass layers and vibrant light emissions to guide the user’s eye. This is not just a dashboard; it is a cinematic environment.

---

## 2. Colors & Atmospheric Tones

The palette is rooted in an obsidian base, punctuated by high-chroma "State Shifts" that redefine the entire UI's mood.

### The Core Palette
- **Obsidian (Background):** `#0e0e10`. A true deep black to provide an infinite canvas.
- **On-Surface (Text/Icons):** `#fffbfe`. Pure white for maximum legibility against dark depths.
- **The "State" Spectrum:**
    - **Idle (Primary):** `primary` (`#74b1ff`) — Calm, blue-toned stability.
    - **Listening (Tertiary):** `tertiary` (`#81ecff`) — Energetic, electric cyan.
    - **Thinking (Secondary):** `secondary` (`#b884ff`) — Mystical, deep violet.
    - **Executing:** `on_tertiary_fixed` (`#00e3fd`) — Vibrant, active green.
    - **Alert:** `error` (`#ff716c`) — Warm, urgent amber/orange.

### Implementation Rules
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely by shifts in `surface-container` tiers or tonal transitions.
*   **Surface Hierarchy:** Use `surface-container-low` for large content areas and `surface-container-highest` for interactive cards. This creates "nested" depth without visual clutter.
*   **The Glass & Gradient Rule:** Floating elements must use Glassmorphism. Apply a 20% opacity to your `surface-variant` color with a 20px-40px backdrop-blur. 
*   **Signature Textures:** Main CTAs should never be flat. Use a linear gradient from `primary` to `primary-container` at a 45-degree angle to create "soul" and depth.

---

## 3. Typography: The Editorial Voice

We use a dual-font strategy to balance futuristic character with high-performance readability.

*   **Display & Headlines (Space Grotesk):** This is our "Character" font. Its geometric, slightly technical rhythm conveys the AI’s intelligence.
    - *Usage:* `display-lg` (3.5rem) for state declarations; `headline-md` (1.75rem) for section introductions.
*   **Body & Labels (Manrope):** A highly legible, modern sans-serif that remains crisp in low-light environments.
    - *Usage:* `body-lg` (1rem) for user prompts; `label-sm` (0.6875rem) for metadata.

**The Hierarchy Rule:** Maintain a high contrast between display sizes and body text. Large headlines should breathe with generous letter spacing, while labels should be tight and uppercase to act as functional markers.

---

## 4. Elevation & Depth: Tonal Layering

This system rejects drop shadows in favor of **Tonal Layering** and **Luminous Blooms**.

*   **The Layering Principle:** Stacking determines importance. Place a `surface-container-highest` card on top of a `surface-container-low` background. This creates a soft, natural lift.
*   **Ambient Shadows:** When a card must "float" (e.g., a modal), use a shadow with a 64px blur at 8% opacity. The shadow color should be a tinted version of the current "State" color (e.g., a faint blue shadow when Idle) to mimic light refraction.
*   **The "Ghost Border" Fallback:** If a container requires more definition, use a `outline-variant` at 15% opacity. Never use 100% opaque borders.
*   **State-Based Glow:** All active interactive elements should emit a subtle "bloom" using a soft outer glow of the current state color (e.g., `primary_dim` when in Idle mode).

---

## 5. Components

### The Core Entity (Orb)
The primary visual anchor. It uses layered radial gradients and animations to reflect the AI’s state. It should always overlap other UI elements to maintain the "Luminous Void" aesthetic.

### Buttons & Chips
*   **Primary Action:** Pill-shaped (`rounded-full`), using a state-color gradient.
*   **Ghost Chips:** Semi-transparent `surface-container-highest` with a "Ghost Border."
*   **State-Dependent Icons:** Use thin-line iconography. The stroke color must always match the current state token (e.g., `tertiary` for Listening).

### Input Fields
*   **The "Ask" Field:** A glassmorphic bar with no fill—only a `surface-container-highest` background and a subtle `surface-variant` blur. Avoid hard boxes; the field should feel like an extension of the background.

### Cards & Lists
*   **List Items:** Forbid the use of divider lines. Separate items using `8px` of vertical white space and a 2% background shift on hover.
*   **Device Cards:** Use `rounded-lg` (1rem). Ensure content is inset with generous padding (`24px`) to maintain the premium, high-end feel.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts. Let the "Orb" push content to the side to create a custom, editorial feel.
*   **Do** leverage "State-Theming." When the system moves to "Warning," the entire UI's secondary accents and glow effects must shift to the `error` amber palette.
*   **Do** use motion as a functional affordance. Elements should "materialize" from the obsidian background using opacity and scale transforms.

### Don't:
*   **Don't** use pure grey. Every "neutral" should be slightly tinted with the system’s base blue/obsidian hues to avoid a "washed out" look.
*   **Don't** clutter the screen. If a piece of information isn't vital to the current state, hide it. This system thrives on negative space.
*   **Don't** use standard Material Design 1px dividers. If you feel the need to separate, use a gap or a tonal shift.