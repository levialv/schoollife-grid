// 阶段1：选择当前生命阶段
import { LIFESTAGES } from '../data/lifestages.js';
import { getState, setState } from '../state.js';

let bound = false;

export function renderStage1(container) {
  const grid = container.querySelector('#lifestageGrid');
  const state = getState();
  grid.innerHTML = LIFESTAGES.map((s) => `
    <button
      type="button"
      class="lifestage-card${s.key === 'old' ? ' is-old' : ''}${state.lifeStage === s.key ? ' is-active' : ''}"
      data-key="${s.key}"
      role="radio"
      aria-checked="${state.lifeStage === s.key}"
    >
      <span class="ls-emoji" aria-hidden="true">${s.emoji}</span>
      <span class="ls-label">${s.label}</span>
      <span class="ls-hint">${s.hint}</span>
    </button>
  `).join('');

  if (!bound) {
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.lifestage-card');
      if (!btn) return;
      const key = btn.dataset.key;
      const current = getState().lifeStage;
      if (current === key) return;
      // 如果以前已经选过，并且新选项导致列减少，那么不主动清除已填格 —— 用户切回时还能看到
      setState({ lifeStage: key });
      renderStage1(container);
    });
    bound = true;
  }
}
