// 种子聚合：按 catKey 取数据；提供按 stage 过滤 + 关键词过滤
import { ANIME_SEEDS } from './seed-anime.js';
import { MOVIE_SEEDS } from './seed-movie.js';
import { GAME_SEEDS } from './seed-game.js';
import { UPPER_SEEDS } from './seed-uppers.js';

const SEED_MAP = {
  anime: ANIME_SEEDS,
  movie: MOVIE_SEEDS,
  game: GAME_SEEDS,
  upper: UPPER_SEEDS,
};

export function getSeedItems(catKey) {
  return SEED_MAP[catKey] || [];
}

export function recommendByStage(catKey, stageKey) {
  const all = getSeedItems(catKey);
  if (!stageKey) return all;
  // forever 列：把所有标了 forever 的优先 + 其它整体补足
  if (stageKey === 'forever') {
    const ever = all.filter((it) => (it.stages || []).includes('forever'));
    const rest = all.filter((it) => !(it.stages || []).includes('forever'));
    return [...ever, ...rest];
  }
  const direct = all.filter((it) => (it.stages || []).includes(stageKey));
  if (direct.length >= 6) return direct;
  // 推荐数太少时把其它项追加进来兜底
  const others = all.filter((it) => !direct.includes(it));
  return [...direct, ...others];
}

export function searchSeeds(catKey, keyword) {
  const all = getSeedItems(catKey);
  if (!keyword) return all;
  const k = keyword.trim().toLowerCase();
  return all.filter((it) => (it.title || '').toLowerCase().includes(k));
}
