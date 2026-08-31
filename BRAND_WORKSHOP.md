# Path A Logical (PAL) brand workshop

This file is the canonical record of approved core brand decisions for the camping project.

Brand work stays separate from technical architecture, Firebase configuration, store-account setup, package-name changes, and implementation decisions unless a brand choice directly affects the product experience.

## Current brand status

- **Full customer-facing brand:** **Path A Logical**
- **Compact brand / app shorthand:** **PAL**
- **Name status:** selected by user; trademark, app-store, domain, and handle clearance still required before public release
- **Stage 1 — Brand direction:** APPROVED
- **Stage 2 — Naming:** APPROVED / NOT YET CLEARED
- **Stage 3 — Mission, tagline, positioning:** APPROVED
- **Stage 4 — Brand voice:** APPROVED
- **Stage 5 — Core color system:** APPROVED — FIELD GUIDE
- **Stage 6 — Logo and app-icon system:** APPROVED DIRECTION
- **Checklist visual-status system:** LOCKED
- **Android package identifier:** `com.notallwhowander.camping` for now; do not change solely because the brand name changed

The product is a local-first camping planning app for Android and the web. It helps people plan trips, manage packing and gear, check weather and safety context, save campsites and waypoints, use offline maps and trip packs, and eventually share trips.

The app should feel useful before a trip, calm when signal is poor, easy to understand, and trustworthy with personal information. It is not a social-media camping app, a luxury glamping brand, or a survivalist/tactical product.

---

# 1. Brand name and hierarchy

## Primary brand

# **Path A Logical**

Use **Path A Logical** for:

- store listings
- websites and landing pages
- onboarding and first-run brand moments
- legal/product identification
- documentation
- larger wordmark placements
- marketing and public-facing descriptions

The capitalization is **Path A Logical**.

Do not stylize the written name as `Path-A-Logic`, `PathLogic`, `Pathalogic`, or other altered spellings unless a future clearance requirement forces a naming change.

## Compact brand

# **PAL**

PAL is the approved shorthand and compact visual identity.

Use **PAL** for:

- app icon
- compact navigation/header placements
- favicon and shortcut assets where legible
- badges and small brand marks
- loading/splash moments where the full wordmark would be too large
- internal shorthand in product copy only when the user already knows the brand

### Hierarchy rule

**Path A Logical is the name. PAL is the shorthand.**

Do not make PAL a separate sub-brand. Do not create competing identities for the two forms.

On first exposure, prefer **Path A Logical**. Once the brand is established, PAL can carry compact UI and icon duties.

---

# 2. Approved core brand direction

The brand combines three ideas.

## Calm field notebook

Grounded, practical, durable, tactile, and lightly nostalgic. The product should feel like a trusted object that belongs in a pack, glove box, campsite, or kitchen table while planning a trip.

## Quiet wild

Clean, low-noise, nature-respectful, privacy-conscious, and calm. Avoid the visual and verbal noise common to social, gamified, or overly adventurous outdoor products.

## Prepared adventure

Capable, map-aware, weather-aware, safety-conscious, and useful without becoming tactical, macho, alarmist, or survivalist.

## Core personality

**Timeless outdoors with a retro “golden age of camping” influence.**

The identity combines the familiarity and material warmth of classic camping equipment, field guides, canvas packs, paper maps, enamelware, lantern light, wildflowers, and old park graphics with a clean, highly usable modern interface.

Retro influence is an ingredient, not a costume. The product must still feel current, readable, accessible, and trustworthy.

## Visual balance rule

Aim approximately for:

- **60% clean, modern utility**
- **25% timeless field-guide / classic-camping character**
- **15% expressive outdoor texture and color**

---

# 3. Mission, promise, positioning, and tagline

## Mission

> **Make preparing for the outdoors simple, calm, and dependable, so people can spend less time managing a trip and more time taking it.**

## Core product promise

> **Bring the important parts of trip planning together before you head out.**

The product must not imply that PAL can eliminate uncertainty, guarantee safety, or replace judgment in the field.

## Positioning

> **Path A Logical is a local-first camping planner that brings trip plans, packing, places, maps, weather, and practical field information together so campers can prepare before leaving reliable service behind.**

## Primary tagline

> **Less guesswork before you leave. More outside when you get there.**

## Short supporting line

> **Less guesswork. More outside.**

Use the short line only when space is limited or as secondary campaign copy. The longer line remains the canonical primary tagline.

## App-store introduction

> **Path A Logical helps you plan camping trips before you leave home. Build packing lists, organize gear, save campsites and waypoints, check useful weather and trip context, and prepare maps and information for offline use. Everything stays focused on making the trip easier to prepare for and simpler to manage.**

---

# 4. Aesthetic reference library

These references guide UI, illustration, color, texture, icon, logo, web, store, and marketing decisions.

## Core references

- forest and field greens
- warm tan / canvas
- lantern / camp orange
- warm cream
- dark earth and mud
- desert wildflowers
- gumbo lily
- columbines
- old topographic maps
- classic Coleman-style lantern imagery and lantern-light warmth
- canvas and weathered field gear
- boot prints and tread geometry
- mud, dust, and honest outdoor wear
- clean, modern, user-friendly interface design

## Graphic language

Good references:

- restrained topo-line patterns
- subtle paper or canvas grain
- simple field-guide illustrations
- stamped or printed utility marks
- trail-marker geometry
- boot-print or tread motifs used sparingly
- wildflower silhouettes or botanical linework
- lantern-glow warmth used as an accent rather than literal skeuomorphism
- simple route/path shapes
- modest mountain or tree forms when used as part of the system rather than generic stock imagery

Avoid:

- generic mountain + pine + tent combinations as the entire identity
- faux-vintage distress on primary UI controls
- heavy wood textures
- camouflage
- military/tactical motifs
- overly rustic cabin branding
- cowboy/frontier parody
- glossy adventure-travel photography as the dominant identity

---

# 5. Core color system — FIELD GUIDE — APPROVED

The approved palette is **Field Guide**.

It should feel like an old topo map, canvas field notebook, green camp gear, and warm lantern translated into a clean contemporary UI.

| Role | Name | Hex | Primary use |
| --- | --- | --- | --- |
| Primary | Evergreen | `#24452F` | Primary buttons, navigation emphasis, headers, selected states |
| Secondary | Field Sage | `#6F8064` | Secondary controls, chips, map/UI accents, subtle fills |
| Neutral | Canvas | `#D2B98D` | Cards, dividers, illustrations, secondary surfaces |
| Background | Warm Cream | `#F7F0DE` | Main light-mode background |
| Accent | Lantern Orange | `#C8612C` | Calls to attention, progress, highlights, brand accents |
| Ink | Mud Ink | `#242720` | Primary light-mode text and dark neutral |
| Wildflower | Columbine | `#5E6FA3` | Rare decorative/data-series accent |
| Wildflower | Gumbo Lily | `#E7C95C` | Rare decorative/data-series accent |
| Dark background | Night Pine | `#182019` | Main dark-mode background |
| Dark surface | Camp Table | `#222C23` | Dark-mode cards and panels |
| Dark text | Parchment | `#F3EBD9` | Primary dark-mode text |
| Dark accent | Lantern Glow | `#E47A3F` | Dark-mode brand accent and active states |

## Light-mode usage

- Warm Cream is the default canvas rather than pure white.
- Mud Ink is the default text color.
- Evergreen carries primary actions and important selected states.
- Field Sage is secondary and should not replace Evergreen for high-priority actions.
- Canvas appears in restrained surfaces, separators, cards, illustrations, and topo treatments.
- Lantern Orange is an accent, not the dominant interface color.
- Wildflower colors should usually occupy less than 5% of a screen.

## Dark-mode usage

- Night Pine replaces black as the default background.
- Camp Table provides subtle surface separation.
- Parchment provides warm high-contrast text.
- Lantern Glow may become slightly brighter than the light-mode orange.
- Do not turn dark mode into black + orange; greens and warm neutrals remain visible parts of the system.

## Representative contrast checks

- Mud Ink `#242720` on Warm Cream `#F7F0DE`: **13.33:1**
- White on Evergreen `#24452F`: **10.67:1**
- Parchment `#F3EBD9` on Night Pine `#182019`: **14.05:1**
- Black on Lantern Orange `#C8612C`: **5.20:1**
- White on Lantern Orange: **4.04:1** — do not use for ordinary small text

---

# 6. Checklist visual-status system — LOCKED

The checklist must always retain the **green / red / yellow / gray** visual-status option.

This is a functional semantic system, not decoration, and must not be removed when the brand palette or UI is refreshed.

## Canonical statuses

| Status | Color | Recommended token | Visual treatment | Meaning |
| --- | --- | --- | --- | --- |
| Complete | Green | `#2F7D4A` | Filled green circle + check | Packed / complete / confirmed |
| Missing | Red | `#C94A3A` | Red ring or red state icon + clear label | Needed / missing / unresolved |
| Partial / Maybe | Yellow | `#D9A321` | Yellow ring or partial-state icon + label | Partially complete / undecided / maybe |
| Not needed | Gray | `#8A8D85` | Gray ring or neutral state icon + label | Not needed / not applicable / skipped intentionally |

## Checklist rules

1. **Never communicate status by color alone.** Always pair the color with an icon, shape, label, or accessible text state.
2. **Green is reserved for completion/confirmation inside the checklist system.** Do not confuse it with ordinary selected-navigation green when a checklist state is being shown.
3. **Red means missing or requires attention in a checklist.** It does not automatically mean emergency danger.
4. **Yellow means incomplete, uncertain, partial, or optional decision pending.** It must not be used as a vague decorative highlight inside checklist rows.
5. **Gray means intentionally inactive/not needed**, not an error or disabled control unless the surrounding UI makes that distinction explicit.
6. Preserve these four states in list view, visual checklist view, trip summary, group packing, print/export views, and offline mode.
7. The user should be able to understand the same item state in light mode and dark mode.
8. Semantic safety colors for wildfire, severe weather, closures, destructive actions, and emergency states remain separate from checklist status colors.

This system is a permanent UI requirement unless the user explicitly reopens the decision.

---

# 7. Brand voice — APPROVED

## Voice character

**Path A Logical sounds like a calm field guide written by a knowledgeable camping friend.**

Working balance:

- **70% calm field guide**
- **30% knowledgeable camping friend**

The voice feels experienced, never superior. It helps the user prepare and make decisions; it does not perform expertise.

## Five principles

1. **Useful first.** Lead with what the user needs to know or do.
2. **Calm confidence.** State conditions and next steps plainly.
3. **Warm, not chatty.** Human without filler or banter.
4. **Plain language over outdoor jargon.** Use specialist terms only when they add precision.
5. **Light character, used sparingly.** Literary texture and dry humor are for low-stakes moments only.

## Safety and weather override

For hazards, severe weather, fire restrictions, closures, navigation problems, emergency information, and other consequential situations:

**clarity > warmth > personality > humor**

Safety tone is **calm but firm**.

## Humor rule

Very light humor is allowed only in low-stakes moments such as packing reminders, harmless empty states, and trip completion.

Never use humor for:

- safety warnings
- severe weather
- wildfire or evacuation information
- getting lost or navigation failures
- medical information
- failed offline downloads when the user may depend on them
- privacy/security warnings

## UI-writing rhythm

- Prefer short sentences.
- Use sentence case.
- Use exclamation points rarely.
- Avoid ellipses for personality.
- Use contractions when natural.
- Buttons usually begin with a clear verb: **Save site**, **Download map**, **Check weather**, **Add gear**.

---

# 8. Logo and app-icon system — APPROVED DIRECTION

## Brand presentation rule

**Path A Logical is the full brand presentation. PAL is the compact/app identity.**

This is the approved hierarchy.

## Primary wordmark

The primary lockup should present:

- **Path A Logical** as the dominant readable name
- optional **PAL** as a small supporting shorthand when space allows
- an understated path/field-guide mark beside or above the wordmark

The full lockup should feel like a modern interpretation of a classic field-guide or park-reference title, not a faux-vintage patch.

## Compact PAL mark

The PAL mark is the core compact identity.

Recommended construction:

- large, highly legible **PAL** letterform
- Evergreen or Night Pine field
- Warm Cream / Parchment lettering
- subtle topo/path line or route geometry
- optional Lantern Orange directional/star/marker accent
- enough negative space to remain clear at small sizes

Do not rely on tiny botanical, mountain, or topo details for recognition.

## App icon

Preferred app-icon direction:

- **PAL** is the primary readable element
- rounded-square Android/iOS-friendly composition
- Evergreen base
- Warm Cream PAL lettering
- restrained path/topo geometry
- Lantern Orange accent used sparingly

The app icon should still read clearly at **48 px**.

### Android adaptive icon

- Foreground: PAL monogram / compact mark
- Background: Evergreen `#24452F` or approved dedicated adaptive-icon green
- Keep critical foreground geometry inside the Android adaptive safe zone
- Avoid putting essential details near crop-prone edges
- Do not make thin topo lines essential to recognition

## Small-size system

- **48 px and above:** PAL monogram + restrained secondary path/topo detail is acceptable
- **24–47 px:** simplify to PAL with minimal geometry
- **16–23 px favicon:** use the simplest recognizable PAL/P-path mark; remove texture and thin lines
- Never shrink the full Path A Logical wordmark into unreadable sizes

## Monochrome mark

Create a one-color version of the PAL mark that works in:

- black
- white
- Evergreen
- system monochrome/themed-icon contexts

It must remain identifiable without Lantern Orange, topo texture, gradients, or photography.

## Logo do-not rules

Do not:

- create separate unrelated logos for Path A Logical and PAL
- make PAL look like a sports-team acronym
- make the identity tactical or military
- make a generic mountain/pine/tent badge the entire logo
- use detailed scenic illustrations inside the production app icon
- use faux-distressed lettering in the UI
- make Lantern Orange the dominant logo color

## Asset checklist

Final production assets should include:

- 1024 × 1024 master PAL icon
- Android adaptive foreground asset
- Android adaptive background asset
- iOS/app-store icon export as needed
- full Path A Logical horizontal wordmark
- stacked wordmark
- PAL compact mark
- one-color/monochrome versions
- light-background versions
- dark-background versions
- favicon / browser shortcut version
- 48 px verification render
- 24 px verification render
- safe-area specification
- minimum-size specification

The approved mockup direction is a visual reference, not a substitute for final vector production assets.

---

# 9. Global visual rules

1. **Brand colors never replace semantic safety colors.**
2. **Never communicate state by color alone.**
3. **Orange is an accent, not the universal action color.** Primary actions usually use Evergreen.
4. **Wildflower colors are seasoning.** Use for charts, illustrations, route differentiation, or occasional brand moments.
5. **Topo lines stay low contrast** unless they are actual map data.
6. **Map legibility outranks brand purity.** Roads, water, routes, closures, hazards, and terrain must remain distinguishable.
7. **Bright-sunlight usability matters.** Important controls need strong contrast and clear boundaries.
8. **Dark mode is designed, not inverted.** Use dedicated dark tokens.
9. **Checklist status colors remain available at all times:** green / red / yellow / gray.
10. **Clean modern usability wins over decorative nostalgia.**

---

# 10. Name and rights verification — REQUIRED BEFORE RELEASE

**Path A Logical / PAL is selected creatively but is not yet legally or commercially cleared.**

Before public release, verify:

- U.S. trademark conflicts for **Path A Logical**, **PAL**, and confusingly similar software/outdoor marks
- Google Play name conflicts
- Apple App Store name conflicts
- relevant domains
- GitHub/social handles if needed
- logo similarity / logo-rights concerns
- outdoor-industry brand conflicts

Do not make irreversible legal-entity, package-name, store, or domain decisions until this check is complete.

This workshop is not legal advice.

---

# 11. Core brand kit — current canonical summary

## Brand name

**Path A Logical**

Compact identity: **PAL**

## Mission

Make preparing for the outdoors simple, calm, and dependable, so people can spend less time managing a trip and more time taking it.

## Tagline

**Less guesswork before you leave. More outside when you get there.**

## Positioning

A local-first camping planner that brings trip plans, packing, places, maps, weather, and practical field information together before campers leave reliable service behind.

## Personality

Calm field notebook + quiet wild + prepared adventure, expressed as clean modern utility with a restrained golden-age camping influence.

## Colors

**Field Guide** palette: Evergreen, Field Sage, Canvas, Warm Cream, Lantern Orange, Mud Ink, restrained Columbine and Gumbo Lily accents, plus dedicated dark-mode tokens.

## Checklist visual system

**Green = complete; red = missing; yellow = partial/maybe; gray = not needed.**

Always pair color with icon/shape/text.

## Type direction

Brand/display typography may use a warm field-guide-inspired serif; UI typography should remain highly readable, modern, and restrained. Final font selection remains a later implementation decision.

## Logo/icon brief

Full branding uses **Path A Logical**. Compact/app branding uses **PAL**. The PAL mark should combine strong lettering with restrained path/topo geometry and the approved Field Guide palette.

## Voice

Calm field guide + knowledgeable camping friend. Useful first, warm but concise, calm but firm for consequential information.

## Store copy

Use the approved planning-first app-store introduction in Section 3 as the current baseline; full launch copy comes in the later full-brand pass.

## Asset checklist

See Section 8.

## Decisions still requiring verification

- trademark
- app-store-name availability
- domain availability
- handle availability if needed
- logo similarity/rights
- final typography license and selection
- final production vector assets

---

# Later full-brand workshop

After the core brand, extend into:

- audience and personas
- deeper positioning
- brand architecture
- final typography
- iconography
- imagery system
- illustration rules
- motion
- UX writing expansion
- onboarding
- full store copy
- screenshot captions
- web presentation
- accessibility specifications
- detailed do/don’t examples
- merchandise/physical-print considerations if ever needed

Core visual and verbal decisions above remain constraints unless explicitly reopened.
