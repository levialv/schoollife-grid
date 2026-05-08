// 阶段3：核心网格 + 朋友昵称行 + 单元格弹层选择
import { columnsForStage, lifestageByKey } from '../data/lifestages.js';
import { categoryByKey } from '../data/categories.js';
import { getState, setCell, setFriend, subscribe } from '../state.js';
import { openPicker } from './work-picker.js';

let bound = false;
let pressTimer = null;
let pressTarget = null;
const LONG_PRESS_MS = 520;

export function renderStage3(container) {
  const table = container.querySelector('#gridTable');
  const state = getState();
  const cols = columnsForStage(state.lifeStage);
  const cats = (state.categories || []).map(categoryByKey).filter(Boolean);

  table.innerHTML = `
    <thead>
      <tr>
        <th class="grid-row-head" aria-hidden="true"></th>
        ${cols.map((c) => `
          <th class="grid-col-head" data-col="${c.key}">
            <div class="col-title">${c.label}</div>
            <input
              class="friend-input"
              data-col="${c.key}"
              placeholder="@一起追的人"
              value="${escapeAttr(state.friends?.[c.key] || '')}"
              maxlength="12"
              type="text"
              autocomplete="off"
              aria-label="${c.label} 时一起追的朋友昵称"
            />
          </th>
        `).join('')}
      </tr>
    </thead>
    <tbody>
      ${cats.map((cat) => `
        <tr data-cat="${cat.key}">
          <th class="grid-row-head" scope="row">
            <span class="row-emoji" aria-hidden="true">${cat.emoji}</span>
            <span>${cat.shortLabel}</span>
          </th>
          ${cols.map((c) => cellHtml(state, cat.key, c.key)).join('')}
        </tr>
      `).join('')}
    </tbody>
  `;

  if (!bound) {
    table.addEventListener('click', onTableClick);
    table.addEventListener('input', onFriendInput);
    // 长按清空
    table.addEventListener('touchstart', onPressStart, { passive: true });
    table.addEventListener('touchend', onPressEnd);
    table.addEventListener('touchmove', onPressEnd);
    table.addEventListener('touchcancel', onPressEnd);
    table.addEventListener('mousedown', onPressStart);
    table.addEventListener('mouseup', onPressEnd);
    table.addEventListener('mouseleave', onPressEnd);
    table.addEventListener('contextmenu', onContextMenu);
    bound = true;
  }
}

function cellHtml(state, catKey, colKey) {
  const work = state.cells?.[colKey]?.[catKey];
  if (!work) {
    return `
      <td>
        <button type="button" class="grid-cell is-empty" data-col="${colKey}" data-cat="${catKey}" aria-label="为 ${colKey} 添加 ${catKey}">
          <span class="add-plus" aria-hidden="true">＋</span>
          <span>选作品</span>
        </button>
      </td>
    `;
  }
  const hasCover = !!work.cover;
  const inlineStyle = hasCover
    ? `background-image:url('${escapeAttr(work.cover)}');background-color:#eee;`
    : `background-color:${escapeAttr(work.color || '#888')};`;
  const placeholder = hasCover ? '' :
    `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:36px;color:rgba(255,255,255,0.85);">${escapeText(work.emoji || '🎬')}</div>`;
  return `
    <td>
      <button type="button" class="grid-cell is-filled" data-col="${colKey}" data-cat="${catKey}" style="${inlineStyle}" aria-label="${escapeAttr(work.title)}">
        ${placeholder}
        <span class="cell-mask"><span class="cell-title">${escapeText(work.title)}</span></span>
      </button>
    </td>
  `;
}

function onTableClick(e) {
  const cell = e.target.closest('.grid-cell');
  if (!cell) return;
  const colKey = cell.dataset.col;
  const catKey = cell.dataset.cat;
  if (!colKey || !catKey) return;
  const state = getState();
  const colMeta = columnsForStage(state.lifeStage).find((c) => c.key === colKey);
  openPicker({
    catKey,
    stageKey: colKey,
    stageLabel: colMeta?.label || '',
    currentWork: state.cells?.[colKey]?.[catKey] || null,
    onPick: (work) => {
      setCell(colKey, catKey, work);
      replaceCell(catKey, colKey);
    },
  });
}

function onFriendInput(e) {
  if (!e.target.classList.contains('friend-input')) return;
  const colKey = e.target.dataset.col;
  const value = e.target.value.trim();
  setFriend(colKey, value);
}

function onPressStart(e) {
  const cell = e.target.closest('.grid-cell.is-filled');
  if (!cell) return;
  pressTarget = cell;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    if (!pressTarget) return;
    clearCell(pressTarget);
    pressTarget = null;
  }, LONG_PRESS_MS);
}

function onPressEnd() {
  clearTimeout(pressTimer);
  pressTimer = null;
  pressTarget = null;
}

function onContextMenu(e) {
  const cell = e.target.closest('.grid-cell.is-filled');
  if (!cell) return;
  e.preventDefault();
  clearCell(cell);
}

function clearCell(cell) {
  const colKey = cell.dataset.col;
  const catKey = cell.dataset.cat;
  if (!colKey || !catKey) return;
  setCell(colKey, catKey, null);
  replaceCell(catKey, colKey);
}

function replaceCell(catKey, colKey) {
  const table = document.getElementById('gridTable');
  if (!table) return;
  const cell = table.querySelector(`.grid-cell[data-col="${colKey}"][data-cat="${catKey}"]`);
  if (!cell) return;
  const td = cell.parentElement;
  if (!td) return;
  td.outerHTML = cellHtml(getState(), catKey, colKey);
}

// 当用户切回 stage3 时，state 可能变了，重渲染
subscribe((state) => {
  if (state.step !== 3) return;
  // 仅在 lifeStage 或 categories 变更时重渲染（避免 cell 局部更新触发的死循环）
  // 简化：用 dataset 标记上次结构 fingerprint
  const table = document.getElementById('gridTable');
  if (!table) return;
  const fp = `${state.lifeStage}|${(state.categories || []).join(',')}`;
  if (table.dataset.fp === fp) return;
  table.dataset.fp = fp;
  const container = table.closest('.stage');
  if (container) renderStage3(container);
});

function escapeText(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}
function escapeAttr(s) {
  return String(s ?? '').replace(/["'<>]/g, (c) => ({ '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;' })[c]);
}
