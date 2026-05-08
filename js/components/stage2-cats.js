// 阶段2：题材多选
import { CATEGORIES } from '../data/categories.js';
import { getState, setState } from '../state.js';

let bound = false;

export function renderStage2(container) {
  const wrap = container.querySelector('#categoryChips');
  const selected = new Set(getState().categories || []);
  wrap.innerHTML = CATEGORIES.map((c) => `
    <button
      type="button"
      class="cat-chip${selected.has(c.key) ? ' is-active' : ''}"
      data-key="${c.key}"
      aria-pressed="${selected.has(c.key)}"
    >
      <span class="cat-emoji" aria-hidden="true">${c.emoji}</span>
      <span class="cat-chip-body">
        <span class="cat-name">${c.label}</span>
        <span class="cat-desc">${c.desc}</span>
      </span>
    </button>
  `).join('');

  if (!bound) {
    wrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-chip');
      if (!btn) return;
      const key = btn.dataset.key;
      const current = new Set(getState().categories || []);
      if (current.has(key)) current.delete(key);
      else current.add(key);
      setState({ categories: Array.from(current) });
      renderStage2(container);
    });
    bound = true;
  }
}
