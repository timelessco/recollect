# URL Processing Docs

Two concerns live here. Pick the one you need.

| File                         | What it covers                                                                                                                                                                      | When to open it                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **`lifecycle.md`**           | How a bookmark card picks what to show — image, spinner, or _"Cannot fetch"_. Plain-English tour with scenarios and flow diagrams.                                                  | Start here for anything about bookmark card placeholder copy or the image lifecycle.   |
| **`lifecycle-reference.md`** | Dense technical reference backing `lifecycle.md`. Every file:line citation, the full state-vector, render-path matrix, server field-by-field write table, every cache invalidation. | When you need exact proof. After `lifecycle.md`.                                       |
| **`url-validation.md`**      | URL regex patterns, protocol normalization, hostname helpers, OG-image allow/skip lists.                                                                                            | When you need to validate a URL, extract a hostname, or look up URL-related constants. |
