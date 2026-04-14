# URL Validation & Normalization

Everything about shape-checking a URL string, normalizing its protocol, pulling out its hostname, and the allow/skip lists that govern Open Graph scraping. Scoped to client + shared utilities. For what happens to a URL after validation (the lifecycle, screenshots, placeholder copy), see `lifecycle.md`.

---

## 1. Regex Patterns

All three live in `src/utils/constants.ts`.

### `URL_PATTERN`

```regex
/^(https?:\/\/)?(www\.)?[\da-z-]+(\.[\da-z-]+)*\.[a-z]{2,}(?::\d{1,5})?(\/\S*)?$/iu
```

Used in `react-hook-form` validation on the Add Bookmark form and for clipboard paste detection.

| Part             | Matches                                 |
| ---------------- | --------------------------------------- |
| `(https?:\/\/)?` | optional `http://` or `https://`        |
| `(www\.)?`       | optional `www.`                         |
| `[\da-z-]+`      | domain label (digits, letters, hyphens) |
| `(\.[\da-z-]+)*` | optional subdomains                     |
| `\.[a-z]{2,}`    | TLD (2+ letters)                        |
| `(?::\d{1,5})?`  | optional port                           |
| `(\/\S*)?`       | optional path/query/fragment            |
| flags `iu`       | case-insensitive + unicode              |

### `URL_IMAGE_CHECK_PATTERN`

```regex
/^http[^?]*.(jpg|jpeg|gif|png|tiff|bmp|webp|pdf|mp3|mp4)(\?(.*))?$/gimu
```

Quick heuristic check for direct-media URLs. The authoritative media-type check is a HEAD request via `getMediaType` (see §3).

### `URL_PDF_CHECK_PATTERN`

```regex
/https?:\/\/\S+?\.pdf(\?\S*)?(#\S*)?/iu
```

Used in the URL-add mutation to route PDFs into the client-side thumbnail pipeline (`handlePdfThumbnailAndUpload`).

---

## 2. Protocol Normalization

Every place that accepts a raw user URL uses the same rule: if it doesn't start with `http://` or `https://`, prepend `https://`.

Known callsites (all verified):

| File:line                                                                               | Context                  |
| --------------------------------------------------------------------------------------- | ------------------------ |
| `src/hooks/useAddBookmark.ts:16`                                                        | before submit            |
| `src/async/mutationHooks/bookmarks/use-add-bookmark-min-data-optimistic-mutation.ts:57` | inside `mutationFn`      |
| `src/utils/helpers.ts:134`                                                              | inside `getBaseUrl`      |
| `src/utils/helpers.ts:152`                                                              | URL normalization helper |
| `src/lib/bookmarks/add-bookmark-min-data.ts:86`                                         | server-side validation   |
| `src/lib/bookmarks/add-remaining-bookmark-data.ts:116`                                  | server-side validation   |

All use the correct form:

```typescript
if (!url.startsWith("http://") && !url.startsWith("https://")) {
  finalUrl = `https://${url}`;
}
```

> Older iterations of this doc mentioned a `||` vs `&&` logic bug — that code path was rewritten during the v2 migration. No longer applicable.

---

## 3. Helpers

### `src/utils/helpers.ts`

- **`getBaseUrl(href)`** — extract hostname. Normalizes protocol internally. Returns `""` on invalid input.
- **`checkIfUrlAnImage(url)`** — HEAD-request via `getMediaType`; returns `true` if `content-type` starts with `image/`.
- **`checkIfUrlAnMedia(url)`** — HEAD-request; returns `true` if content-type is in `acceptedFileTypes`.
- **`urlInputErrorText(errors)`** — format react-hook-form validation errors.

### `src/utils/url.ts`

- **`getCategorySlugFromRouter(router)`** — extract category slug from Next.js router path.

### `src/async/supabaseCrudHelpers/index.ts`

- **`getMediaType(url)`** — client-side wrapper around `GET /api/v2/bookmark/get-media-type` (returns `Content-Type` header from a server-side HEAD). URL is `encodeURIComponent`-encoded before the request.

---

## 4. Domain Allow / Skip Lists

All in `src/utils/constants.ts`.

### `OG_IMAGE_PREFERRED_SITES`

Sites where the OG Image tag is preferred over other metadata sources.

```typescript
export const OG_IMAGE_PREFERRED_SITES = [
  "cosmos",
  "pinterest",
  "savee.it",
  "are.na",
  "medium",
  "spotify",
  "imdb",
  "pin.it",
];
```

### `SKIP_OG_IMAGE_DOMAINS`

Sites where OG scraping is skipped entirely (typically bot-blocking sites).

```typescript
export const SKIP_OG_IMAGE_DOMAINS = ["amazon.in", "twitter.com", "x.com", "amazon.com"];
```

### `acceptedFileTypes`

MIME allow-list for file drops / URL-to-file promotion. Includes images, audio, video, documents. See `src/utils/constants.ts` around line 176.

---

## 5. Entry Points That Validate URLs

### Form field — `AddBookmarkDropdown`

`src/components/customDropdowns.tsx/addBookmarkDropdown.tsx` — `react-hook-form` field with `pattern: URL_PATTERN`. Keyboard shortcut `Cmd/Ctrl+K` opens the popover.

### Clipboard paste — global listener

`src/pageComponents/dashboard/bookmarkCards.tsx:64-96` attaches `paste` to `window`. Text is matched against `URL_PATTERN` in `src/async/uploads/clipboard-upload.ts`. If it matches, the URL-add mutation fires. If the paste contains files instead, the file-upload mutation fires.

### iframe embedding check

`src/async/uploads/iframe-test.ts` uses the native `URL` constructor and a protocol allow-list (`["http:", "https:"]`) inside `canEmbedInIframe`.

---

## 6. Server-side Validation

The v2 add-URL endpoint validates with Zod, not ad-hoc code. Media-type detection is a separate v2 endpoint the client hits.

| Endpoint                                      | File                                                     | Validator                            |
| --------------------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| `POST /api/v2/bookmark/add-bookmark-min-data` | `src/app/api/v2/bookmark/add-bookmark-min-data/route.ts` | Zod schema from adjacent `schema.ts` |
| `GET /api/v2/bookmark/get-media-type`         | `src/app/api/v2/bookmark/get-media-type/route.ts`        | Zod URL check                        |
| `POST /api/v2/bookmark/add-url-screenshot`    | `src/app/api/v2/bookmark/add-url-screenshot/route.ts`    | Zod                                  |

---

## 7. Common Tasks

### Validate a URL in a form

```typescript
import { URL_PATTERN } from "@/utils/constants";
import { useForm } from "react-hook-form";

const { register } = useForm();
register("url", { required: true, pattern: URL_PATTERN });
```

### Extract hostname

```typescript
import { getBaseUrl } from "@/utils/helpers";
getBaseUrl("https://example.com/path"); // "example.com"
```

### Detect media type

```typescript
import { getMediaType } from "@/async/supabaseCrudHelpers";
await getMediaType("https://example.com/file.pdf"); // "application/pdf"
```

### Add protocol if missing

```typescript
if (!url.startsWith("http://") && !url.startsWith("https://")) {
  url = `https://${url}`;
}
```

---

## 8. Test URLs

### Accepted by `URL_PATTERN`

```
https://example.com
http://example.com
www.example.com
example.com
sub.example.co.uk
example.com:8080
example.com/path?query=value#hash
```

### Rejected

```
example            (no TLD)
http://            (no domain)
ftp://example.com  (wrong protocol — URL_PATTERN doesn't match `ftp`)
example..com       (invalid domain)
```
