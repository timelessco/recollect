# Generate PR Description

This command analyzes your current branch changes against the `dev` branch and generates a PR description markdown file.

## Usage

Run `/pr-description` to generate a PR description based on your git changes.

## What It Does

1. Analyzes git diff between `origin/dev` and current branch
2. Identifies changed files and their types
3. Generates a structured PR description with:
   - Problem statements
   - Solution descriptions
   - File lists
   - Screenshot/video placeholders

## Output

Creates `PR_DESCRIPTION.md` in the workspace root with:

- Title based on changes
- Problem/Solution format for each change
- File lists
- Screenshot/video sections

## Instructions for AI

When user runs `/pr-description`:

1. **Get git changes**:

   ```bash
   git diff --name-status origin/dev...HEAD
   git diff --stat origin/dev...HEAD
   git log --oneline origin/dev..HEAD
   ```

2. **Analyze changes**:
   - Group related file changes
   - Identify what problems were fixed
   - Note what solutions were implemented
   - Categorize changes (bug fixes, refactoring, features)

3. **Generate PR description**:
   - Create concise title based on main changes
   - For each change group:
     - **Problem**: What was wrong
     - **Solution**: What was changed
     - **Files**: Which files were modified
   - Add screenshot/video placeholder section
   - Keep it concise - user will add details

4. **Write to `PR_DESCRIPTION.md`**:
   - Use the format from the example PR_DESCRIPTION.md
   - Keep descriptions brief and factual
   - Don't add testing checklists or extra sections
   - Focus on: Problem → Solution → Files

## Format Template

```markdown
# [Title Based on Changes]

## Changes

### 1. [Change Category]

**Problem**: [Brief description of what was wrong]

**Solution**: [Brief description of what was changed]

**Files**: [List of modified files]

### 2. [Next Change Category]

...

## Screenshots & Videos

<!-- Add screenshots/videos here -->
```

## Notes

- Keep descriptions factual and concise
- Don't add testing checklists or code quality sections
- User will add their own details and screenshots
- Focus on what changed, not how to test it
