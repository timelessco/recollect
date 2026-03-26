---
title: "feat: Bookmark Upload State Animations"
type: feat
status: completed
date: 2026-03-26
---

## Overview

Add smooth crossfade and blur-up animations to bookmark upload state transitions using Motion v12+ (already installed). Only newly added URL bookmarks animate — existing cards and file uploads are unaffected. Applies to all four views (Card, List, Moodboard, Timeline).

**Design spec**: `docs/superpowers/specs/2026-03-26-bookmark-upload-state-animations-design.md`

## Problem Statement

When a user adds a bookmark, the card snaps through 5 states with no visual transitions. Content appears abruptly — placeholder text jumps to real title, images pop in with no reveal. This feels jarring compared to the polished interactions elsewhere in the app.

## Proposed Solution

Wrap newly added bookmark cards in a thin Motion animation layer that:

1. Fades + slides the card in on initial mount
2. Crossfades placeholder text to real title/description
3. Blur-up reveals the image (ogImage or screenshot)
4. Self-removes when animation completes, leaving zero overhead on the card

Track animating bookmarks via a URL-keyed Zustand `Set<string>`. Cards not in the set render with no Motion components.

## Technical Approach

### State Machine

```text
ENTERING → FETCHING → LOADED → PROCESSING_IMAGE → COMPLETE
                                     ↓ (audio/direct image)
                               LOADED → COMPLETE
```

State is derived centrally via a pure function — not computed ad-hoc in each component:

```typescript
function getBookmarkAnimationState(
  post: SingleListData,
  animatingUrls: Set<string>,
  loadingIds: Set<number>,
): "entering" | "fetching" | "loaded" | "processing" | "complete" | "none";
```

- `none`: URL not in `animatingUrls` → no animation (existing cards)
- `entering`: URL in set, `post.id` is nil → optimistic, just mounted
- `fetching`: URL in set, `post.id` is nil, past first render → waiting for API
- `loaded`: URL in set, `post.id` exists → min-data arrived
- `processing`: URL in set, `post.id` in `loadingIds` → screenshot/thumbnail in progress
- `complete`: URL in set, `post.id` exists, not in `loadingIds`, has image → ready for blur-up

### Key Design Decisions

| Decision               | Choice                                                                      | Why                                                                                      |
| ---------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Tracking key           | URL (string) throughout                                                     | Avoids race condition with React Query cache invalidation swapping optimistic→real entry |
| Cleanup trigger        | `onAnimationComplete` on blur-up motion.div                                 | Ensures animation finishes before wrapper is removed                                     |
| Fallback cleanup       | Screenshot mutation `onSettled` + 10s timeout                               | Handles no-image cases where blur-up never fires                                         |
| `mountedAnimatingUrls` | Module-scoped `Set<string>` (not component ref)                             | Survives virtualization unmount/remount                                                  |
| Text crossfade key     | `!!post.id` (optimistic vs real)                                            | Stable signal — switches once when server data arrives                                   |
| Dual system            | Animation wrapper supersedes `LoaderImgPlaceholder` for animating bookmarks | Avoids two systems fighting over the same visual region                                  |
| File uploads           | Out of scope (v1)                                                           | URL-keyed tracking can't distinguish simultaneous file uploads (`url: ""`)               |
| Dynamic import         | Preload chunk in `onMutate`, render via `next/dynamic`                      | Avoids flash of unstyled content — chunk loads before optimistic card mounts             |
| Route change clear     | Non-shallow changes only                                                    | Shallow changes (lightbox open) should not kill animations                               |
| Entry animation        | Same values across all views                                                | Tune per-view later if needed                                                            |

## Implementation Phases

### Phase 1: Zustand Store Extension

**Files:**

- `src/types/componentStoreTypes.ts` — Add types to `LoadersStoreState`
- `src/store/componentStore.ts` — Add state + actions to `useLoadersStore`

**Changes:**

Add to `LoadersStoreState` interface:

```typescript
animatingBookmarkUrls: Set<string>;
addAnimatingBookmark: (url: string) => void;
removeAnimatingBookmark: (url: string) => void;
clearAnimatingBookmarks: () => void;
```

Follow existing pattern from `loadingBookmarkIds`:

- Add: `new Set([...state.animatingBookmarkUrls, url])`
- Remove: clone set, `.delete(url)`, return new set
- Clear: `new Set<string>()`

### Phase 2: State Derivation Utility

**Files:**

- New: `src/utils/getBookmarkAnimationState.ts`

Create a pure function that derives the animation state from bookmark data + store state. This centralizes logic that would otherwise be spread across 3+ components.

Takes: `post` (SingleListData), `animatingUrls` (Set<string>), `loadingIds` (Set<number>)
Returns: `"entering" | "fetching" | "loaded" | "processing" | "complete" | "none"`

Logic:

1. If `!animatingUrls.has(post.url)` → `"none"`
2. If `isNil(post.id)` → `"entering"` (optimistic, no server data yet)
3. If `post.id` exists and `loadingIds.has(post.id)` → `"processing"`
4. If `post.id` exists and has image (`post.ogImage` or `post.meta_data?.ogImgBlurUrl`) → `"complete"`
5. If `post.id` exists → `"loaded"` (has min-data but no image yet)

Note: `"fetching"` is visually identical to `"entering"` (both show placeholder) — the distinction exists for the state model but both render the same way. So in practice, `"entering"` covers both.

### Phase 3: Animation Wrapper Component

**Files:**

- New: `src/components/ui/recollect/animated-bookmark-card.tsx`

A thin wrapper that conditionally adds Motion animations:

```typescript
// Pseudocode structure
function AnimatedBookmarkCard({ url, children }) {
  const isAnimating = useLoadersStore(s => s.animatingBookmarkUrls.has(url));
  const shouldReduceMotion = useReducedMotion();

  if (!isAnimating || shouldReduceMotion) return children;

  const hasPlayed = mountedAnimatingUrls.has(url);
  if (!hasPlayed) mountedAnimatingUrls.add(url);

  return (
    <motion.div
      initial={hasPlayed ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

**Module-scoped `mountedAnimatingUrls`**: A `Set<string>` defined at module scope (outside the component). Prevents re-playing entry animation on virtualization re-mount. Cleared when `clearAnimatingBookmarks()` is called — add a subscription or export a `clearMountedAnimatingUrls()` function called alongside it.

**Dynamic import**: Export a `preloadAnimatedBookmarkCard()` function that calls `import('./animated-bookmark-card')`. Called in `onMutate` to warm the chunk before the optimistic card mounts.

### Phase 4: Mutation Hook Integration

**Files:**

- `src/async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation.ts`
- `src/async/mutationHooks/bookmarks/useAddBookmarkScreenshotMutation.ts`

**In `useAddBookmarkMinDataOptimisticMutation`:**

`onMutate` (around line 53):

```typescript
useLoadersStore.getState().addAnimatingBookmark(data.url);
preloadAnimatedBookmarkCard(); // fire-and-forget chunk preload
```

`onError` (around line 122):

```typescript
useLoadersStore.getState().removeAnimatingBookmark(variables.url);
```

**In `useAddBookmarkScreenshotMutation`:**

`onSettled` (around line 26-34) — add fallback cleanup:

```typescript
// After removeLoadingBookmarkId and invalidateQueries
useLoadersStore.getState().removeAnimatingBookmark(variables.url);
```

This handles the case where the screenshot API succeeds but there's no image to blur-up (or it fails). The URL is removed from the set whether blur-up fired or not.

**Timeout fallback**: For paths that skip screenshot entirely (audio, direct image) and have no blur-up `onAnimationComplete`, the URL is already cleaned up because:

- Audio: `onSettled` returns early before adding to `loadingBookmarkIds`. The ogImage is the fallback image, so blur-up fires → `onAnimationComplete` removes it.
- Direct image: Same — ogImage exists, blur-up fires.
- If for some edge case neither fires, add a 10s `setTimeout` in `onSettled` as a safety net:

```typescript
setTimeout(() => {
  useLoadersStore.getState().removeAnimatingBookmark(url);
}, 10_000);
```

### Phase 5: Text Crossfade in BookmarkCard

**Files:**

- `src/pageComponents/dashboard/cardSection/bookmarkCard.tsx`

Inside `BookmarkCardInner`, check animation state and conditionally wrap title+description in `AnimatePresence`:

**For card/moodboard/timeline view** (around lines 211-239):

```tsx
<AnimatePresence mode="wait">
  {isAnimating && !post.id ? (
    <motion.div key="placeholder" exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
      {/* Placeholder skeleton or "Fetching data..." text */}
    </motion.div>
  ) : (
    <motion.div
      key="content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Existing title, description, tags content */}
    </motion.div>
  )}
</AnimatePresence>
```

**For list view** (around lines 164-179): Same pattern, wrapping the text section.

**Key**: `!!post.id` determines the switch — `undefined` (optimistic) vs number (real data). This is a single, stable transition point.

The `BookmarkCardInner` needs to know if this is an animating bookmark. Options:

- Read `animatingBookmarkUrls.has(post.url)` from Zustand directly inside the component
- This is fine because `BookmarkCard` is memo'd with default shallow compare — the Zustand subscription is inside the component, so it re-renders independently of props

### Phase 6: Image Blur-Up in imageCard.tsx

**Files:**

- `src/pageComponents/dashboard/cardSection/imageCard.tsx`

**In `ImgLogic`** (around lines 100-117):

For animating bookmarks (check `animatingBookmarkUrls.has(url)` — need to thread `url` from parent or derive from bookmark data in the store):

Wrap the `<Image>` in a `motion.div` with blur filter:

```tsx
<motion.div
  initial={{ filter: "blur(20px)", opacity: 0 }}
  animate={{ filter: "blur(0px)", opacity: 1 }}
  transition={{ duration: 0.4, ease: "easeOut" }}
  onAnimationComplete={() => {
    removeAnimatingBookmark(url);
    clearMountedAnimatingUrls(url); // cleanup module-scoped ref
  }}
>
  <Image ... />
</motion.div>
```

**For non-animating bookmarks**: Render `<Image>` directly as today — no motion.div wrapper.

**Placeholder exit**: The existing `LoaderImgPlaceholder` renders when `isLoading && isNil(id)`. For animating bookmarks, wrap this in `AnimatePresence` so the placeholder fades out (150ms) when the image starts loading.

**Threading `url` to ImgLogic**: `ImgLogic` currently receives `id`, `img`, `blurUrl`, etc. but not `url`. Options:

- Add `url` prop to `ImgLogic` (passed from `BookmarkOgImage` → `ImgLogic`)
- Or read the URL from the bookmark data in `BookmarkCard` and pass down

Adding `url` as a prop is cleaner. Update the `arePropsEqual` comparator (lines 125-136) to include `url`.

### Phase 7: Option Component Integration

**Files:**

- `src/pageComponents/dashboard/cardSection/option.tsx`

Wrap `{item.rendered}` (line 140) in the `AnimatedBookmarkCard`:

```tsx
<AnimatedBookmarkCard url={url}>{item.rendered}</AnimatedBookmarkCard>
```

The `url` prop is already available in `Option` (line 44).

### Phase 8: Route Change Cleanup

**Files:**

- `src/pageComponents/dashboard/cardSection/listBox.tsx` (or the existing route-change effect location)

Add a `useEffect` that clears `animatingBookmarkUrls` and `mountedAnimatingUrls` on non-shallow route changes:

```typescript
useEffect(() => {
  // Clear animation state on category/route change
  clearAnimatingBookmarks();
  clearMountedAnimatingUrls();
}, [categorySlug]); // categorySlug changes on real navigation, not lightbox shallow changes
```

Using `categorySlug` (which already drives virtualizer scroll-to-top at line 152) instead of `router.asPath` avoids clearing on shallow route changes (lightbox open/close).

### Phase 9: Verification

1. `pnpm fix` — auto-fix lint/format
2. `pnpm lint` — all quality checks
3. `pnpm lint:knip` — verify no unused exports/code introduced
4. `pnpm build` — confirm build passes

**Manual testing checklist:**

- [ ] Add URL bookmark in Card view — observe fade+slide entry, text crossfade, image blur-up
- [ ] Add URL bookmark in List view — same animations at smaller scale
- [ ] Add URL bookmark in Moodboard view — check no layout stutter with masonry
- [ ] Add URL bookmark in Timeline view — verify animations work
- [ ] Add bookmark with no ogImage — verify screenshot path animates, URL cleaned up
- [ ] Add audio URL — verify skips PROCESSING_IMAGE, blur-up on fallback image
- [ ] Add PDF URL — verify "Generating thumbnail..." text, thumbnail blur-up
- [ ] Rapid-add 3 URLs — each animates independently
- [ ] Error case (invalid URL) — card disappears, no leaked animation state
- [ ] Scroll card out of viewport mid-animation, scroll back — no re-entry animation
- [ ] Switch category mid-animation — animation state cleared
- [ ] Open lightbox mid-animation — animation continues (shallow route, not cleared)
- [ ] Enable `prefers-reduced-motion: reduce` — all animations disabled, content swaps instantly
- [ ] File upload (drag-drop image) — no animation (out of scope, renders normally)

## Acceptance Criteria

- [ ] Newly added URL bookmarks fade in + slide down on mount (300ms)
- [ ] Placeholder text crossfades to real title/description (~350ms)
- [ ] Image blur-up reveals from blur(20px) to sharp (400ms)
- [ ] Only the uploading bookmark(s) animate — existing cards are unaffected
- [ ] Animation lifecycle self-cleans (URL removed from Set on completion)
- [ ] `prefers-reduced-motion: reduce` disables all animations
- [ ] No animation on page load, navigation, or file upload
- [ ] Works in all 4 views (Card, List, Moodboard, Timeline)
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes

## Dependencies & Risks

**Dependencies:**

- Motion v12.38.0 (already installed)
- `@tanstack/react-virtual` (existing) — virtualization compatibility verified in design

**Risks:**

- **Moodboard layout shift**: Inserting a card at index 0 causes the virtualizer to recalculate lanes. The 12px slide animation may look uncoordinated with the layout shift. Mitigation: test and tune `y` value if needed.
- **Memo interference**: `ImgLogic` has custom `arePropsEqual` — adding `url` prop requires updating the comparator. Forgetting this would block blur-up animation triggers.
- **Simultaneous `key={undefined}`**: Two rapid adds create two optimistic entries with `key={undefined}` in React Aria's `Item` list. This is a pre-existing issue, not introduced by this feature. The animation wrapper uses `post.url` (unique), not React key.

## References

- Design spec: `docs/superpowers/specs/2026-03-26-bookmark-upload-state-animations-design.md`
- Upload flow docs: `docs/UPLOAD_FLOW.md`
- Existing Motion patterns: `src/components/ui/recollect/animated-size.tsx`, `src/pageComponents/dashboard/dashboardLayout/header-options-popover.tsx`
- Zustand store: `src/store/componentStore.ts`
- Mutation hooks: `src/async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation.ts`, `src/async/mutationHooks/bookmarks/useAddBookmarkScreenshotMutation.ts`
- Card rendering: `src/pageComponents/dashboard/cardSection/option.tsx` (line 140), `src/pageComponents/dashboard/cardSection/bookmarkCard.tsx`, `src/pageComponents/dashboard/cardSection/imageCard.tsx`
