// 主控：路由 stage、注册全局事件、协调子组件
import { getState, setState, subscribe, resetState } from './state.js';
import { columnsForStage, lifestageByKey } from './data/lifestages.js';
import { categoryByKey } from './data/categories.js';
import { renderStage1 } from './components/stage1-life.js';
import { renderStage2 } from './components/stage2-cats.js';
import { renderStage3 } from './components/stage3-grid.js';
import { renderStage4 } from './components/stage4-share.js';

const sections = {};
['1', '2', '3', '4'].forEach((i) => {
  sections[i] = document.querySelector(`.stage[data-stage="${i}"]`);
});

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const appFooter = document.getElementById('appFooter');
const stepLis = document.querySelectorAll('.step-indicator li');

let toastTimer = null;

export function showToast(text, ms = 1800) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

function gotoStep(step) {
  Object.entries(sections).forEach(([i, el]) => {
    el.hidden = String(i) !== String(step);
  });
  stepLis.forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle('is-active', n === step);
    li.classList.toggle('is-done', n < step);
  });

  prevBtn.hidden = step === 1 || step === 4;
  if (step === 4) {
    appFooter.hidden = true;
  } else {
    appFooter.hidden = false;
    nextBtn.hidden = false;
    nextBtn.textContent = step === 3 ? '生成分享卡' : '下一步';
  }

  setState({ step });
  renderStep(step);
  updateNextEnabled();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStep(step) {
  switch (step) {
    case 1: renderStage1(sections[1]); break;
    case 2: renderStage2(sections[2]); break;
    case 3: renderStage3(sections[3]); break;
    case 4: renderStage4(sections[4]); break;
  }
}

function updateNextEnabled() {
  const s = getState();
  let ok = true;
  if (s.step === 1) ok = !!s.lifeStage;
  if (s.step === 2) ok = (s.categories || []).length > 0;
  if (s.step === 3) {
    // 至少填了一格才能去分享页
    ok = Object.values(s.cells || {}).some((row) => Object.keys(row || {}).length > 0);
  }
  nextBtn.disabled = !ok;
}

prevBtn.addEventListener('click', () => {
  const s = getState();
  if (s.step > 1) gotoStep(s.step - 1);
});

nextBtn.addEventListener('click', () => {
  const s = getState();
  if (s.step >= 4) return;
  if (s.step === 3 && !Object.keys(s.cells || {}).length) {
    showToast('至少填一格再分享呀');
    return;
  }
  gotoStep(s.step + 1);
});

subscribe(() => updateNextEnabled());

// init: 续填时回到合法 step
function bootStep() {
  const s = getState();
  let safe = 1;
  if (s.lifeStage) safe = 2;
  if ((s.categories || []).length > 0) safe = 3;
  const filled = Object.values(s.cells || {}).some((row) => Object.keys(row || {}).length > 0);
  if (filled && s.step === 4) safe = 4;
  return Math.min(s.step || 1, safe);
}

export function navigate(step) {
  gotoStep(step);
}

export function restart() {
  resetState();
  gotoStep(1);
  showToast('已重置，重新开始～');
}

document.addEventListener('DOMContentLoaded', () => {
  gotoStep(bootStep());
}, { once: true });
