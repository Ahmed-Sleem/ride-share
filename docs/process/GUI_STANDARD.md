# Agent Working Rules — General Production-Ready GUI Standard

These rules are technology-independent and reusable for **any graphical user interface project**: web applications, desktop applications, mobile applications, embedded interfaces, design systems, dashboards, admin tools, and cross-platform products.

They apply regardless of language, framework, rendering engine, repository structure, or delivery format. Framework-specific techniques may vary, but the required outcomes do not.

Do not store secrets, passwords, private credentials, API keys, tokens, customer-private information, or sensitive infrastructure details in this file.

---

## 0. The Standard — Read This First

Every other rule serves this one. If rules appear to conflict, choose the interpretation that produces the more complete, consistent, maintainable, accessible, and reliable product unless the user explicitly instructs otherwise.

> **The GUI must be production-ready, complete, professional, centralized, reusable, adaptive, resilient, accessible, and consistent.**

It must not be a rough mockup, a fragile screenshot recreation, an assortment of one-off components, or a visually attractive interface with incomplete behavior.

### 0.1 Non-negotiable outcomes

1. **Take the time required.** Speed is never a reason to ship incomplete or fragile work.
2. **Nothing half-built.** Every visible control must work. Hide or clearly mark unfinished functionality rather than presenting dead controls.
3. **Define once, reuse everywhere.** Values, components, patterns, rules, and behaviors must each have one authoritative definition.
4. **Responsive and adaptive by construction.** The GUI must remain usable across supported screen sizes, window sizes, orientations, densities, zoom levels, content lengths, and input methods.
5. **Complete states.** Default, hover, focus, active, selected, disabled, loading, empty, success, warning, and error states must be addressed wherever relevant.
6. **Both major themes.** Light and dark appearance must be intentionally designed where the platform supports themes or the project requires them.
7. **Accessibility is part of completion.** Keyboard, touch, pointer, assistive technology, contrast, focus, and reduced-motion needs are core requirements.
8. **Correctness over appearance alone.** A GUI that looks correct but clips, overflows, traps focus, loses state, or contains non-working controls is not complete.
9. **Verify before claiming.** Never report completion solely because code was written or a build succeeded.

### 0.2 The one-change test

For every repeated value, component, pattern, or behavior, ask:

> To change this everywhere in the product, how many authoritative definitions must be edited?

The correct answer is **one**.

If changing a button, color, spacing value, authorization rule, validation behavior, loading pattern, or interaction requires editing multiple independent definitions, the architecture is not finished.

### 0.3 “Bulletproof” has a concrete meaning

“Bulletproof” does not mean defects are impossible. It means the interface has been deliberately engineered and tested to fail gracefully under realistic stress:

- very small and very large windows,
- resized windows and changing orientation,
- high zoom and text scaling,
- short and tall viewports,
- long labels and translated content,
- empty or missing data,
- large datasets,
- slow operations,
- failed operations,
- repeated or rapid input,
- theme changes,
- keyboard-only use,
- touch and pointer input,
- unavailable optional platform features.

No interface may be called resilient without testing these conditions.

---

## 1. Scope and Technology Independence

These rules govern outcomes, not a specific implementation technology.

They apply to projects built with, for example:

- plain HTML/CSS/JavaScript,
- React, Vue, Angular, Svelte, or other web frameworks,
- Electron or Tauri,
- Flutter,
- React Native,
- SwiftUI or UIKit,
- Jetpack Compose or Android Views,
- .NET MAUI, WPF, WinUI, or Avalonia,
- Qt, GTK, JavaFX, or similar desktop toolkits,
- game-engine or embedded UI systems,
- any future GUI framework.

Use the platform’s native strengths and conventions. Do not force a web-specific pattern into a native interface or a native-specific pattern into the web. The architecture must nevertheless preserve the same centralization, reuse, adaptability, accessibility, and verification standards.

---

## 2. Requirement and Planning Protocol

### 2.1 Parse every request into atomic requirements

Before non-trivial implementation, create an explicit checklist containing:

- every stated requirement,
- every implied requirement,
- target platforms,
- supported screen/window range,
- required themes,
- required interaction methods,
- accessibility expectations,
- data and state requirements,
- reference-image requirements,
- completion and verification criteria.

Do not silently decide that a difficult requirement is optional.

### 2.2 Clarify meaningful ambiguity

Ask before implementation when uncertainty could materially change:

- the target platform,
- the expected user flow,
- the supported devices,
- the minimum window or screen size,
- the source of data,
- the meaning of a visible action,
- branding or visual-reference fidelity,
- accessibility or localization requirements.

Do not ask unnecessary questions when the intent is already clear.

### 2.3 Research before inventing

For non-obvious design or interaction decisions:

1. Check the target platform’s established conventions.
2. Check mature products in the same domain.
3. Prefer familiar, accessible patterns.
4. Document intentional departures and their reason.

### 2.4 Verify each checklist item

A requirement is complete only when evidence proves it. Before delivery, compare the original request and checklist line by line. Anything unfinished must be completed or disclosed as a tracked limitation.

---

## 3. Centralized Design System

All visual decisions must come from one shared design system. The storage mechanism may be CSS variables, theme objects, resource dictionaries, design tokens, constants, environment values, or platform equivalents.

### 3.1 Required token categories

Centralize at least the applicable categories:

- font families,
- type scale,
- font weights,
- line heights,
- letter spacing,
- text colors,
- background and surface colors,
- border and divider colors,
- brand and accent colors,
- semantic status colors,
- data-visualization colors,
- spacing scale,
- control sizes,
- icon sizes,
- border widths,
- corner radii,
- elevations and shadows,
- opacity levels,
- layout widths,
- maximum content widths,
- navigation dimensions,
- layer/elevation order,
- animation durations,
- easing curves,
- focus-indicator styling,
- responsive thresholds or layout classes,
- input density and touch-target standards.

### 3.2 Semantic naming

Name tokens by purpose rather than by raw appearance or first usage.

Prefer concepts equivalent to:

```text
text.primary
text.muted
surface.base
surface.raised
border.subtle
action.primary
status.danger
focus.ring
spacing.section
radius.control
motion.fast
```

Avoid component code filled with unrelated literals such as raw hex colors, arbitrary pixel values, one-off durations, or improvised margins.

### 3.3 No magic-value drift

Before adding a new value:

1. Look for an existing token with the same role.
2. Reuse the established token when appropriate.
3. Add a token only when the value has a genuinely distinct design purpose.
4. Name it according to that purpose.
5. Document exceptional geometry when its reason is not obvious.

Derived values are acceptable when calculated from centralized tokens.

### 3.4 Centralization must be enforced

Where tooling permits, add automated checks for:

- unauthorized raw colors,
- arbitrary spacing outside the scale,
- duplicated component implementations,
- forbidden inline styling,
- invalid token references,
- theme-specific values inside shared components.

A centralized design system must be enforced by tooling and review, not merely intended.

---

## 4. Theme Architecture

Themes must be centralized, semantic, complete, and interchangeable.

### 4.1 One semantic contract

Components consume semantic tokens. Theme definitions assign values to those tokens.

Do not create independent copies of every component for light and dark mode. A shared component should change appearance because its semantic tokens change.

### 4.2 Light and dark modes

Where supported or requested:

1. Design both light and dark modes intentionally.
2. Honor system preference by default.
3. Honor a saved explicit user preference.
4. Provide an accessible theme control where appropriate.
5. Avoid a flash of the wrong theme during startup.
6. Ensure overlays, charts, illustrations, icons, tooltips, selection, disabled states, and focus indicators work in both themes.
7. Do not create dark mode by simply inverting the rendered interface.
8. Test contrast independently in both themes.

### 4.3 Extensibility

The same semantic contract should allow future themes, branding, high-contrast modes, or platform variants without rewriting components.

---

## 5. Shared Component Library

Build a reusable component system, then compose the product from it.

### 5.1 One implementation per concept

Each recurring concept must have one shared implementation, such as:

- application shell,
- navigation item,
- button and icon button,
- text input and search field,
- selection control,
- card or panel,
- list row,
- metric display,
- badge or status chip,
- avatar,
- tabs,
- table or data grid,
- chart container and legend,
- menu,
- tooltip,
- dialog,
- notification,
- pagination,
- loading state,
- empty state,
- error state.

Create only what the product needs, but never duplicate a needed pattern.

### 5.2 Component requirements

A shared component must be:

- general rather than page-specific,
- driven by inputs/data,
- configurable through documented variants,
- accessible by default,
- theme-aware,
- adaptive by default,
- safe with long and missing content,
- complete across relevant states,
- testable in isolation,
- free from hidden dependencies on one screen.

### 5.3 Extend; do not fork

Before creating a component:

1. Search for an existing primitive.
2. If it almost fits, extend it with a coherent variant or capability.
3. Create a new primitive only if the concept is genuinely different.
4. Never copy an existing component for convenience.

A one-off implementation requires a documented reason explaining why the shared component cannot serve it.

### 5.4 Data-driven repetition

Repeated content must come from structured data or models and use one renderer/component. Do not manually copy navigation items, cards, rows, menu entries, statuses, or chart legends.

### 5.5 Stable component contracts

Component APIs should expose intent, not internal styling details. Prefer properties equivalent to:

```text
variant = primary
size = medium
tone = success
state = loading
density = compact
```

Avoid requiring each consumer to reconstruct internal spacing, colors, icons, or interaction logic.

---

## 6. Centralized Behavior, State, and Business Rules

Centralization applies to behavior and logic as strongly as it applies to styling.

### 6.1 One implementation of each rule

There must be one authoritative implementation for each:

- authorization decision,
- validation rule,
- formatting rule,
- error mapping,
- navigation route definition,
- feature-availability decision,
- state transition,
- data transformation,
- date/number/currency convention,
- loading and retry policy.

A second copy is a future inconsistency even if both currently return the same answer.

### 6.2 Centralized state ownership

Every piece of state must have a clear owner. Avoid:

- duplicated state in parent and child without synchronization,
- UI state that disagrees with domain state,
- independently maintained copies of filters or selections,
- theme state scattered across components,
- actions that mutate hidden global state unpredictably.

Use the platform’s appropriate state-management mechanism. Keep local state local and shared state centrally owned.

### 6.3 Predictable state transitions

For every asynchronous action, define:

- idle,
- pending/loading,
- success,
- empty result where distinct,
- recoverable error,
- unrecoverable error,
- cancellation or supersession where relevant,
- retry behavior.

Never leave the interface in an ambiguous state after an interrupted or failed operation.

---

## 7. Responsive and Adaptive Layout

The GUI must be built for change in available space, not for one screenshot size.

### 7.1 Supported conditions

Design and test across applicable combinations of:

- narrow phones,
- standard phones,
- tablets,
- small laptops,
- standard desktops,
- wide and ultrawide displays,
- split-screen and multi-window use,
- portrait and landscape orientation,
- maximized and freely resized windows,
- high-density displays,
- platform text scaling,
- browser zoom where applicable,
- short-height viewports.

Platform-specific projects may define an explicit minimum supported size, but below that size the application must fail gracefully rather than corrupting its layout.

### 7.2 Content-driven adaptation

Use adaptive layout primitives provided by the platform:

- flexible stacks and grids,
- intrinsic sizing,
- minimum and maximum constraints,
- fluid dimensions,
- wrapping,
- adaptive columns,
- layout priorities,
- size classes,
- container queries,
- scroll containers,
- responsive typography where appropriate.

Breakpoints or size classes must be chosen where the content requires a layout change, not copied blindly from a device list.

### 7.3 Required adaptation behavior

1. Navigation must collapse, transform, or move before it crowds content.
2. Multi-column layouts must reduce columns before panels become unusable.
3. Repeated cards must reflow without arbitrary orphan sizing.
4. Wide data must use an intentional small-space strategy: scrolling, column prioritization, alternate row layout, or detail disclosure.
5. Charts and visualizations must resize without clipped labels or unreadable values.
6. Menus, dialogs, popovers, tooltips, and context surfaces must stay within the usable screen area.
7. Sticky and floating elements must not cover essential content.
8. Safe areas, title bars, task bars, virtual keyboards, and system overlays must be respected where applicable.
9. Long labels, large values, and localization expansion must wrap, truncate with accessible disclosure, or otherwise remain usable.
10. Loading, empty, and error states must preserve layout integrity.

### 7.4 No corruption under resizing

During live resizing or orientation changes:

- content must not overlap,
- controls must not become unreachable,
- focus must not be lost unnecessarily,
- scroll position should remain sensible,
- expensive redraws must not freeze interaction,
- overlays must reposition or close safely,
- state must not reset merely because layout changed.

### 7.5 Overflow policy

There must be no accidental page- or window-level overflow. Intentional scrolling must be:

- confined to the correct region,
- visually discoverable,
- keyboard and touch accessible,
- free from nested-scroll traps wherever possible.

Clipping content is not a responsive strategy.

---

## 8. Spacing, Density, and Visual Consistency

Spacing must come from the centralized scale and express hierarchy consistently.

### 8.1 Spacing hierarchy

Use deliberate levels for:

- gaps within controls,
- gaps between closely related items,
- padding within components,
- gaps between component groups,
- spacing between major sections.

The same relationship must use the same token throughout the product.

### 8.2 Density

If compact, comfortable, or touch-friendly density modes are required, implement them as centralized variants. Do not tune every screen independently.

### 8.3 Alignment

1. Align related content to a shared grid.
2. Keep component padding consistent.
3. Balance icons and text optically.
4. Use stable numeral alignment for comparable data where useful.
5. Avoid accidental near-duplicate sizes and one-pixel drift.
6. Do not use empty elements or meaningless content for layout spacing.

---

## 9. Visual Reference and Design Direction

When the user supplies an image, screenshot, mockup, design file, or existing product as inspiration, treat it as a strong reference.

### 9.1 Analyze before implementation

Identify:

- information hierarchy,
- navigation model,
- content density,
- grid and alignment,
- proportions,
- typography hierarchy,
- palette and contrast,
- borders, elevation, and shadows,
- icon and illustration style,
- whitespace rhythm,
- data-visualization language,
- interaction cues,
- likely responsive transformations.

### 9.2 Fidelity with judgment

1. Preserve the reference’s design character and important structure.
2. Do not blindly reproduce defects, illegible contrast, clipped content, or inaccessible behavior.
3. Infer missing themes, states, and responsive layouts consistently.
4. Do not switch to a substantially different visual language without a reason.
5. Use original or generic branding unless reproduction rights are clear.

The result must feel intentionally derived from the reference, not merely decorated with similar colors.

---

## 10. Interaction and Motion

Interactions must be elegant, minimal, predictable, and appropriate for a professional product.

### 10.1 Complete interaction states

Every interactive element must support the applicable states:

- default,
- hover or pointer-over,
- keyboard focus,
- pressed/active,
- selected/current,
- disabled,
- loading,
- expanded/collapsed,
- success,
- warning,
- error.

Hover must not be the only way to discover or use essential functionality.

### 10.2 Motion rules

1. Use centralized timing and easing values.
2. Prefer subtle transitions that reinforce state and hierarchy.
3. Avoid unnecessary bounce, large scaling, constant animation, and distracting movement.
4. Do not animate in ways that block input or cause layout instability.
5. Respect reduced-motion settings.
6. Maintain functional clarity when animation is disabled.
7. Use platform-native motion conventions where appropriate.

### 10.3 Every visible control must work

If the interface displays a control, it must perform its stated function or clearly explain why it is temporarily unavailable. Prohibited examples include:

- buttons that only print a log message,
- tabs that do not change content,
- filters that do not affect results,
- menus containing dead items,
- fake save confirmations,
- decorative controls that resemble real controls.

---

## 11. Accessibility and Inclusive Input

Accessibility is mandatory and must follow the target platform’s established accessibility APIs and conventions.

### 11.1 Semantics and names

1. Use native semantic controls before recreating them.
2. Give every interactive control an accessible name.
3. Provide roles, values, states, and descriptions where native semantics are insufficient.
4. Mark decorative visuals as decorative.
5. Give meaningful images, charts, and graphics useful alternatives or summaries.
6. Use a logical heading and landmark structure where the platform supports it.
7. Do not communicate meaning through color alone.

### 11.2 Keyboard, switch, and assistive input

1. All functionality must be operable without a pointer where the platform supports keyboard or assistive navigation.
2. Focus order must match visual and reading order.
3. Focus must be visible.
4. Opening an overlay must move focus appropriately; closing it must restore focus.
5. Hidden content must not remain focusable.
6. Standard controls must follow platform keyboard conventions.
7. Provide escape/cancel behavior where expected.
8. Avoid keyboard traps.

### 11.3 Touch and pointer input

1. Touch targets must meet platform guidance, generally around 44–48 logical pixels.
2. Closely spaced actions must not cause accidental activation.
3. Hover enhancements must have touch-accessible equivalents.
4. Drag operations require accessible alternatives when they perform essential actions.

### 11.4 Readability

1. Meet WCAG 2.2 AA contrast where applicable, or the platform’s equivalent standard.
2. Support user text scaling without clipped essential content.
3. Do not disable zoom unless a platform requirement makes it unavoidable.
4. Keep muted text readable.
5. Use plain, concise, actionable language.

---

## 12. Content, Localization, and Directionality

The GUI must not depend on sample text having convenient length.

Test with:

- long names and labels,
- short and long translations,
- right-to-left text where supported,
- mixed-direction content,
- large and negative numbers,
- different date and number formats,
- missing images,
- missing optional fields,
- zero results,
- many results.

Centralize date, number, currency, unit, pluralization, and relative-time formatting. Do not concatenate translatable sentences from fragments.

Layout should use direction-aware or logical positioning where the platform supports it.

---

## 13. Loading, Empty, Error, and Offline States

Every data-dependent region must define its non-happy paths.

### 13.1 Loading

- Preserve layout where practical.
- Avoid indefinite loading without feedback.
- Prevent duplicate submissions.
- Allow cancellation when operations are long or destructive.
- Use skeletons only when they improve understanding.

### 13.2 Empty

An empty state must explain:

- what is empty,
- whether that is normal,
- what the user can do next.

Do not confuse “no data exists” with “a filter returned no matches.”

### 13.3 Error

Errors must be:

- understandable,
- actionable where possible,
- placed near the affected task,
- safe from sensitive implementation details,
- recoverable through retry or correction when appropriate.

### 13.4 Offline or unavailable services

Where relevant, define behavior for network loss, timeouts, stale content, partial failure, and resumed connectivity. Never silently discard user input.

---

## 14. Data Visualization

When charts or visualizations are used:

1. Centralize palette, typography, spacing, and tooltip styling.
2. Resize without clipping or unreadable labels.
3. Provide accessible labels or summaries.
4. Do not rely on color alone for critical distinctions.
5. Avoid misleading axes, scales, or decorative distortion.
6. Keep data separate from rendering logic.
7. Support light and dark themes.
8. Define loading, empty, partial, and error states.
9. Ensure interactive points are reachable with applicable input methods.
10. Prefer the simplest visualization that communicates the data accurately.

---

## 15. Performance and Reliability

1. Avoid unnecessary full-screen rerenders.
2. Virtualize or paginate large collections where appropriate.
3. Debounce or throttle high-frequency events such as resize, scroll, and search when needed.
4. Do not block the main/UI thread with expensive work.
5. Cancel or supersede stale asynchronous work.
6. Clean up listeners, observers, subscriptions, timers, and resources.
7. Reserve space for delayed content to reduce layout shift.
8. Cache carefully without allowing stale state to become misleading.
9. Fail safely when optional platform APIs are unavailable.
10. Produce no uncaught exceptions, rejected promises, frozen views, or crashes during normal operation.
11. Preserve user work during recoverable failures.

Performance optimizations must be measured. Do not sacrifice maintainability for speculative micro-optimization.

---

## 16. Security and Privacy

1. Never embed secrets, private credentials, or production personal data in client code or resources.
2. Treat external and user-controlled content as untrusted.
3. Validate input at boundaries; server-side/domain validation remains authoritative when a backend exists.
4. Avoid unsafe code execution, injection, and unsanitized rich content.
5. Do not expose unauthorized actions or data.
6. Centralize authorization decisions.
7. Do not store sensitive data in insecure local persistence.
8. Do not silently send analytics or telemetry.
9. Use least privilege for platform capabilities, files, camera, microphone, location, notifications, and network access.
10. Explain permission requests in context and handle refusal gracefully.

A disabled control is not a substitute for authorization. If a user can never perform an action, hide it or explain the responsible role instead of inviting a guaranteed refusal.

---

## 17. Code Quality and Maintainability

### 17.1 General rules

- Keep modules cohesive.
- Separate design tokens, shared components, application composition, state, domain logic, and services.
- Use clear names based on intent.
- Validate external inputs.
- Handle asynchronous failures explicitly.
- Do not swallow exceptions.
- Remove dead code, unused resources, stale documentation, and obsolete components.
- Avoid production debug logging.
- Document non-obvious decisions and workarounds.
- Prefer platform-native capabilities before adding dependencies.

### 17.2 Dependency discipline

Before adding a dependency, check:

- whether the platform already provides the capability,
- maintenance and security health,
- license compatibility,
- bundle or application-size impact,
- accessibility quality,
- theme and localization support,
- long-term architecture fit.

Do not introduce a large framework or library for a small problem that can be solved clearly with existing tools.

### 17.3 No fake production behavior

Do not ship:

- fake API responses presented as live data,
- fake authentication,
- silent no-ops,
- unfinished workflows pretending to succeed,
- placeholder controls presented as functional,
- hardcoded production users,
- decorative error or success messages unrelated to actual state.

If the product is intentionally a prototype or local demo, label simulated behavior accurately.

---

## 18. Testing and Verification

A build that succeeds is not proof that the interface is correct.

### 18.1 Central verification command

Where the project supports automation, provide one central command that runs applicable checks:

- formatting,
- linting,
- type checking,
- unit tests,
- component tests,
- integration tests,
- UI/end-to-end tests,
- accessibility checks,
- design-token checks,
- build/package validation,
- dependency and secret scans.

### 18.2 Test each check by observing failure

For every new automated check:

1. Break the behavior it protects.
2. Confirm the check fails for the correct reason.
3. Restore the behavior.
4. Confirm the check passes.

A check never observed failing may be testing nothing meaningful.

### 18.3 Layout verification matrix

Test representative combinations of:

- minimum supported size,
- compact phone/narrow window,
- standard phone,
- tablet or medium window,
- small desktop/laptop,
- standard desktop,
- wide desktop,
- short-height window,
- portrait and landscape where relevant,
- 200% browser zoom or platform text scaling,
- light and dark modes,
- left-to-right and right-to-left layouts where supported.

For web GUIs, useful baseline viewport checks include 320×568, 375×812, 768×1024, 1024×768, 1280×800, 1440×900, and 1920×1080. Native projects should use equivalent platform size classes and freely resized windows.

### 18.4 At every tested size, verify

- no accidental window/page overflow,
- no overlap,
- no clipped essential content,
- readable text,
- usable navigation,
- reachable controls,
- correctly contained lists, tables, and charts,
- overlays remain within usable bounds,
- focus remains visible,
- state survives layout changes.

### 18.5 Interaction verification

Exercise every visible interaction. Confirm:

- correct result,
- keyboard/touch/pointer behavior as applicable,
- synchronized state,
- correct loading and failure behavior,
- safe repeated activation,
- no console errors, exceptions, crashes, or freezes.

### 18.6 Adversarial verification

Test:

- very long text,
- empty collections,
- many items,
- large values,
- missing optional data,
- rapid repeated input,
- slow and failed operations,
- theme changes during use,
- window resizing while overlays are open,
- interrupted operations,
- unavailable optional APIs.

### 18.7 Accessibility verification

Automated checks do not replace manual testing. Verify:

- keyboard-only operation,
- visible and logical focus,
- screen-reader/accessibility-tree names and states where tools permit,
- touch-target size,
- contrast,
- reduced motion,
- text scaling or 200% zoom,
- dialog and overlay focus handling.

---

## 19. Prohibited Shortcuts

Do not ship:

- duplicated component implementations,
- duplicated theme logic,
- scattered hardcoded colors or spacing,
- page- or screen-specific copies of shared behavior,
- a layout built for only one screenshot size,
- one emergency breakpoint used as the entire responsive strategy,
- clipping as a substitute for adaptation,
- accidental nested scrolling,
- hover-only functionality,
- invisible focus,
- unreadable muted text,
- uncontrolled animation,
- arbitrary maximum layer values,
- controls that do nothing,
- fake success states,
- inaccessible custom controls where native ones exist,
- tests that were never seen failing,
- claims of completeness without evidence.

---

## 20. Completion Gate

The GUI may be called complete only if every applicable answer is **yes**, or the limitation is explicitly documented and accepted.

### Architecture

- [ ] Are design values centralized?
- [ ] Are colors, typography, spacing, radii, elevation, and motion tokenized?
- [ ] Is every repeated component implemented once and reused?
- [ ] Is repeated content data-driven?
- [ ] Is each business and validation rule implemented once?
- [ ] Does every piece of state have one clear owner?
- [ ] Can global changes be made in one authoritative definition?

### Design

- [ ] Does the GUI follow the supplied reference or established design language?
- [ ] Is hierarchy clear and professional?
- [ ] Are spacing, alignment, density, and component states consistent?
- [ ] Are light and dark themes complete where required?
- [ ] Are interactions elegant, minimal, and predictable?

### Adaptability

- [ ] Does the GUI work across the complete supported size range?
- [ ] Does live resizing or rotation avoid corruption and state loss?
- [ ] Does it tolerate short heights, long content, and text scaling?
- [ ] Are overflow and scrolling intentional?
- [ ] Do navigation, data views, charts, menus, and dialogs adapt correctly?

### Functionality

- [ ] Does every visible control work?
- [ ] Are loading, empty, disabled, success, and error states handled?
- [ ] Are state changes predictable and synchronized?
- [ ] Are user inputs preserved through recoverable failures?
- [ ] Are there no normal-use errors, crashes, or freezes?

### Accessibility and safety

- [ ] Is the GUI usable with every required input method?
- [ ] Is focus visible and correctly managed?
- [ ] Are semantics, labels, roles, values, and states correct?
- [ ] Are contrast and text scaling acceptable?
- [ ] Is reduced motion respected?
- [ ] Is dynamic content handled safely?
- [ ] Are secrets and private data absent?

### Verification

- [ ] Was every original requirement checked line by line?
- [ ] Were representative sizes, orientations, and themes tested?
- [ ] Was every visible interaction exercised?
- [ ] Were adverse content and failure conditions tested?
- [ ] Were new automated checks observed failing correctly?
- [ ] Are all completion claims backed by evidence?

---

## 21. Final Agent Report

When delivering GUI work, report:

1. Files or modules created and changed.
2. Main interface sections and flows implemented.
3. Design-system and token architecture.
4. Shared components created or extended.
5. State and behavior architecture.
6. Adaptive and responsive behavior.
7. Theme support.
8. Accessibility measures.
9. Tests and verification performed, including observed results.
10. Known limitations and unverified items, clearly labeled.

Do not claim “production-ready,” “fully responsive,” “accessible,” “bulletproof,” or “complete” unless the relevant checks were actually performed.

---

## 22. Governing Principle

A GUI is not a collection of one-off screens. It is a product assembled from a coherent system.

> **Define every value once. Define every component once. Define every behavior once. Reuse them everywhere. Adapt deliberately to every supported size and input method. Test normal, extreme, and failure states. Deliver only when the whole interface works as one consistent system.**
