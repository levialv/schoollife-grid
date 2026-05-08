// 全局应用状态：单一来源 + localStorage 持久化 + 简易订阅
const STORAGE_KEY = 'schoollife-grid:v1';

export const STAGE_KEYS = ['primary', 'junior', 'senior', 'college', 'master', 'work', 'old', 'forever'];

export function defaultState() {
  return {
    step: 1,
    lifeStage: null,
    categories: [],
    cells: {},
    friends: {},
    updatedAt: 0,
  };
}

let state = loadFromStorage() || defaultState();
const subscribers = new Set();

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed);
  } catch (err) {
    console.warn('[state] load failed', err);
    return null;
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[state] save failed', err);
  }
}

export function getState() {
  return state;
}

export function setState(patch) {
  state = { ...state, ...patch, updatedAt: Date.now() };
  saveToStorage();
  notify();
}

export function setCell(stageKey, catKey, work) {
  const cells = { ...(state.cells || {}) };
  const row = { ...(cells[stageKey] || {}) };
  if (work === null) {
    delete row[catKey];
  } else {
    row[catKey] = work;
  }
  if (Object.keys(row).length === 0) {
    delete cells[stageKey];
  } else {
    cells[stageKey] = row;
  }
  setState({ cells });
}

export function setFriend(stageKey, name) {
  const friends = { ...(state.friends || {}) };
  if (!name) {
    delete friends[stageKey];
  } else {
    friends[stageKey] = name;
  }
  setState({ friends });
}

export function subscribe(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function notify() {
  subscribers.forEach((cb) => {
    try {
      cb(state);
    } catch (err) {
      console.error('[state] subscriber error', err);
    }
  });
}

export function resetState() {
  state = defaultState();
  saveToStorage();
  notify();
}
