'use strict';

// ─────────────────────────────────────────────
//  Diff Algorithm  (LCS-based, line level)
// ─────────────────────────────────────────────

/**
 * Builds an LCS DP table for two arrays of strings.
 * Returns a 2-D Uint32Array.
 */
function buildLCS(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = 1; i <= m; i++) {
    const prev = dp[i - 1], cur = dp[i];
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1] + 1
        : prev[j] > cur[j - 1] ? prev[j] : cur[j - 1];
    }
  }
  return dp;
}

/**
 * Produces an array of hunk objects:
 *   { type: 'equal'|'insert'|'delete', value: string }
 */
function computeDiff(origLines, newLines) {
  const dp = buildLCS(origLines, newLines);
  const result = [];
  let i = origLines.length, j = newLines.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === newLines[j - 1]) {
      result.push({ type: 'equal',  value: origLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'insert', value: newLines[j - 1] });
      j--;
    } else {
      result.push({ type: 'delete', value: origLines[i - 1] });
      i--;
    }
  }
  return result.reverse();
}

// ─────────────────────────────────────────────
//  <diff-output>  Web Component
// ─────────────────────────────────────────────

const SHADOW_CSS = `
:host {
  display: block;
  font-family: ui-monospace, 'Cascadia Code', 'JetBrains Mono', 'Fira Mono', monospace;
}

/* ── Placeholder ── */
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3.5rem 2rem;
  color: #3a3730;
  font-family: ui-monospace, monospace;
  text-align: center;
  border: 1px solid #2b2820;
  border-radius: 2px;
  margin-top: 1px;
}
.placeholder p    { font-size: 0.78rem; color: #5a5650; }

/* ── Error ── */
.error {
  padding: 0.75rem 1rem;
  background: #1a0d0d;
  border: 1px solid #3d1a1a;
  border-radius: 2px;
  color: #d95858;
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  margin-top: 1px;
}

/* ── Stats bar ── */
.stats {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.4rem 0.875rem;
  background: #1c1a15;
  border: 1px solid #2b2820;
  border-bottom: none;
  border-radius: 2px 2px 0 0;
  font-family: ui-monospace, monospace;
  font-size: 0.72rem;
  color: #6b6660;
  margin-top: 1px;
}

.stat { font-weight: 600; }
.stat.add { color: #55c26a; }
.stat.del { color: #d95858; }

.copy-btn {
  margin-left: auto;
  background: transparent;
  border: 1px solid #2b2820;
  border-radius: 2px;
  color: #6b6660;
  font-size: 0.68rem;
  padding: 0.15rem 0.5rem;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.1s, color 0.1s;
}
.copy-btn:hover { background: #1c1a15; color: #e2ddd6; border-color: #6b6660; }

/* ── Diff table ── */
.table-wrap {
  overflow: auto;
  border: 1px solid #2b2820;
  border-radius: 0 0 2px 2px;
  max-height: 72vh;
  background: #0f0e0c;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.775rem;
  line-height: 1.65;
}

td { padding: 0; vertical-align: top; }

.ln {
  min-width: 40px;
  width: 40px;
  text-align: right;
  padding: 0 8px !important;
  color: #2e2b25;
  user-select: none;
  font-size: 0.68rem;
  border-right: 1px solid #1c1a15;
}

.gutter {
  width: 18px;
  min-width: 18px;
  text-align: center;
  padding: 0 2px !important;
  user-select: none;
}

.code {
  padding: 0 10px !important;
  white-space: pre;
  width: 100%;
}

/* Row colours — warm dark */
tr.insert td       { background: #0b1e10; }
tr.insert .gutter  { color: #55c26a; background: #0e2613; }
tr.insert .ln      { background: #081409; color: #1e3a22; }
tr.insert .code    { color: #c6e5cc; }

tr.delete td       { background: #1e0b0b; }
tr.delete .gutter  { color: #d95858; background: #270e0e; }
tr.delete .ln      { background: #150808; color: #3a1a1a; }
tr.delete .code    { color: #e5c6c6; }

tr.equal td        { background: #0f0e0c; }
tr.equal .gutter   { color: #252220; }
tr.equal .ln       { color: #252220; }
tr.equal .code     { color: #4a4640; }

tr:hover td { filter: brightness(1.18); }
`;

class DiffOutput extends HTMLElement {
  #shadow;
  #rawDiffText = '';

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.innerHTML = `<style>${SHADOW_CSS}</style><div class="root"></div>`;
    this.#showPlaceholder();
  }

  // ── Public API ────────────────────────────

  compare(original, modified) {
    const origLines = original.split('\n');
    const newLines  = modified.split('\n');
    const MAX = 3000;

    if (origLines.length > MAX || newLines.length > MAX) {
      this.#root().innerHTML =
        `<div class="error">⚠ Input exceeds ${MAX} lines per side. Please reduce the input size.</div>`;
      return;
    }

    const hunks = computeDiff(origLines, newLines);
    this.#renderDiff(hunks);
  }

  clear() {
    this.#rawDiffText = '';
    this.#showPlaceholder();
  }

  // ── Private helpers ───────────────────────

  #root() {
    return this.#shadow.querySelector('.root');
  }

  #showPlaceholder() {
    this.#root().innerHTML = `
      <div class="placeholder">
        <p>paste text in both panels and click <strong>compare</strong></p>
      </div>`;
  }

  #renderDiff(hunks) {
    const adds = hunks.filter(h => h.type === 'insert').length;
    const dels = hunks.filter(h => h.type === 'delete').length;

    // Build plain-text diff for clipboard
    this.#rawDiffText = hunks.map(h => {
      const prefix = h.type === 'insert' ? '+' : h.type === 'delete' ? '-' : ' ';
      return `${prefix} ${h.value}`;
    }).join('\n');

    // Build table rows with running line numbers
    let loNum = 0, lnNum = 0;
    const rows = hunks.map(h => {
      let lo = '', ln = '', glyph = ' ';
      if      (h.type === 'equal')  { lo = ++loNum; ln = ++lnNum; }
      else if (h.type === 'delete') { lo = ++loNum; glyph = '-'; }
      else                          { ln = ++lnNum; glyph = '+'; }

      return `<tr class="${h.type}">
        <td class="ln">${lo}</td>
        <td class="ln">${ln}</td>
        <td class="gutter">${glyph}</td>
        <td class="code">${this.#escape(h.value)}</td>
      </tr>`;
    }).join('');

    // Stats bar
    let statsHtml;
    if (adds === 0 && dels === 0) {
      statsHtml = '<span>Files are identical</span>';
    } else {
      statsHtml =
        (adds > 0 ? `<span class="stat add">+${adds} addition${adds !== 1 ? 's' : ''}</span>` : '') +
        (dels > 0 ? `<span class="stat del">−${dels} deletion${dels !== 1 ? 's' : ''}</span>` : '');
    }

    this.#root().innerHTML = `
      <div class="stats">
        ${statsHtml}
        <button class="copy-btn" id="copy-btn" title="Copy unified diff to clipboard">Copy diff</button>
      </div>
      <div class="table-wrap">
        <table aria-label="Diff table">
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    this.#shadow.getElementById('copy-btn').addEventListener('click', () => {
      const btn = this.#shadow.getElementById('copy-btn');
      navigator.clipboard.writeText(this.#rawDiffText)
        .then(() => {
          btn.textContent = '✓ Copied!';
          setTimeout(() => { btn.textContent = 'Copy diff'; }, 2000);
        })
        .catch(() => {
          btn.textContent = 'Failed';
          setTimeout(() => { btn.textContent = 'Copy diff'; }, 2000);
        });
    });
  }

  #escape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('diff-output', DiffOutput);

// ─────────────────────────────────────────────
//  App wiring
// ─────────────────────────────────────────────

const compareBtn = document.getElementById('compare-btn');
const clearBtn   = document.getElementById('clear-btn');
const originalTA = document.getElementById('original');
const modifiedTA = document.getElementById('modified');
const diffOutput = document.getElementById('diff-output');

compareBtn.addEventListener('click', () => {
  diffOutput.compare(originalTA.value, modifiedTA.value);
  diffOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

clearBtn.addEventListener('click', () => {
  originalTA.value = '';
  modifiedTA.value = '';
  diffOutput.clear();
  originalTA.focus();
});

// Ctrl/Cmd + Enter shortcut
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    compareBtn.click();
  }
});
