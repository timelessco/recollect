# URL Validation, Link Processing & Bookmark Creation - Code Analysis

## Overview

This document provides a comprehensive mapping of all URL validation, link processing, and bookmark creation logic in the Recollect codebase.

---

## 1. URL VALIDATION PATTERNS & REGEX

### Primary URL Validation Pattern

**File:** `/Users/navin/Developer/recollect/src/utils/constants.ts` (Line 23-24)

```typescript
// Supports any valid TLD (2+ characters)
export const URL_PATTERN =
	/^(https?:\/\/)?(www\.)?[\da-z-]+(\.[\da-z-]+)*\.[a-z]{2,}(?::\d{1,5})?(\/\S*)?$/iu;
```

**Pattern Breakdown:**

- `(https?:\/\/)?` - Optional HTTP/HTTPS protocol
- `(www\.)?` - Optional www prefix
- `[\da-z-]+(\.[\da-z-]+)*` - Domain name with subdomains
- `\.[a-z]{2,}` - TLD (2+ characters)
- `(?::\d{1,5})?` - Optional port number
- `(\/\S*)?` - Optional path

**Flag:** `iu` (unicode, case-insensitive)

### Other URL/Media Type Patterns

**File:** `/Users/navin/Developer/recollect/src/utils/constants.ts`

```typescript
// Image/Media URL detection
export const URL_IMAGE_CHECK_PATTERN =
	/^http[^?]*.(jpg|jpeg|gif|png|tiff|bmp|webp|pdf|mp3|mp4)(\?(.*))?$/gimu;

// PDF URL detection
export const URL_PDF_CHECK_PATTERN = /https?:\/\/\S+?\.pdf(\?\S*)?(#\S*)?/iu;
```

---

## 2. URL NORMALIZATION & PROTOCOL HANDLING

### Client-Side Normalization

**File:** `/Users/navin/Developer/recollect/src/async/supabaseCrudHelpers/index.ts` (Line 242-268)

Function: `addBookmarkMinData()`

```typescript
export const addBookmarkMinData = async ({
	url,
	category_id,
	update_access,
}: AddBookmarkMinDataPayloadTypes) => {
	try {
		// append https here
		let finalUrl = url;

		// BUG: Logical error - should use &&, not ||
		if (!url.startsWith("http") || !url.startsWith("https")) {
			finalUrl = `https://${url}`;
		}

		const apiResponse = await axios.post(
			`${NEXT_API_URL}${ADD_BOOKMARK_MIN_DATA}`,
			{
				url: finalUrl,
				category_id: isNull(category_id) ? 0 : category_id,
				update_access,
			},
		);

		return apiResponse as { data: { data: SingleListData[] } };
	} catch (error) {
		return error;
	}
};
```

**⚠️ BUG ALERT:** Line 251 has a logical error:

```typescript
if (!url.startsWith("http") || !url.startsWith("https")) {
```

This should be `&&` (AND), not `||` (OR). Currently, it will always add https:// because one of the conditions will always be true.

### Server-Side URL Parsing

**File:** `/Users/navin/Developer/recollect/src/utils/helpers.ts` (Line 106-125)

Function: `getBaseUrl()`

```typescript
export const getBaseUrl = (href: string): string => {
	if (typeof href !== "string" || href.trim() === "") {
		return "";
	}

	try {
		const normalizedHref =
			href.startsWith("http://") || href.startsWith("https://")
				? href
				: `https://${href}`;

		const url = new URL(normalizedHref);
		const baseUrl = `${url.host}`;

		return baseUrl;
	} catch (error) {
		console.error("Error parsing URL:", error);
		return "";
	}
};
```

**Purpose:** Extracts hostname from URL with proper protocol normalization

---

## 3. BOOKMARK CREATION FLOW

### Entry Point: AddBookmarkDropdown Component

**File:** `/Users/navin/Developer/recollect/src/components/customDropdowns.tsx/addBookmarkDropdown.tsx`

```typescript
const AddBookmarkDropdown = ({
  onAddBookmark,
  uploadFile,
}: AddBookmarkDropdownTypes) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    clearErrors,
  } = useForm<{ url: string }>();

  const onSubmit: SubmitHandler<{ url: string }> = (data) => {
    onAddBookmark(data.url);
    reset({ url: "" });
  };

  // Form validation with URL_PATTERN
  const { ref, ...rest } = register("url", {
    required: true,
    pattern: URL_PATTERN,  // <-- Validates input
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...rest}
        errorText="Enter valid URL"
        isError={!isEmpty(errors)}
        placeholder="Add a link or drop a file anywhere"
        ref={(event) => {
          ref(event);
          if (!isNull(inputRef)) {
            inputRef.current = event;
          }
        }}
      />
    </form>
  );
};
```

**Key Features:**

- Uses `react-hook-form` for form state management
- Validates with `URL_PATTERN` regex
- Error handling with custom error messages
- Keyboard shortcut support (Cmd+K or Ctrl+K)

### Clipboard Upload Validation

**File:** `/Users/navin/Developer/recollect/src/async/uploads/clipboard-upload.ts` (Line 37-63)

```typescript
export const clipboardUpload = async (
	text: string | undefined,
	files: FileList | undefined,
	category_id: CategoryIdUrlTypes,
	addBookmarkMinDataOptimisticMutation: AddMinDataMutationType,
	fileUploadOptimisticMutation: FileUploadMutationType,
) => {
	if (files) {
		await fileUpload(files, fileUploadOptimisticMutation, category_id);
	}

	if (text) {
		// check if the text is a bookmark url
		const isUrl = text?.match(URL_PATTERN);

		if (isUrl && !isEmpty(isUrl)) {
			// upload the url as bookmark
			await mutationApiCall(
				addBookmarkMinDataOptimisticMutation.mutateAsync({
					url: isUrl?.[0],
					category_id,
					update_access: true,
				}),
			);
		}
	}
};
```

**Purpose:** Validates clipboard content against URL_PATTERN before creating bookmark

---

## 4. API ENDPOINTS FOR BOOKMARK CREATION

### 4.1 Add Bookmark Min Data (Initial Creation)

**File:** `/Users/navin/Developer/recollect/src/pages/api/bookmark/add-bookmark-min-data.ts`

**Endpoint:** `POST /api/bookmark/add-bookmark-min-data`

**Request Payload:**

```typescript
type AddBookmarkMinDataPayloadTypes = {
	url: string;
	category_id: CategoryIdUrlTypes;
	update_access: boolean;
};
```

**Key Validation & Processing (Lines 107-222):**

1. **URL Parsing & Host Extraction** (Line 115)

   ```typescript
   const urlHost = new URL(url)?.hostname?.toLowerCase();
   ```

2. **OG Image Preference Check** (Lines 117-122)

   ```typescript
   const isOgImagePreferred = OG_IMAGE_PREFERRED_SITES?.some((keyword) =>
   	urlHost?.includes(keyword),
   );
   const shouldSkipOgImage = SKIP_OG_IMAGE_DOMAINS?.some((keyword) =>
   	urlHost?.includes(keyword),
   );
   ```

3. **Open Graph Scraping** (Lines 190-221)

   ```typescript
   const userAgent =
   	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...";

   const { result: ogScrapperResponse } = await ogs({
   	url,
   	fetchOptions: { headers: { "user-agent": userAgent } },
   });

   scrapperResponse = {
   	data: {
   		title: ogScrapperResponse?.ogTitle ?? null,
   		description: ogScrapperResponse?.ogDescription ?? null,
   		OgImage: shouldSkipOgImage
   			? null
   			: (ogScrapperResponse?.ogImage?.[0]?.url ?? null),
   		favIcon: ogScrapperResponse?.favicon ?? null,
   	},
   };
   ```

4. **Fallback Title** (Lines 212-220)

   ```typescript
   // if scrapper error is there then we just add the url host name as the title
   scrapperResponse = {
   	data: {
   		title: new URL(url)?.hostname,
   		description: null,
   		OgImage: null,
   		favIcon: null,
   	},
   };
   ```

5. **Category Validation** (Lines 234-257)
   - Checks if user is category owner or collaborator
   - Validates edit access permissions
   - Uses `checkIfUserIsCategoryOwnerOrCollaborator()` helper

6. **Duplicate Detection** (Lines 259-300)

   ```typescript
   const { data: checkBookmarkData, error: checkBookmarkError } = await supabase
   	.from(MAIN_TABLE_NAME)
   	.select(`id`)
   	.eq("url", url)
   	.eq("category_id", categoryId)
   	.eq("trash", false);

   if (!isEmpty(checkBookmarkData)) {
   	response.status(500).json({
   		error: "Bookmark already present in category",
   	});
   	return;
   }
   ```

### 4.2 Media Type Detection

**File:** `/Users/navin/Developer/recollect/src/pages/api/v1/bookmarks/get/get-media-type.ts`

**Endpoint:** `GET /api/v1/bookmarks/get/get-media-type?url=<encoded_url>`

**Validation:**

```typescript
const schema = z.object({
	url: z.string().url({ message: "Invalid URL format" }),
});

const parseResult = schema.safeParse(request.query);
```

**Media Type Detection:**

```typescript
const result = await axios.head(url, {
	timeout: 5_000,
	headers: {
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
	},
});

const mediaType = result.headers["content-type"];
```

### 4.3 Add Remaining Bookmark Data

**File:** `/Users/navin/Developer/recollect/src/pages/api/bookmark/add-remaining-bookmark-data.ts`

**Endpoint:** `POST /api/bookmark/add-remaining-bookmark-data`

**Purpose:** Adds blur hash, OCR text, and uploads scraped images to R2 storage

---

## 5. PROTOCOL VALIDATION

### HTTPS/HTTP Protocol Check

**File:** `/Users/navin/Developer/recollect/src/async/uploads/iframe-test.ts` (Line 22-25)

```typescript
// Only allow HTTP and HTTPS protocols
if (!["http:", "https:"].includes(parsedUrl.protocol)) {
	return false;
}
```

**Context:** Used in `canEmbedInIframe()` function for iframe embedding validation

### URL Constructor Validation

Uses native JavaScript `URL` constructor for validation:

- Throws error for invalid URLs
- Automatically validates protocol, hostname, etc.

---

## 6. MUTATION HOOKS

### useAddBookmarkMinDataOptimisticMutation

**File:** `/Users/navin/Developer/recollect/src/async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation.ts`

**Key Features:**

- Optimistic UI updates
- Automatic screenshot capture for non-image URLs
- PDF thumbnail generation
- Error rollback

**Handles:**

- Image URL detection (prevents screenshot for direct image links)
- PDF detection (using `URL_PDF_CHECK_PATTERN`)
- Media type checking (via `getMediaType()`)
- Toast notifications

---

## 7. URL-RELATED HELPER FUNCTIONS

### getBaseUrl (Router-based)

**File:** `/Users/navin/Developer/recollect/src/utils/url.ts`

```typescript
export const getCategorySlugFromRouter = (
	router: NextRouter,
): string | null => {
	// Extracts category slug from URL path
	// Example: "/technology?sort=latest" → "technology"
};
```

### getBaseUrl (String-based)

**File:** `/Users/navin/Developer/recollect/src/utils/helpers.ts`

Already documented above - extracts hostname with protocol normalization

### checkIfUrlAnImage & checkIfUrlAnMedia

**File:** `/Users/navin/Developer/recollect/src/utils/helpers.ts` (Line 327-336)

```typescript
// this function returns true if the media type is of image type else false
export const checkIfUrlAnImage = async (url: string): Promise<boolean> => {
	const mediaType = await getMediaType(url);
	return mediaType?.includes("image/") ?? false;
};

// this function returns true if the media type is in the acceptedFileTypes array
export const checkIfUrlAnMedia = async (url: string): Promise<boolean> => {
	const mediaType = await getMediaType(url);
	return acceptedFileTypes?.includes(mediaType ?? "") ?? false;
};
```

---

## 8. CRUD HELPER - Client-Side API Calls

**File:** `/Users/navin/Developer/recollect/src/async/supabaseCrudHelpers/index.ts`

### getMediaType Function

```typescript
export const getMediaType = async (url: string): Promise<string | null> => {
	try {
		const encodedUrl = encodeURIComponent(url);

		const response = await fetch(
			`${getBaseUrl()}${NEXT_API_URL}${GET_MEDIA_TYPE_API}?url=${encodedUrl}`,
			{ method: "GET" },
		);

		if (!response.ok) {
			console.error("Error in getting media type");
			return null;
		}

		const data = await response.json();
		return data.mediaType || null;
	} catch (error) {
		console.error("Error getting media type:", error);
		return null;
	}
};
```

**Key:** URL is properly encoded using `encodeURIComponent()`

---

## 9. CONSTANTS & CONFIGURATION

### Preferred OG Image Domains

**File:** `/Users/navin/Developer/recollect/src/utils/constants.ts` (Line 314-323)

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

### Skip OG Image Domains

**File:** `/Users/navin/Developer/recollect/src/utils/constants.ts` (Line 352-357)

```typescript
export const SKIP_OG_IMAGE_DOMAINS = [
	"amazon.in",
	"twitter.com",
	"x.com",
	"amazon.com",
];
```

### Accepted File Types

**File:** `/Users/navin/Developer/recollect/src/utils/constants.ts` (Line 176-214)

Includes MIME types for images, audio, video, and documents

---

## 10. API ENDPOINTS SUMMARY

| Endpoint                                    | Method | Purpose                      | File                             |
| ------------------------------------------- | ------ | ---------------------------- | -------------------------------- |
| `/api/bookmark/add-bookmark-min-data`       | POST   | Create bookmark with OG data | `add-bookmark-min-data.ts`       |
| `/api/v1/bookmarks/get/get-media-type`      | GET    | Get media type from URL      | `get-media-type.ts`              |
| `/api/bookmark/add-remaining-bookmark-data` | POST   | Add thumbnails & OCR data    | `add-remaining-bookmark-data.ts` |
| `/api/bookmark/add-url-screenshot`          | POST   | Capture screenshot           | `add-url-screenshot.ts`          |
| `/api/v1/bookmarks/insert`                  | POST   | Bulk insert bookmarks (API)  | `insert.ts`                      |
| `/api/bookmark/fetch-bookmarks-data`        | GET    | Fetch bookmarks              | `fetch-bookmarks-data.ts`        |

---

## 11. SECURITY & VALIDATION CHECKS

1. **Protocol Validation:** Only HTTP/HTTPS allowed
2. **URL Constructor:** Native URL parsing (strict validation)
3. **Authentication:** Supabase auth required for all mutations
4. **Authorization:** Category owner/collaborator checks
5. **Duplicate Detection:** Prevents duplicate URLs in same category
6. **Timeout Protection:** 5-second timeout on HEAD requests
7. **User-Agent Spoofing:** Custom user-agent for scraping
8. **Header Validation:** Checks X-Frame-Options and CSP for iframe embedding

---

## 12. KNOWN ISSUES & BUGS

### Bug #1: Logical Error in Protocol Normalization

**Location:** `/Users/navin/Developer/recollect/src/async/supabaseCrudHelpers/index.ts` (Line 251)

```typescript
// WRONG - will always add https://
if (!url.startsWith("http") || !url.startsWith("https")) {
	finalUrl = `https://${url}`;
}

// CORRECT - should be:
if (!url.startsWith("http://") && !url.startsWith("https://")) {
	finalUrl = `https://${url}`;
}
```

---

## 13. DATA FLOW DIAGRAM

```tree
User Input (AddBookmarkDropdown)
  ↓
Validation (URL_PATTERN regex)
  ↓
Client Normalization (addBookmarkMinData)
  ↓
API: POST /api/bookmark/add-bookmark-min-data
  ↓
Server Processing:
  - Parse URL with new URL()
  - Check OG Image preferences
  - Scrape OG data with open-graph-scraper
  - Validate category permissions
  - Detect duplicates
  - Insert to DB
  ↓
Response with bookmark ID
  ↓
Client: Media Type Detection
  ↓
Screenshot/Thumbnail Generation
  ↓
API: POST /api/bookmark/add-remaining-bookmark-data
  ↓
R2 Storage Upload & Blur Hash Generation
```

---

## 14. TYPE DEFINITIONS

**File:** `/Users/navin/Developer/recollect/src/types/componentTypes.ts` (Line 11-13)

```typescript
export type UrlInput = {
	urlText: string;
};
```

---

## SUMMARY

The Recollect codebase has comprehensive URL handling with:

- Consistent regex-based validation
- Proper protocol normalization (with one noted bug)
- Multiple layers of URL verification
- OG data scraping with domain-based preferences
- Media type detection before thumbnail generation
- Security checks for permissions and duplicates
- Proper error handling and logging via Sentry
