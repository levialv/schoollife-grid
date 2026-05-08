// 7 个生命阶段元数据 + 网格列派生
export const LIFESTAGES = [
  { key: 'primary', label: '小学',     emoji: '🎒', hint: '童年的快乐源泉' },
  { key: 'junior',  label: '初中',     emoji: '✍️', hint: '青春期的第一次出圈' },
  { key: 'senior',  label: '高中',     emoji: '📐', hint: '熬夜偷看的那年夏天' },
  { key: 'college', label: '大学',     emoji: '🎓', hint: '终于自由的四年' },
  { key: 'master',  label: '研究生',   emoji: '🧪', hint: 'EndNote 与冷番互救' },
  { key: 'work',    label: '初入职场', emoji: '💼', hint: '工作四年以内', columnLabel: '工作' },
  { key: 'old',     label: '成为老登', emoji: '🧓', hint: '回过味的中老年观众', columnLabel: '老登', wide: true },
];

const COLUMN_PROFILE = {
  primary: ['primary', 'forever'],
  junior:  ['primary', 'junior', 'forever'],
  senior:  ['primary', 'junior', 'senior', 'forever'],
  college: ['primary', 'junior', 'senior', 'college', 'forever'],
  master:  ['primary', 'junior', 'senior', 'college', 'master', 'forever'],
  work:    ['primary', 'junior', 'senior', 'college', 'work', 'forever'],
  old:     ['primary', 'junior', 'senior', 'college', 'work', 'old', 'forever'],
};

const COLUMN_LABEL = {
  primary: '小学',
  junior: '初中',
  senior: '高中',
  college: '大学',
  master: '研究生',
  work: '工作',
  old: '老登',
  forever: '一生推',
};

export function lifestageByKey(key) {
  return LIFESTAGES.find((s) => s.key === key);
}

export function columnsForStage(currentKey) {
  const profile = COLUMN_PROFILE[currentKey];
  if (!profile) return [];
  return profile.map((k) => ({ key: k, label: COLUMN_LABEL[k] }));
}

export function labelOfColumn(key) {
  return COLUMN_LABEL[key] || key;
}
