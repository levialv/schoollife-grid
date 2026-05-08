// 通用底部弹层：浏览精选 + 搜索 Bangumi（UP主类只在静态库内搜）
import { categoryByKey } from '../data/categories.js';
import { recommendByStage, searchSeeds } from '../data/seeds.js';
import { searchBangumi, isBangumiCategory } from '../api/bangumi.js';

const root = document.getElementById('pickerRoot');
const titleEl = document.getElementById('pickerTitle');
const searchEl = document.getElementById('pickerSearch');
const listEl = document.getElementById('pickerList');
const statusEl = document.getElementById('pickerStatus');

let context = null;
let debounceTimer = null;
let lastQuery = '';
let abortCtrl = null;

root.addEventListener('click', (e) => {
  const action = e.target.dataset?.action;
  if (action === 'close-picker') closePicker();
});

searchEl.addEventListener('input', () => {
  const kw = searchEl.value.trim();
  if (kw === lastQuery) return;
  lastQuery = kw;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => runSearch(kw), 320);
});

listEl.addEventListener('click', (e) => {
  const card = e.target.closest('.picker-item');
  if (!card) return;
  const idx = Number(card.dataset.idx);
  const work = card._work || lastResults[idx];
  if (!work) return;
  context?.onPick?.(work);
  closePicker();
});

let lastResults = [];

export function openPicker(ctx) {
  context = ctx;
  searchEl.value = '';
  lastQuery = '';
  setStatus(null);
  const cat = categoryByKey(ctx.catKey);
  const stageHint = ctx.stageLabel ? ` · ${ctx.stageLabel}` : '';
  titleEl.textContent = `选 ${cat?.shortLabel || '作品'}${stageHint}`;
  searchEl.placeholder = isBangumiCategory(ctx.catKey)
    ? `输入${cat?.shortLabel || '作品'}名搜索 Bangumi…`
    : `搜 UP 主名（仅本地）`;
  showRecommendations();
  root.hidden = false;
  // 等过渡完成后聚焦避免被半屏抖动
  setTimeout(() => searchEl.focus({ preventScroll: true }), 220);
}

export function closePicker() {
  root.hidden = true;
  context = null;
  if (abortCtrl) {
    abortCtrl.abort();
    abortCtrl = null;
  }
  clearTimeout(debounceTimer);
}

function showRecommendations() {
  if (!context) return;
  const items = recommendByStage(context.catKey, context.stageKey);
  lastResults = items.map(seedToWork);
  renderList(lastResults);
  setStatus(items.length ? null : '暂无该阶段的精选，输入关键字搜搜看～');
}

async function runSearch(keyword) {
  if (!context) return;
  if (!keyword) {
    showRecommendations();
    return;
  }

  // 1) 先做静态搜索，立刻反馈
  const seedHits = searchSeeds(context.catKey, keyword).map(seedToWork);
  lastResults = seedHits;
  renderList(seedHits);
  setStatus(isBangumiCategory(context.catKey) ? '检索 Bangumi 中…' : seedHits.length ? null : '没找到匹配项');

  if (!isBangumiCategory(context.catKey)) {
    if (!seedHits.length) setStatus('UP 主名单内没找到，要不要换个关键字～');
    return;
  }

  // 2) 异步追加 Bangumi 结果
  if (abortCtrl) abortCtrl.abort();
  abortCtrl = new AbortController();
  try {
    const remote = await searchBangumi(context.catKey, keyword, { signal: abortCtrl.signal });
    if (!context) return;
    if (lastQuery !== keyword) return; // 已被新搜索取代
    const merged = mergeUnique(seedHits, remote);
    lastResults = merged;
    renderList(merged);
    if (!merged.length) setStatus('没搜到结果，换个关键字试试');
    else setStatus(null);
  } catch (err) {
    if (err?.name === 'AbortError') return;
    console.warn('[picker] bangumi search failed:', err);
    setStatus('网络抖了一下，先用本地结果～');
  }
}

function mergeUnique(seedList, remoteList) {
  const out = [...seedList];
  const seen = new Set(seedList.map((w) => titleKey(w.title)));
  remoteList.forEach((w) => {
    const k = titleKey(w.title);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(w);
  });
  return out;
}

function titleKey(t) {
  return (t || '').replace(/\s+/g, '').toLowerCase();
}

function seedToWork(seed) {
  return {
    id: seed.id,
    title: seed.title,
    cover: seed.cover || '',
    emoji: seed.emoji,
    color: seed.color,
    subtitle: seed.desc || '',
    source: 'seed',
    catKey: context?.catKey,
  };
}

function renderList(items) {
  if (!items.length) {
    listEl.innerHTML = '';
    return;
  }
  listEl.innerHTML = items.map((it, i) => itemHtml(it, i)).join('');
  // 缓存避免列表 re-render 后失效
  Array.from(listEl.children).forEach((el, i) => { el._work = items[i]; });
}

function itemHtml(it, i) {
  const isUpper = (context?.catKey === 'upper');
  const coverStyle = it.cover
    ? `background-image:url('${escapeAttr(it.cover)}');background-color:#eee;`
    : `background-color:${escapeAttr(it.color || '#888')};`;
  const placeholder = it.cover ? '' : `<span aria-hidden="true">${it.emoji || '📦'}</span>`;
  const sub = it.subtitle ? `<span class="picker-item-sub">${escapeText(it.subtitle)}</span>` : '';
  return `
    <li class="picker-item" data-idx="${i}" role="option">
      <span class="picker-item-cover${isUpper ? ' upper-cover' : ''}" style="${coverStyle}">${placeholder}</span>
      <span class="picker-item-title">${escapeText(it.title)}</span>
      ${sub}
    </li>
  `;
}

function setStatus(text) {
  if (!text) {
    statusEl.hidden = true;
    statusEl.textContent = '';
  } else {
    statusEl.hidden = false;
    statusEl.textContent = text;
  }
}

function escapeText(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}
function escapeAttr(s) {
  return String(s ?? '').replace(/["'<>]/g, (c) => ({ '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;' })[c]);
}
