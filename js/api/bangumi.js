// Bangumi 搜索（动画/电影/游戏走 lab.magiconch.com 代理）
// 返回的 work 形状：{ id, title, cover, source: 'bangumi', subtitle? }
import { categoryByKey } from '../data/categories.js';

const PROXY_BASE = 'https://lab.magiconch.com/api/bangumi/';

const TYPE_BY_CAT = {
  anime: 2,
  movie: 6,
  game: 4,
};

let pending; // 上一次请求 abort 控制

export function isBangumiCategory(catKey) {
  return Object.prototype.hasOwnProperty.call(TYPE_BY_CAT, catKey);
}

export async function searchBangumi(catKey, keyword, { signal, timeout = 4500 } = {}) {
  const type = TYPE_BY_CAT[catKey];
  if (!type) throw new Error(`category ${catKey} not bangumi-typed`);
  if (!keyword || !keyword.trim()) return [];

  // 取消上一次
  if (pending) pending.abort();
  pending = new AbortController();
  const ctrl = pending;
  // 外部 signal 取消时一并 abort
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const url = `${PROXY_BASE}?type=${type}&keyword=${encodeURIComponent(keyword.trim())}`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`bangumi http ${res.status}`);
    const data = await res.json();
    return normalize(data, catKey);
  } finally {
    clearTimeout(timer);
    if (pending === ctrl) pending = null;
  }
}

function normalize(data, catKey) {
  // 代理返回结构兼容多种：可能是 { results: n, list: [] } 或 [] 或 { data: [] }
  let list = [];
  if (Array.isArray(data)) list = data;
  else if (Array.isArray(data?.list)) list = data.list;
  else if (Array.isArray(data?.data)) list = data.data;
  else if (Array.isArray(data?.results)) list = data.results;
  return list
    .filter((it) => it && (it.id || it.subject_id))
    .slice(0, 36)
    .map((it) => bangumiItemToWork(it, catKey));
}

function bangumiItemToWork(it, catKey) {
  const id = it.id || it.subject_id;
  const title = it.name_cn || it.name || it.title || '未命名';
  const subtitle = it.name && it.name_cn && it.name !== it.name_cn ? it.name : '';
  const cover = bestCover(it);
  return { id: `bgm-${id}`, bgmId: id, title, subtitle, cover, source: 'bangumi', catKey };
}

function bestCover(it) {
  const img = it.images || {};
  return (
    img.large || img.common || img.medium || img.small || img.grid ||
    it.cover || it.image || ''
  );
}

export { TYPE_BY_CAT };
