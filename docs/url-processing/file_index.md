# Complete File Index: URL Processing Code

## Core URL Validation & Constants

- `/Users/navin/Developer/recollect/src/utils/constants.ts` - URL patterns, OG preferences, configuration
- `/Users/navin/Developer/recollect/src/utils/url.ts` - Router-based URL utilities
- `/Users/navin/Developer/recollect/src/utils/helpers.ts` - URL parsing, hostname extraction, media detection

## UI Components & Forms

- `/Users/navin/Developer/recollect/src/components/customDropdowns.tsx/addBookmarkDropdown.tsx` - Main URL input form
- `/Users/navin/Developer/recollect/src/types/componentTypes.ts` - UrlInput type definition

## Upload & Clipboard Handling

- `/Users/navin/Developer/recollect/src/async/uploads/clipboard-upload.ts` - Clipboard paste validation
- `/Users/navin/Developer/recollect/src/async/uploads/iframe-test.ts` - iframe embedding validation

## API Endpoints (Primary)

- `/Users/navin/Developer/recollect/src/pages/api/bookmark/add-bookmark-min-data.ts` - Create bookmark with OG scraping
- `/Users/navin/Developer/recollect/src/pages/api/v1/bookmarks/get/get-media-type.ts` - Media type detection
- `/Users/navin/Developer/recollect/src/pages/api/bookmark/add-remaining-bookmark-data.ts` - Thumbnails & storage

## API Endpoints (Supporting)

- `/Users/navin/Developer/recollect/src/pages/api/bookmark/add-url-screenshot.ts` - Screenshot capture
- `/Users/navin/Developer/recollect/src/pages/api/v1/bookmarks/insert.ts` - Bulk bookmark insertion

## CRUD Helpers & Data Fetching

- `/Users/navin/Developer/recollect/src/async/supabaseCrudHelpers/index.ts` - Client API calls (contains addBookmarkMinData and getMediaType)
- `/Users/navin/Developer/recollect/src/async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation.ts` - React Query mutation

## Type Definitions

- `/Users/navin/Developer/recollect/src/types/apiTypes.ts` - API request/response types
