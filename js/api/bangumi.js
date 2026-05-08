// Bangumi 搜索（动画/电影/游戏直连官方 v0 API）
// 封面经 wsrv.nl 代理拿到 CORS 头，避免 canvas 跨域污染。
import { categoryByKey } from '../data/categories.js';

const API_URL = 'https://api.bgm.tv/v0/search/subjects';
const IMG_PROXY = 'https://wsrv.nl/?url=';

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

  if (pending) pending.abort();
  pending = new AbortController();
  const ctrl = pending;
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(`${API_URL}?limit=24`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        keyword: keyword.trim(),
        filter: { type: [type] },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`bgm http ${res.status}`);
    const data = await res.json();
    return normalize(data, catKey);
  } finally {
    clearTimeout(timer);
    if (pending === ctrl) pending = null;
  }
}

function normalize(data, catKey) {
  const list = Array.isArray(data?.data) ? data.data : [];
  return list
    .filter((it) => it && it.id)
    .slice(0, 24)
    .map((it) => bangumiItemToWork(it, catKey));
}

function bangumiItemToWork(it, catKey) {
  const id = it.id;
  const title = it.name_cn || it.name || '未命名';
  const subtitle = it.name && it.name_cn && it.name !== it.name_cn ? it.name : '';
  const cover = proxyCover(bestCover(it));
  return { id: `bgm-${id}`, bgmId: id, title, subtitle, cover, source: 'bangumi', catKey };
}

function bestCover(it) {
  const img = it.images || {};
  return img.large || it.image || img.common || img.medium || img.small || img.grid || '';
}

function proxyCover(url) {
  if (!url) return '';
  const stripped = url.replace(/^https?:\/\//, '');
  // wsrv.nl 提供跨域允许的图片代理；同时压到 480 宽 + jpg 80 减小体积
  return `${IMG_PROXY}${encodeURIComponent(stripped)}&w=480&output=jpg&q=82`;
}

export { TYPE_BY_CAT };
