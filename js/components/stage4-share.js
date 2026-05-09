// 阶段4：渲染分享卡 + 下载/复制 + 朋友文案动态拼接
import { getState } from '../state.js';
import { lifestageByKey } from '../data/lifestages.js';
import { renderToCanvas, exportPng } from '../share/canvas-render.js';
import { restart, showToast } from '../app.js';

let bound = false;

export async function renderStage4(container) {
  const canvas = container.querySelector('#shareCanvas');
  const subEl = container.querySelector('#stage4Sub');
  const txtEl = container.querySelector('#shareText');

  const state = getState();

  // 动态文案
  const friends = Object.entries(state.friends || {}).filter(([, v]) => !!v);
  const stage = lifestageByKey(state.lifeStage);
  const stageLabel = stage ? stage.label : '学生';
  const shareText = buildShareText(friends, stageLabel);
  txtEl.textContent = shareText.body;
  subEl.textContent = shareText.headline;

  // 渲染（canvas 内部会先 await preload 封面）
  try {
    await renderToCanvas(canvas, state);
  } catch (err) {
    console.error('[stage4] canvas render failed', err);
    showToast('生成图片失败，刷新重试');
  }

  if (!bound) {
    container.querySelector('#downloadBtn').addEventListener('click', () => onDownload(canvas, state));
    container.querySelector('#copyTextBtn').addEventListener('click', () => onCopy(buildShareText(getActiveFriends(), getStageLabel()).body));
    container.querySelector('#restartBtn').addEventListener('click', () => {
      if (confirm('清空所有已填内容并重新开始？')) restart();
    });
    bound = true;
  }
}

function getActiveFriends() {
  return Object.entries(getState().friends || {}).filter(([, v]) => !!v);
}

function getStageLabel() {
  const s = lifestageByKey(getState().lifeStage);
  return s ? s.label : '学生';
}

function buildShareText(friends, stageLabel) {
  const names = friends.map(([, v]) => `@${v}`);
  if (names.length === 0) {
    return {
      headline: '长按图片保存，发到动态/小红书让朋友给你接龙。',
      body: `我整理了我的「${stageLabel}」数字成长档案，从小学到现在，把陪我长大的番剧/电影/游戏/UP主都按学籍阶段排了一遍。\n\n你的版本会是什么样？\n\n#我的学籍×精神食粮 #数字成长档案 #毕业季`,
    };
  }
  const namesText = names.join('、');
  return {
    headline: `保存图片，发给 ${namesText}，看看 ta 还记得几个。`,
    body: `${namesText} —— 我把我的「${stageLabel}」数字成长档案整理出来啦。\n这一格格里都是我们一起追过的番、玩过的游戏。\n\n你那一版是什么样？发我看看？\n\n#我的学籍×精神食粮 #数字成长档案 #毕业季`,
  };
}

async function onDownload(canvas, state) {
  try {
    const blob = await exportPng(canvas);
    if (!blob) throw new Error('toBlob returned null');
    const stage = lifestageByKey(state.lifeStage);
    const stageTag = stage ? stage.label : 'me';
    const fileName = `数字成长档案_${stageTag}_${stamp()}.png`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showToast('图片已下载');
  } catch (err) {
    console.error(err);
    showToast('下载失败，长按图片保存');
  }
}

async function onCopy(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('文案已复制');
      return;
    }
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('文案已复制');
  } catch (err) {
    console.warn('copy failed', err);
    showToast('复制失败，请手动选择文字复制');
  }
}

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
