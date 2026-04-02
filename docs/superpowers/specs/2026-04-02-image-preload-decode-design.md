# Image Preload: Replace Event Listeners with `Image.decode()`

## Problem

`AnimatedBookmarkImage` in `src/pageComponents/dashboard/cardSection/animatedBookmarkImage.tsx` uses a `useEffect` with manual `addEventListener`/`removeEventListener` on a `new Image()` element to preload bookmark images before crossfading them in. The event listener setup/cleanup is boilerplate that can be simplified.

## Solution

Replace the event listener pattern with the browser's `HTMLImageElement.decode()` API, which returns a Promise that resolves when the image is fully loaded **and** decoded (ready to paint with zero first-frame jank).

### Before (lines 115-130)

```ts
useEffect(() => {
  if (!img) return;
  const preload = new window.Image();
  const onReady = () => {
    setDisplaySrc(img);
  };
  preload.addEventListener("load", onReady);
  preload.addEventListener("error", onReady);
  preload.src = img;
  return () => {
    preload.removeEventListener("load", onReady);
    preload.removeEventListener("error", onReady);
  };
}, [img]);
```

### After

```ts
useEffect(() => {
  if (!img) return;
  let cancelled = false;
  const preload = new window.Image();
  preload.src = img;
  preload.decode().then(
    () => {
      if (!cancelled) setDisplaySrc(img);
    },
    () => {
      if (!cancelled) setDisplaySrc(img);
    },
  );
  return () => {
    cancelled = true;
  };
}, [img]);
```

## Scope

- **Single file**: `src/pageComponents/dashboard/cardSection/animatedBookmarkImage.tsx`
- **Lines affected**: 112-130 (the useEffect block + preceding comment)
- **No other files touched**

## What changes

- 4 lines of `addEventListener`/`removeEventListener` → 2 lines of `decode().then()`
- Cleanup: remove listeners → set `cancelled` boolean flag
- `decode()` resolves after download + decode (strictly better than `load` event which only guarantees download)
- Remove the comment about `displaySrc` being intentionally omitted from deps (the `cancelled` flag handles stale closures cleanly)

## What stays identical

- `useEffect` dependency array (`[img]`)
- `displaySrc` state and its `null | string` type
- `isPreloading` derivation
- All AnimatePresence crossfade behavior (placeholder exit 0.15s → image enter 0.3s)
- `BookmarkImage`, `LoaderImgPlaceholder`, `imageCard.tsx` — unchanged

## Browser support

`HTMLImageElement.decode()` is supported in all modern browsers (Chrome 64+, Firefox 68+, Safari 11.1+). No polyfill needed.
