// 4 个题材元数据
export const CATEGORIES = [
  {
    key: 'anime',
    label: '动画 / 番剧',
    shortLabel: '动画',
    emoji: '📺',
    desc: '童年起就追的番剧、漫改、国创',
    source: 'bangumi',
    bangumiType: 2,
  },
  {
    key: 'movie',
    label: '电影 / 影视',
    shortLabel: '电影',
    emoji: '🎬',
    desc: '反复刷过的院线与电视剧',
    source: 'bangumi',
    bangumiType: 6,
  },
  {
    key: 'game',
    label: '游戏',
    shortLabel: '游戏',
    emoji: '🎮',
    desc: '一起开黑或单机沉迷的伙伴',
    source: 'bangumi',
    bangumiType: 4,
  },
  {
    key: 'upper',
    label: 'B 站 UP 主',
    shortLabel: 'UP主',
    emoji: '📡',
    desc: '陪你长大的常驻创作者',
    source: 'seed',
  },
];

export function categoryByKey(key) {
  return CATEGORIES.find((c) => c.key === key);
}
