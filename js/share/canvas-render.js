// canvas 分享图绘制：把 appState 渲染成 750xN 的 PNG
import { columnsForStage, lifestageByKey } from '../data/lifestages.js';
import { categoryByKey } from '../data/categories.js';

const SCALE = 2;
const W = 750; // logical width
const PAD = 32;
const ROW_HEAD_W = 92;
const CELL_RATIO = 4 / 3; // height = width * ratio
const CELL_GAP = 10;

const COLORS = {
  bg: '#FFFFFF',
  bgGrad1: '#FFE2EC',
  bgGrad2: '#DCF1FA',
  primary: '#FB7299',
  primaryDeep: '#E14D7A',
  accent: '#00A1D6',
  text: '#18191C',
  textMuted: '#61666D',
  textFaint: '#9499A0',
  line: '#ECECEE',
  card: '#FFFFFF',
};

const FONT = '"PingFang SC","Microsoft YaHei","Heiti SC","Apple Color Emoji",sans-serif';

const imageStore = new Map(); // src -> HTMLImageElement | null（加载失败也记录 null 不再重试）

function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (imageStore.has(src)) return Promise.resolve(imageStore.get(src));
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      imageStore.set(src, v);
      resolve(v);
    };
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    setTimeout(() => finish(null), 4500);
    img.src = src;
  });
}

async function preload(state) {
  const cols = columnsForStage(state.lifeStage);
  const cats = (state.categories || []).map(categoryByKey).filter(Boolean);
  const urls = new Set();
  for (const cat of cats) {
    for (const col of cols) {
      const w = state.cells?.[col.key]?.[cat.key];
      if (w?.cover) urls.add(w.cover);
    }
  }
  await Promise.all([...urls].map(loadImage));
}

export async function renderToCanvas(canvas, state) {
  await preload(state);

  const cols = columnsForStage(state.lifeStage);
  const cats = (state.categories || []).map(categoryByKey).filter(Boolean);
  const stage = lifestageByKey(state.lifeStage);

  const colCount = Math.max(cols.length, 1);
  const cellW = Math.floor((W - PAD * 2 - ROW_HEAD_W) / colCount);
  const cellH = Math.floor(cellW * CELL_RATIO);

  // 高度计算
  const headerHeight = 168;
  const colHeadH = 36;
  const friendH = 36;
  const dataGap = 18;
  const rowSpacing = 18;
  const footerH = 96;
  const totalRows = Math.max(cats.length, 1);
  const gridH = colHeadH + friendH + dataGap + totalRows * cellH + Math.max(totalRows - 1, 0) * rowSpacing;
  const H = headerHeight + gridH + footerH + 24;

  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

  // 1. 渐变底
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, COLORS.bgGrad1);
  grad.addColorStop(0.5, '#FFFFFF');
  grad.addColorStop(1, COLORS.bgGrad2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 2. 顶部装饰条
  ctx.fillStyle = COLORS.primary;
  drawRoundRect(ctx, PAD, 32, 6, 28, 3);
  ctx.fill();

  // 3. 标题
  ctx.fillStyle = COLORS.text;
  ctx.font = `700 36px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('我的数字成长档案', PAD + 18, 28);

  // 4. 副标题
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = `400 16px ${FONT}`;
  const subtitle = stage
    ? `${stage.label} · ${friendlyDate(state.updatedAt || Date.now())}`
    : friendlyDate(state.updatedAt || Date.now());
  ctx.fillText(subtitle, PAD + 18, 76);

  // 5. 阶段 chip
  if (stage) {
    const chipText = `${stage.emoji} ${stage.label}`;
    ctx.font = `600 15px ${FONT}`;
    const chipPadding = 14;
    const chipTextW = ctx.measureText(chipText).width;
    const chipW = chipTextW + chipPadding * 2;
    const chipH = 32;
    const chipX = PAD + 18;
    const chipY = 110;
    ctx.fillStyle = COLORS.primary;
    drawRoundRect(ctx, chipX, chipY, chipW, chipH, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(chipText, chipX + chipPadding, chipY + chipH / 2);
  }

  // 5b. 顶部右侧 hashtag
  ctx.font = `500 13px ${FONT}`;
  ctx.fillStyle = COLORS.accent;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText('#我的学籍×精神食粮', W - PAD, 126);
  ctx.textAlign = 'left';

  // 6. 网格
  const gridTop = headerHeight;
  const gridLeft = PAD;
  const colStartX = gridLeft + ROW_HEAD_W;

  // 列头
  ctx.font = `700 16px ${FONT}`;
  ctx.fillStyle = COLORS.primaryDeep;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  cols.forEach((col, i) => {
    const x = colStartX + i * cellW + cellW / 2;
    ctx.fillText(col.label, x, gridTop + colHeadH / 2);
  });

  // 朋友行
  ctx.font = `400 12px ${FONT}`;
  cols.forEach((col, i) => {
    const x = colStartX + i * cellW + cellW / 2;
    const friend = (state.friends || {})[col.key];
    if (friend) {
      ctx.fillStyle = COLORS.accent;
      ctx.fillText(`📮 ${friend}`, x, gridTop + colHeadH + friendH / 2);
    } else {
      ctx.fillStyle = COLORS.textFaint;
      ctx.fillText('—', x, gridTop + colHeadH + friendH / 2);
    }
  });

  // 数据行
  const dataTop = gridTop + colHeadH + friendH + dataGap;
  if (cats.length === 0) {
    ctx.fillStyle = COLORS.textFaint;
    ctx.textAlign = 'center';
    ctx.font = `400 16px ${FONT}`;
    ctx.fillText('未选择题材', W / 2, dataTop + 30);
  }

  for (let r = 0; r < cats.length; r++) {
    const cat = cats[r];
    const rowY = dataTop + r * (cellH + rowSpacing);

    // 行标
    ctx.fillStyle = COLORS.text;
    ctx.font = `400 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cat.emoji, gridLeft + ROW_HEAD_W / 2, rowY + cellH / 2 - 14);
    ctx.font = `600 14px ${FONT}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(cat.shortLabel, gridLeft + ROW_HEAD_W / 2, rowY + cellH / 2 + 22);

    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      const x = colStartX + c * cellW + CELL_GAP / 2;
      const y = rowY;
      const w = cellW - CELL_GAP;
      const h = cellH;
      const work = state.cells?.[col.key]?.[cat.key];
      drawCell(ctx, x, y, w, h, work);
    }
  }

  // 7. footer
  const footerY = H - footerH - 16;
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = `500 14px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('🎉 我的数字成长档案 · @bilibili', PAD, footerY + 24);
  ctx.fillStyle = COLORS.textFaint;
  ctx.font = `400 12px ${FONT}`;
  ctx.fillText('扫码或长按识别 → 生成你的同款', PAD, footerY + 50);
  drawDecoQR(ctx, W - PAD - 60, footerY + 16, 60);

  return canvas;
}

function drawCell(ctx, x, y, w, h, work) {
  if (!work) {
    ctx.save();
    drawRoundRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = COLORS.line;
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = COLORS.textFaint;
    ctx.font = `400 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('—', x + w / 2, y + h / 2);
    return;
  }

  ctx.save();
  drawRoundRect(ctx, x, y, w, h, 12);
  ctx.clip();

  const img = work.cover ? imageStore.get(work.cover) : null;
  if (img) {
    drawImageCover(ctx, img, x, y, w, h);
  } else {
    ctx.fillStyle = work.color || '#888';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `400 56px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(work.emoji || '🎬', x + w / 2, y + h / 2 - 6);
  }

  // 渐变蒙版让标题可读
  const gradMask = ctx.createLinearGradient(0, y + h * 0.4, 0, y + h);
  gradMask.addColorStop(0, 'rgba(0,0,0,0)');
  gradMask.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.fillStyle = gradMask;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = '#fff';
  ctx.font = `700 14px ${FONT}`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  drawWrappedText(ctx, work.title, x + 10, y + h - 10, w - 20, 18, 2);

  ctx.restore();
}

function drawImageCover(ctx, img, x, y, w, h) {
  if (!img.width || !img.height) {
    ctx.fillStyle = '#ccc';
    ctx.fillRect(x, y, w, h);
    return;
  }
  const ir = img.width / img.height;
  const cr = w / h;
  let sx, sy, sw, sh;
  if (ir > cr) {
    sh = img.height;
    sw = img.height * cr;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = img.width / cr;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawWrappedText(ctx, text, x, y, maxW, lineH, maxLines) {
  if (!text) return;
  const chars = [...text];
  const lines = [];
  let cur = '';
  let idx = 0;
  while (idx < chars.length && lines.length < maxLines) {
    const ch = chars[idx];
    const test = cur + ch;
    if (ctx.measureText(test).width > maxW && cur.length) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
    idx++;
  }
  if (cur && lines.length < maxLines) {
    lines.push(cur);
  } else if (idx < chars.length && lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length && ctx.measureText(last + '…').width > maxW) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last + '…';
  }
  for (let i = lines.length - 1; i >= 0; i--) {
    ctx.fillText(lines[i], x, y - (lines.length - 1 - i) * lineH);
  }
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawDecoQR(ctx, x, y, size) {
  ctx.fillStyle = COLORS.text;
  drawRoundRect(ctx, x, y, size, size, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  const dot = size / 14;
  let h = 1469598103;
  const seedString = 'schoollife-grid';
  for (let i = 0; i < seedString.length; i++) h = (h ^ seedString.charCodeAt(i)) * 16777619 >>> 0;
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 12; c++) {
      h = (h * 1103515245 + 12345) >>> 0;
      if ((h & 1) === 1) {
        ctx.fillRect(x + dot + c * dot, y + dot + r * dot, dot - 1, dot - 1);
      }
    }
  }
  // 三个角
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + dot, y + dot, dot * 3, dot * 3);
  ctx.fillRect(x + size - dot * 4, y + dot, dot * 3, dot * 3);
  ctx.fillRect(x + dot, y + size - dot * 4, dot * 3, dot * 3);
  ctx.fillStyle = COLORS.primary;
  ctx.fillRect(x + dot * 1.5, y + dot * 1.5, dot * 2, dot * 2);
  ctx.fillRect(x + size - dot * 3.5, y + dot * 1.5, dot * 2, dot * 2);
  ctx.fillRect(x + dot * 1.5, y + size - dot * 3.5, dot * 2, dot * 2);
}

function friendlyDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export async function exportPng(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
  });
}
