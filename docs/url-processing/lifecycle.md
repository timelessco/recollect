# Bookmark Card — How It Decides What Image To Show

**Start here.** This is the plain-English tour of how a bookmark's image tile gets filled in: from the moment a URL enters the system to the moment you see an image, a spinner, or a "cannot fetch" message.

For the dense engineering reference (every file:line, every state transition, every server write), see `lifecycle-reference.md`.

---

## 1. The Three Things You Can See

A bookmark card has one image tile. That tile is always in one of three visible states:

```text
 ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
 │                      │   │                      │   │                      │
 │   [ actual image ]   │   │    ⟳  spinner        │   │       (broken)       │
 │                      │   │                      │   │                      │
 │                      │   │  Getting screenshot  │   │  Cannot fetch image  │
 │                      │   │                      │   │  for this bookmark   │
 └──────────────────────┘   └──────────────────────┘   └──────────────────────┘
       SUCCESS                  WORKING ON IT                 GAVE UP
```

The whole point of this document is: **which of the three do we show, and why?**

---

## 2. What The Card Is Actually Checking

Before each render, the card asks itself six questions. Think of these as the six "knobs" on a radio:

| #   | Question the card asks                                                                 | Possible answers                                      | Where the answer comes from           |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| 1   | Is this bookmark's ID **optimistic** (not yet saved) or **real** (server gave us one)? | negative number (optimistic) · positive number (real) | react-query cache                     |
| 2   | Do we have an **image URL** for it?                                                    | yes · no                                              | the bookmark row's `ogImage` field    |
| 3   | Is this bookmark in the **"currently being processed" set**?                           | yes · no                                              | the Zustand `loadingBookmarkIds` set  |
| 4   | Was this URL **just added**, so should it animate in?                                  | yes · no (one-shot; consumed on first render)         | the in-memory `recentlyAddedUrls` set |
| 5   | Has this card instance **decided to animate**?                                         | not-yet · yes · no (sticky once decided)              | a React ref inside the card           |
| 6   | Did the `<Image>` tag **fail to load** the URL?                                        | yes · no                                              | Next.js `<Image onError>`             |

Combine these six answers and you get the card's current situation. Combine the situation with the render tree in §4 and you get which of the three visible states appears.

---

## 3. How A Bookmark Gets Added — Four Routes In

Bookmarks don't all arrive the same way. Think of it like a mailroom with four doors:

```text
 ┌─────────────────────────────────────────────────────────────────────┐
 │                                                                     │
 │   Door A:  User types / pastes a URL in the app                     │
 │            ────────────────────────────────────────                 │
 │            Fast path: optimistic card appears immediately.          │
 │            Server scrapes Open Graph, maybe takes a screenshot,     │
 │            fills in the image later.                                │
 │                                                                     │
 │   Door B:  User drops / pastes / picks a file (image, PDF, audio…)  │
 │            ────────────────────────────────────────                 │
 │            Optimistic card appears. File is already in R2 storage   │
 │            before the DB row exists. Image URL is known upfront     │
 │            for most file types.                                     │
 │                                                                     │
 │   Door C:  Chrome extension pushes a batch                          │
 │            ────────────────────────────────────────                 │
 │            Twitter / Instagram / Raindrop CSV / Chrome bookmarks.   │
 │            No optimistic card. Rows appear only after a refetch.    │
 │            Background worker fills in the image later.              │
 │                                                                     │
 │   Door D:  Yesterday's leftovers                                    │
 │            ────────────────────────────────────────                 │
 │            Not a door, a state. A bookmark added in a previous      │
 │            session that the pipeline gave up on. When you open      │
 │            the app today, these show up with no image and no        │
 │            active processing.                                       │
 │                                                                     │
 └─────────────────────────────────────────────────────────────────────┘
```

The four doors behave differently enough that each has its own bugs. See §5.

---

## 4. What The Card Decides (Plain-English Render Tree)

Every render, the card walks through this decision tree top-to-bottom:

```text
 START
   │
   ├─► Is this card allowed to show an image at all?
   │   (list view with cover images disabled, etc.)
   │   └─► NO  → render nothing
   │
   ├─► Do we have an image URL, AND did <Image> just fail on it?
   │   └─► YES → show "Cannot fetch image for this bookmark"    ← TERMINAL
   │
   ├─► First time this card has rendered?
   │   (check if it was "just added" — one-shot flag)
   │   └─► YES → remember: this card should animate
   │       NO  → remember: this card should NOT animate
   │
   │   (also: if we notice the card is currently in the
   │    "being processed" set, flip it to animate anyway)
   │
   ├─► Is it on the ANIMATED PATH?
   │   │
   │   └─► YES → preload the image in memory first
   │              │
   │              ├─► preload succeeded → fade the image in
   │              ├─► preload failed    → show "Cannot fetch…"
   │              └─► still preloading  → show "Getting screenshot"
   │
   │   └─► NO  → non-animated path
   │              │
   │              ├─► no image URL      → show "Getting screenshot"
   │              └─► have an image URL → render it directly
   │                                      (onError here also leads
   │                                       to "Cannot fetch…")
```

The two places that can reach "Cannot fetch" both depend on the same thing: **an image URL exists and the browser tried to load it and failed.** If there's no image URL at all, "Cannot fetch" can't fire — you get stuck on "Getting screenshot".

That single fact is the root of almost every bug on this page.

---

## 5. Four Known Bugs (The Stories)

### Bug 1 — The tiny racing gap right after the server replies

**Scenario:** you paste a URL. Optimistic card appears. A few hundred milliseconds later the server answers.

**What happens internally:**

```text
t=0  You press Enter
t=1  Optimistic card shows "Getting screenshot"   ✓ correct
t=2  (a few hundred ms of network)
t=3  Server replies. Card remounts with a real ID.
     For a brief moment: id is real, no image yet,
     not in the "being processed" set.
     (Two HEAD requests then run to figure out if it's
     an image URL, PDF, audio, etc.)
t=4  Only *now* does the card get added to the
     "being processed" set and the screenshot mutation fires.
t=5  Eventually image arrives.
```

**Why it matters:** between t=3 and t=4 the card looks — to the client — like it's _done_ even though nothing has actually started yet. Today that's fine because we route through the animation path and the animation path shows "Getting screenshot" when there's no image. But if we ever add a rule like _"real ID + no image + not in the set = show Cannot fetch"_ we'd flash the wrong message for half a second.

### Bug 2 — File uploads have no safety net

**Scenario:** you drop an image file. Upload to R2 succeeds in the background. Server creates the row.

**What happens internally:** the mutation hook for file uploads **never** adds the bookmark to the "currently being processed" set. The card depends entirely on the "just added, should animate" flag. That flag is in-memory only — if you refresh the page mid-upload, it's gone, and the card falls through to the non-animated path.

**Result:** on a page refresh you'd see a stuck "Getting screenshot" card with no way to tell it's still working versus dead.

### Bug 3 — The Chrome import ghosts

**Scenario:** you click "Import Chrome bookmarks" in the extension. Server queues 200 bookmarks. A background worker starts taking screenshots one at a time.

**What happens internally:** imports from Chrome, Twitter, Instagram, and Raindrop **bypass the app's mutation system entirely**. No optimistic card. No "just added" flag. No "being processed" entry. The web app doesn't even know these bookmarks exist until the next list refetch happens.

Twitter / Instagram / Raindrop usually send an image URL with the bookmark, so you see the image right away. **Chrome imports don't** — Chrome's export format has no images. These rows arrive with no image, no animation hint, no way to tell they're being worked on.

**Result:** Chrome-imported bookmarks sit on "Getting screenshot" until the worker eventually backfills them. This is the exact bug originally reported in Slack.

### Bug 4 — Yesterday's abandoned bookmarks

**Scenario:** you added a bookmark yesterday. The screenshot service was down. The row was saved with no image.

**What happens internally:** both the "being processed" set (Zustand) and the "just added" set are **in-memory only**. They don't survive a page refresh. Today when you open the app, the failed bookmark from yesterday hydrates from the server with no image, no animation hint, and no active processing.

**Result:** "Getting screenshot" forever. The pipeline gave up yesterday; the card will never know.

---

## 6. Why Is This Hard? The One-Paragraph Answer

The reason we can't just "show 'Cannot fetch' when there's no image" is that **four different real situations all look identical to the client:**

```text
  Same signature — opposite meanings
  ──────────────────────────────────
  real ID · no image · not processing · no load error
        │
        ├── Situation A: Bug 1 race window       → should say "Getting screenshot"
        ├── Situation B: Chrome import queued    → should say "Getting screenshot"
        ├── Situation C: failed this session     → should say "Cannot fetch"
        └── Situation D: failed previous session → should say "Cannot fetch"
```

With today's schema, there's no field on the bookmark row that says _"the pipeline gave up"_. `enrichment_status` exists but no code ever writes it. `last_error` lives in a queue internal table the web app never reads. `<Image onError>` can't fire when there's no image URL to begin with.

---

## 7. Three Ways To Fix It

| Option                                 | What it is                                                                                                                                    | Upside                                                | Downside                                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Client-only, small**             | Close Bug 1 by moving the "add to processing set" call earlier, then restore a rule like _"not in set AND no image = Cannot fetch"_.          | Small change, few files.                              | Brings back the Slack bug — Chrome imports will flash "Cannot fetch" during the import.                                                                                     |
| **B — Client-only, with a time fudge** | Option A, but add _"…unless the bookmark was inserted less than N seconds ago"_.                                                              | Covers Chrome imports too.                            | Arbitrary N. Stale loaders on genuinely failed bookmarks. Fragile.                                                                                                          |
| **C — Schema change (proper fix)**     | Add a `screenshot_status` column on the bookmark row. Pipeline writes `'success'` / `'failed'` at every terminal point. Client just reads it. | Single source of truth. Closes all four bugs cleanly. | Touches every endpoint that inserts or enriches a bookmark (see `lifecycle-reference.md` §13.1 for the full writer checklist). Plus a backfill migration for existing rows. |

Iteration 2 flagged **Option C** as the proper long-term fix. The team hasn't chosen yet.

---

## 8. What's Already Shipped

Two iterations of the copy work already merged:

- **Iteration 1** — Removed the three old rotating strings ("Fetching data…", "Taking screenshot…", etc.). Every intermediate render now says _"Getting screenshot"_.
- **Iteration 2** — Brought _"Cannot fetch image for this bookmark"_ back, but only on the one event where we know for certain an image URL exists and failed to load: Next.js `<Image onError>`.

The four bugs in §5 are what remains.

---

## 9. Where To Go Next

| You want to…                                                          | Read                             |
| --------------------------------------------------------------------- | -------------------------------- |
| Trace exactly what fires where, in which callback, with file:line     | `lifecycle-reference.md` §5 + §7 |
| See the full field-by-field table of what each server endpoint writes | `lifecycle-reference.md` §6      |
| See every cache invalidation, optimistic update, or cancel            | `lifecycle-reference.md` §12     |
| Choose between Options A / B / C with full context                    | `lifecycle-reference.md` §13     |
| Look up where a function/file is defined                              | `lifecycle-reference.md` §14     |
| Understand the URL validation regex (separate concern)                | `url-validation.md`              |

---

## 10. Glossary

| Term in the code     | Plain-English meaning                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `ogImage`            | the bookmark's image URL                                                                  |
| `loadingBookmarkIds` | "currently being processed" set (Zustand)                                                 |
| `recentlyAddedUrls`  | "just added, should animate" one-shot set                                                 |
| `tempId`             | the negative ID given to a bookmark before the server assigns a real one                  |
| `shouldAnimateRef`   | the sticky "this card decided to animate" flag                                            |
| `<Image onError>`    | the browser event when an image URL fails to load                                         |
| "optimistic row"     | the fake bookmark we insert into the list cache before the server has replied             |
| "pgmq"               | Postgres Message Queue — the queue system background workers consume from                 |
| "enrichment"         | all the stuff done after initial insert: OG scrape, screenshot, blurhash, AI caption, OCR |
