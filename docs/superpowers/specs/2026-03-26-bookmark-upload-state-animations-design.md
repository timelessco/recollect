# Bookmark Upload State Animations

Smooth crossfade animations between bookmark upload states using Motion (v12+). Only the bookmark being added animates — existing cards are unaffected.

## Context

When a user adds a bookmark, the card goes through 5 states with no visual transitions between them. Content snaps in abruptly. This feature adds subtle crossfade and blur-up animations scoped to only the uploading card(s).

Motion v12.38.0 is already a dependency (used in sidepane, header popover, animated-size). No new dependency added — this extends existing usage.

## States

```text
ENTERING → FETCHING → LOADED → PROCESSING_IMAGE → COMPLETE
```

| State            | Trigger                           | Visual                                                     |
| ---------------- | --------------------------------- | ---------------------------------------------------------- |
| ENTERING         | Optimistic card mounted (no ID)   | Card fades in + slides down                                |
| FETCHING         | Waiting for min-data API          | Placeholder: loader gif + "Fetching data..."               |
| LOADED           | Min-data returns (title, ogImage) | Text crossfades in; image starts blur-up if ogImage exists |
| PROCESSING_IMAGE | Generating image (no ogImage)     | Placeholder with context-dependent text (see below)        |
| COMPLETE         | Final image available             | Image blur-up reveal; animation lifecycle ends             |

### PROCESSING_IMAGE Sub-Paths

PROCESSING_IMAGE is a generic "generating image" state. The placeholder text varies by media type:

- **Regular URL**: "Taking screenshot..."
- **PDF**: "Generating thumbnail..." (client-side via canvas)
- **Audio**: Skipped entirely — audio bookmarks go LOADED → COMPLETE (fallback image)
- **Direct image**: Skipped — the URL itself is the image, goes LOADED → COMPLETE

## Animation Specs

### Card Entry (ENTERING)

- `initial: { opacity: 0, y: -12 }`
- `animate: { opacity: 1, y: 0 }`
- Duration: 300ms, easing: `easeOut`
- Applies to all views: Card, List, Moodboard, Timeline

### Text Crossfade (FETCHING → LOADED)

- `<AnimatePresence mode="wait">` around title + description region
- Keyed by state: `key="placeholder"` vs `key="content"`
- Exit: `opacity 1 → 0`, 150ms
- Enter: `opacity 0 → 1`, 200ms
- Total: ~350ms
- Only title + description animate; tags, info, metadata appear instantly

### Image Blur-Up Reveal (LOADED/COMPLETE)

- Image loads hidden: `filter: blur(20px)`, `opacity: 0`
- On blur-up animation start: animate to `filter: blur(0px)`, `opacity: 1`
- Duration: 400ms, easing: `easeOut`
- Placeholder exit: `opacity 1 → 0`, 150ms via `AnimatePresence`
- **Completion signal**: Use Motion's `onAnimationComplete` callback on the blur-up `motion.div` — not image `onLoad` (which fires for blur placeholder data URLs in `next/image`)

## Scoping Strategy

Only newly added bookmarks animate. Existing cards have zero overhead.

### Tracking Set: `animatingBookmarkUrls`

New Zustand state in `useLoadersStore` — a `Set<string>` keyed by URL throughout the entire animation lifecycle:

- **Add**: URL added to Set in `onMutate` (optimistic creation)
- **Remove**: URL removed when blur-up `onAnimationComplete` fires, or on error
- **Empty on page load**: Server-loaded bookmarks never enter the Set
- **Clear on navigation**: Set cleared on route changes to avoid stale entries

URL-only keying (no swap to ID) avoids the race condition where React Query cache invalidation replaces the optimistic entry with server data mid-animation. The `AnimatedBookmarkCard` wrapper matches by `post.url` which is stable across the optimistic → real transition.

**Atomic actions:**

```typescript
addAnimatingBookmark: (url: string) => void
removeAnimatingBookmark: (url: string) => void
clearAnimatingBookmarks: () => void
```

### Error Cleanup

When `onError` fires in the mutation hook (rollback), the URL is removed from `animatingBookmarkUrls`. This prevents leaked entries for failed adds.

### AnimatedBookmarkCard Wrapper

A thin wrapper that checks `animatingBookmarkUrls.has(post.url)`:

- **In Set**: Wraps content in `motion.div` + `AnimatePresence` for animations
- **Not in Set**: Renders plain `BookmarkCard` — no Motion components, zero overhead

Multiple rapid adds: each bookmark gets its own entry, animates independently.

### Virtualization Compatibility

All four views use `@tanstack/react-virtual`. When a card scrolls out of the viewport, the virtualizer unmounts it.

**Strategy**: Only animate on first mount after add. Track a `mountedAnimatingUrls` ref (not state) alongside the Set. When a card mounts:

- If URL is in `animatingBookmarkUrls` AND not in `mountedAnimatingUrls` → animate entry, add to ref
- If URL is in `animatingBookmarkUrls` AND already in `mountedAnimatingUrls` → skip entry animation, still do content crossfades
- Content crossfades (text, image blur-up) are driven by data changes, not mount/unmount, so they work naturally with virtualization

### Memo Compatibility

`BookmarkCard` (memo'd) and `ImgLogic` (custom `arePropsEqual`) re-render when `img`/`blurUrl` props change. React Query cache invalidation propagates through the `useInfiniteQuery` selector → component tree → prop changes, so memo does not block animation triggers. The wrapper checks the Zustand set directly (not via props), avoiding memo interference.

## Rendering Pipeline

The animation wrapper inserts at the `Option` component level (`src/pageComponents/dashboard/cardSection/option.tsx`), not around `BookmarkCard` directly. The rendering chain is:

```text
CardSection → ListBox → Option (li) → item.rendered → BookmarkCard
```

The `Option` component renders the `<li>` element. The `motion.div` wraps inside this `<li>`, around `item.rendered`. This gives `AnimatePresence` control over the mount/unmount lifecycle at the correct level.

**Public/Discover page**: `PublicMoodboardVirtualized` bypasses `ListBox`/`Option` — no animation needed there (no add-bookmark flow on public pages).

## Technical Decisions

### Library: Motion v12+ (`motion/react`)

Already installed (`motion@12.38.0`). Used in 5 existing files.

- `AnimatePresence` handles content crossfades naturally
- Declarative state-driven animations via `animate` prop
- Built-in `useReducedMotion()` for accessibility
- `onAnimationComplete` for lifecycle signals

### Bundle Optimization

Dynamic import the animation wrapper — Motion is already in the bundle for some pages, but the card animation code only loads when a user actually triggers an add-bookmark action.

### Reduced Motion

Respect `prefers-reduced-motion: reduce`. When active:

- No entry animation (card appears instantly)
- No text crossfade (content swaps instantly)
- No image blur-up (image appears directly)
- Use `useReducedMotion()` from Motion

## Files to Modify

- `src/store/componentStore.ts` — Add `animatingBookmarkUrls` Set + atomic actions
- `src/async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation.ts` — Add URL on mutate, remove on error
- `src/pageComponents/dashboard/cardSection/option.tsx` — Insert animation wrapper at `<li>` level
- `src/pageComponents/dashboard/cardSection/bookmarkCard.tsx` — Add text crossfade `AnimatePresence` for title/description
- `src/pageComponents/dashboard/cardSection/imageCard.tsx` — Add blur-up animation with `onAnimationComplete` cleanup
- New: `src/components/ui/recollect/animated-bookmark-card.tsx` — Animation wrapper component

## Out of Scope

- Animating bookmark deletion/removal
- Animating reordering or drag-and-drop
- Animating bulk import
- Enrichment progress indicator (status bar or percentage)
- Public/Discover page animations (no add-bookmark flow)
