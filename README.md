# Diff Viewer

A simple, client-side diff viewer built with **vanilla JS, HTML, and CSS** — no frameworks, no dependencies, no server.

## Features

- **Line-level diff** using the LCS (Longest Common Subsequence) algorithm
- **Web Component** `<diff-output>` with Shadow DOM for encapsulated rendering
- Color-coded output: green for additions, red for deletions, grey for unchanged lines
- Dual line numbers (original + modified)
- **Copy diff** button — copies a unified diff to clipboard
- Keyboard shortcut: `Ctrl`+`Enter` to compare
- Responsive layout (stacks on mobile)
- Dark theme

## Usage

Open `index.html` in any modern browser — no build step required.

1. Paste the **original** text in the left panel
2. Paste the **modified** text in the right panel
3. Click **Compare** (or press `Ctrl+Enter`)

## File Structure

```
index.html   — Page markup & OG meta tags
styles.css   — Page styles
script.js    — Diff algorithm + DiffOutput web component + app logic
README.md    — This file
robots.txt   — Search engine directives
```

## Limits

Input is capped at **3 000 lines per side** to keep the browser responsive.
