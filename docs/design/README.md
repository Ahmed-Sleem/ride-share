# Design

`CH10a_design_system.md` is the specification chapter. What follows is how it
is actually implemented, and the two decisions most likely to be undone by
someone who does not know why they were made.

## Colour: two roles, never mixed

**Teal is travel.** Book, claim, confirm, go, current location, on-time. If an
action moves a person or a vehicle, it is teal.

**Violet is value and continuity.** Subscriptions, promotions, the
recommendation chip, saved balance, the walking leg of a journey, selection,
and the focus ring. If something is about money kept or a state remembered, it
is violet.

A violet button must never mean "go", and a teal surface must never mean
"saving". Two colours with jobs stay meaningful; two colours used
interchangeably become decoration, and then the interface has no accent at all,
only more paint.

Blue is reserved for the route line on maps. That is a map convention rather
than brand expression, and overriding it makes maps harder to read.

## Tokens are two-layer

Primitives (`--teal-500`, `--violet-300`) are raw values with no meaning.
Semantic tokens (`--brand`, `--accent`, `--danger`, `--focus`) carry the
meaning. Components reference semantic tokens only.

Dark mode remaps semantic tokens to different primitives. No component knows
which theme is active, and there is no second copy of any component for dark
mode.

## Values that are deliberately not themed

Four, each with a reason in the source:

| Token | Why it never changes |
|---|---|
| `--qr-paper`, `--qr-ink` | A boarding code must scan. Inverting it in dark mode makes it unreadable to a camera |
| `--knob` | The switch handle needs contrast against both track colours |
| `--on-solid` | White text on a saturated fill is white in both themes |

## Breakpoints

Material 3 window size classes, chosen because they are the researched standard
rather than numbers invented here:

| Width | Class | Navigation |
|---|---|---|
| < 600px | compact | Bottom bar |
| ≥ 600px | medium | Collapsed rail, icons only |
| ≥ 840px | expanded | Expanded rail, icons and labels, profile pinned at the bottom |
| ≥ 1200px | large | Same, roomier gutters |
| ≥ 1600px | extra-large | Shell stops growing, content stays centred |

There is also a short-viewport rule at `max-height: 520px` for landscape
phones, which drops labels and tightens the bars.

Navigation is one component. The CSS decides its presentation; there is no
JavaScript branch per size and no resize listener.

## Sizes that are not negotiable

| Token | Value | Why |
|---|---|---|
| `--tap` | 44px | Minimum touch target |
| `--tap-driver` | 56px | Drivers work one-handed, in sunlight, in a moving vehicle |
| `--f-input` | 16px | Below 16px, iOS Safari force-zooms the viewport on focus and the user cannot undo it |

## Layout contract

The shell is exactly one viewport tall. `.main` is the only element that
scrolls; the top bar, search band and navigation are `flex:none` siblings and
are therefore structurally unable to scroll away. If you find yourself adding
`position: fixed` to keep something in place, the element is in the wrong part
of the tree.
