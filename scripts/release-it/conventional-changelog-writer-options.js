import { renderChangelog } from "../release/render-changelog.js";

// Pre-render the changelog body via the shared renderer once per release-it
// invocation. Release-it's conventional-changelog plugin invokes this
// `transform` per commit; we await `renderChangelog()` on the first call,
// stash the markdown in module-scope state, mutate `context.body`, and return
// `false` to drop the commit so the plugin does not emit its own per-commit
// block. The final `mainTemplate` render interpolates `{{{body}}}` against the
// same `context` object — the injection survives because
// `conventional-changelog-writer` passes a single persistent context through
// every transform and into the template render.
let cachedBody = null;
let cachedError = null;

export const transform = async (commit, context) => {
  // Defense-in-depth: the shared renderer also filters release commits, but
  // release-it may surface a release commit that is outside the renderer's
  // range (e.g. when release-it's own range derivation disagrees with the
  // renderer's `git tag --merged main` lookup). Dropping it here keeps the
  // final output stable.
  if (/^(?:feat\(release\): 🚀|🚀 Release v)/u.test(commit.header)) {
    return false;
  }

  if (cachedBody === null && cachedError === null) {
    try {
      const { markdown } = await renderChangelog();
      cachedBody = markdown;
    } catch (error) {
      cachedError = error;
    }
  }
  if (cachedError) {
    throw cachedError;
  }
  context.body = cachedBody;

  // Suppress per-commit Handlebars rendering — the body is injected as a
  // single block via mainTemplate's `{{{body}}}`.
  return false;
};

export const mainTemplate = "{{> header}}\n\n{{{body}}}";

// `.release-it.ts` imports `commitGroupsSort` and `commitPartial` by name at
// the writerOpts wiring. Keep them as no-op exports so the import path stays
// resolvable without editing `.release-it.ts` (D-06).
export const commitGroupsSort = () => 0;
export const commitPartial = "";
