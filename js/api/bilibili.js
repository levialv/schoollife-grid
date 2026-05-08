// B 站 UP 主搜索（通过自建 Cloudflare Worker 代理 + WBI 签名 + buvid 反爬）
// 部署 worker/ 后，把 workers.dev URL 写到下方的 DEFAULT_WORKER_URL 常量。
// 临时调试可在浏览器 console 里 `window.__BILI_WORKER_URL__ = 'https://...'` 覆盖。
import { categoryByKey } from '../data/categories.js';

// ★ 部署 worker/ 后把这里改成实际的 workers.dev 地址（不要带尾部斜杠）
//   比如：'https://schoollife-grid-bili.your-account.workers.dev'
const DEFAULT_WORKER_URL = '';

const IMG_PROXY = 'https://wsrv.nl/?url=';
const SUBTITLE_MAX = 32;

let pending; // 上一次请求 abort 控制

export function isBilibiliUpperEnabled() {
  return Boolean(getWorkerUrl());
}

export async function searchBilibiliUpper(keyword, { signal, timeout = 5000 } = {}) {
  const base = getWorkerUrl();
  if (!base) throw new Error('worker_url_unset');
  const trimmed = (keyword || '').trim();
  if (!trimmed) return [];

  if (pending) pending.abort();
  pending = new AbortController();
  const ctrl = pending;
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const url = `${stripTrailingSlash(base)}/api/upper-search?keyword=${encodeURIComponent(trimmed)}`;
    const resp = await fetch(url, { signal: ctrl.signal });
    if (!resp.ok) throw new Error(`worker http ${resp.status}`);
    const json = await resp.json();
    if (json.error) throw new Error(json.error);
    return normalize(json.data);
  } finally {
    clearTimeout(timer);
    if (pending === ctrl) pending = null;
  }
}

function normalize(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((u) => u && u.mid).slice(0, 24).map(toWork);
}

function toWork(u) {
  const sign = (u.sign || '').replace(/\s+/g, ' ').trim();
  const stats = `${formatNum(u.fans)} 粉丝 · ${u.videos || 0} 投稿`;
  let subtitle = sign ? truncate(sign, SUBTITLE_MAX) : stats;
  if (sign && sign.length < SUBTITLE_MAX - 6) {
    subtitle = `${stats} · ${sign}`.slice(0, SUBTITLE_MAX);
  }
  return {
    id: `bili-${u.mid}`,
    biliMid: u.mid,
    title: u.name,
    subtitle,
    cover: proxyAvatar(u.face),
    source: 'bilibili',
    catKey: 'upper',
  };
}

function truncate(s, n) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function formatNum(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return `${(v / 10000).toFixed(v >= 100000 ? 0 : 1)}万`;
  return String(v);
}

function proxyAvatar(url) {
  if (!url) return '';
  const stripped = url.replace(/^https?:\/\//, '');
  return `${IMG_PROXY}${encodeURIComponent(stripped)}&w=240&output=jpg&q=82`;
}

function stripTrailingSlash(s) {
  return String(s || '').replace(/\/+$/, '');
}

function getWorkerUrl() {
  if (typeof window !== 'undefined' && window.__BILI_WORKER_URL__) {
    return String(window.__BILI_WORKER_URL__);
  }
  return DEFAULT_WORKER_URL;
}

// 让外部能拿到 categories.js 也能 tree-shake 走（这里仅为了让校验阶段能识别 category）
export const UPPER_CAT_KEY = 'upper';
export { categoryByKey };
