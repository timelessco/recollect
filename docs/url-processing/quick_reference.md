# Quick Reference: URL Processing in Recollect

## Key Files at a Glance

### URL Validation & Constants

- **`src/utils/constants.ts`** - Contains all URL regex patterns and configuration
  - `URL_PATTERN` - Main URL validation regex
  - `URL_IMAGE_CHECK_PATTERN` - Image/media file detection
  - `URL_PDF_CHECK_PATTERN` - PDF file detection
  - `OG_IMAGE_PREFERRED_SITES` - Domains for preferring OG images
  - `SKIP_OG_IMAGE_DOMAINS` - Domains to skip OG image scraping

### URL Parsing & Helpers

- **`src/utils/helpers.ts`**
  - `getBaseUrl(href)` - Extract hostname from URL
  - `checkIfUrlAnImage(url)` - Check if URL is image
  - `checkIfUrlAnMedia(url)` - Check if URL is media
  - `urlInputErrorText(errors)` - Format URL validation errors

- **`src/utils/url.ts`**
  - `getCategorySlugFromRouter(router)` - Extract category from route

### Components & Forms

- **`src/components/customDropdowns.tsx/addBookmarkDropdown.tsx`** - Main URL input form
  - Uses `react-hook-form` with `URL_PATTERN` validation
  - Keyboard shortcut: Cmd+K or Ctrl+K

- **`src/async/uploads/clipboard-upload.ts`** - Clipboard paste handling
  - Validates pasted URLs before creating bookmarks

### API Endpoints

- **`src/pages/api/bookmark/add-bookmark-min-data.ts`** (PRIMARY)
  - Creates bookmark with OG scraping
  - Validates permissions and duplicates
  - Scrapes metadata using `open-graph-scraper`

- **`src/pages/api/v1/bookmarks/get/get-media-type.ts`**
  - Returns Content-Type from URL HEAD request
  - Uses Zod validation for URL parameter

- **`src/pages/api/bookmark/add-remaining-bookmark-data.ts`**
  - Processes screenshots and thumbnails
  - Uploads images to R2 storage

- **`src/pages/api/v1/bookmarks/insert.ts`**
  - Bulk insert via API (uses Zod validation)

### CRUD & Mutations

- **`src/async/supabaseCrudHelpers/index.ts`**
  - `addBookmarkMinData()` - Client API call (HAS BUG in line 251)
  - `getMediaType()` - Fetch media type from endpoint

- **`src/async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation.ts`**
  - React Query mutation with optimistic updates
  - Handles screenshot/PDF thumbnail generation

### Security & Validation

- **`src/async/uploads/iframe-test.ts`**
  - `canEmbedInIframe()` - Check if URL can be embedded
  - Validates protocol and CSP headers

---

## URL Validation Regex Breakdown

```regex
/^(https?:\/\/)?(www\.)?[\da-z-]+(\.[\da-z-]+)*\.[a-z]{2,}(?::\d{1,5})?(\/\S*)?$/iu
```

| Part             | Matches                                 |
| ---------------- | --------------------------------------- |
| `(https?:\/\/)?` | Optional http:// or https://            |
| `(www\.)?`       | Optional <www>. prefix                  |
| `[\da-z-]+`      | Domain name (numbers, letters, hyphens) |
| `(\.[\da-z-]+)*` | Optional subdomains                     |
| `\.[a-z]{2,}`    | Required TLD (2+ letters)               |
| `(?::\d{1,5})?`  | Optional port (1-5 digits)              |
| `(\/\S*)?`       | Optional path                           |
| `iu`             | Flags: unicode, case-insensitive        |

---

## Data Flow: Create Bookmark

```tree
User Input
    ↓
AddBookmarkDropdown Component
    ├─ useForm validation (URL_PATTERN)
    └─ onSubmit → onAddBookmark(url)
    ↓
clipboardUpload or Direct Call
    ├─ Match against URL_PATTERN
    └─ Call addBookmarkMinData mutation
    ↓
useAddBookmarkMinDataOptimisticMutation
    ├─ Optimistic state update
    └─ API call
    ↓
POST /api/bookmark/add-bookmark-min-data
    ├─ Parse URL with new URL()
    ├─ Scrape OG data
    ├─ Check permissions
    ├─ Detect duplicates
    └─ Insert to DB
    ↓
Client receives ID
    ├─ Check media type
    ├─ Generate screenshot/thumbnail
    └─ POST /api/bookmark/add-remaining-bookmark-data
```

---

## Common URL Processing Tasks

### 1. Validate a URL in Form

```typescript
import { URL_PATTERN } from "@/utils/constants";
import { useForm } from "react-hook-form";

const { register } = useForm();
register("url", {
	required: true,
	pattern: URL_PATTERN,
});
```

### 2. Check if URL is Image

```typescript
import { checkIfUrlAnImage } from "@/utils/helpers";

const isImage = await checkIfUrlAnImage("https://example.com/image.jpg");
```

### 3. Get Hostname from URL

```typescript
import { getBaseUrl } from "@/utils/helpers";

const hostname = getBaseUrl("https://example.com/path");
// Returns: 'example.com'
```

### 4. Detect Media Type

```typescript
import { getMediaType } from "@/async/supabaseCrudHelpers";

const mediaType = await getMediaType("https://example.com/file.pdf");
// Returns: 'application/pdf'
```

### 5. Add Protocol if Missing

```typescript
const url = "example.com";
const finalUrl = url.startsWith("http") ? url : `https://${url}`;
```

---

## Known Issues

### Issue #1: Protocol Check Logic Error

**File:** `src/async/supabaseCrudHelpers/index.ts:251`

Current (WRONG):

```typescript
if (!url.startsWith("http") || !url.startsWith("https")) {
	finalUrl = `https://${url}`;
}
```

Problem: Always adds https:// because one condition is always true

- If URL is "http://...", then `!url.startsWith("http")` is FALSE
- But `!url.startsWith("https")` is TRUE, so || evaluates to TRUE

Should be:

```typescript
if (!url.startsWith("http://") && !url.startsWith("https://")) {
	finalUrl = `https://${url}`;
}
```

---

## API Response Types

### Add Bookmark Min Data Response

```typescript
{
  data: SingleListData[] | null;
  error: PostgrestError | VerifyErrors | string | null;
  message: string | null;
}
```

### Get Media Type Response

```typescript
{
	success: boolean;
	mediaType: string | null;
	error: string | null;
}
```

### Bulk Insert Response

```typescript
{
	success: boolean;
	error: string | null;
}
```

---

## Environment Constants

From `src/utils/constants.ts`:

| Constant                     | Purpose                                           |
| ---------------------------- | ------------------------------------------------- |
| `BASE_URL`                   | App base URL (localhost:3000 or production)       |
| `NEXT_API_URL`               | API route prefix: `/api`                          |
| `ADD_BOOKMARK_MIN_DATA`      | Endpoint: `/bookmark/add-bookmark-min-data`       |
| `GET_MEDIA_TYPE_API`         | Endpoint: `/v1/bookmarks/get/get-media-type`      |
| `ADD_REMAINING_BOOKMARK_API` | Endpoint: `/bookmark/add-remaining-bookmark-data` |

---

## Security Checklist

- [x] Protocol validation (HTTP/HTTPS only)
- [x] URL constructor validation
- [x] Authentication required
- [x] Authorization (category owner/collaborator)
- [x] Duplicate detection
- [x] Timeout protection (5 seconds)
- [x] CSP/X-Frame-Options validation
- [x] Zod schema validation on API endpoints

---

## Testing URLs

Valid URLs to test:

- `https://example.com`
- `http://example.com`
- `www.example.com`
- `example.com`
- `sub.example.co.uk`
- `example.com:8080`
- `example.com/path?query=value#hash`

Invalid URLs (will fail validation):

- `example` (no TLD)
- `http://` (no domain)
- `ftp://example.com` (wrong protocol)
- `example..com` (invalid domain)
