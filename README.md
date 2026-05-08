# 生涯内容表 demo

毕业季活动 demo：用学籍阶段（小学→初中→高中→大学→研究生→初入职场→老登）作为时间轴，沿着「动画 / 电影 / 游戏 / B站 UP 主」四个题材回顾自己的精神生活，最后生成一张可分享的「生涯内容表」图片。

参考开源项目：
- itorr/anime-grid（交互模式）
- SomiaWhiteRing/my9（产品概念）
- 题材数据：Bangumi.tv（动画/电影/游戏，经 lab.magiconch.com 代理） + 静态 B站百大 UP 主名单

## 启动

无构建步骤。在项目根目录起一个静态服务器即可：

```bash
# 任选其一
python3 -m http.server 5173
# 或
npx http-server -p 5173
```

然后浏览器访问 [http://localhost:5173/](http://localhost:5173/) 。建议用 Chrome DevTools 的设备模拟（iPhone 14 Pro 或 Pixel 7）查看，整体按移动端宽度 480px 设计。

> 直接双击 index.html 用 file:// 打开会因 ES Module + fetch 限制无法正常加载，请务必走本地静态服务器。

## 走查流程

1. 阶段 1：选择当前生命阶段（决定网格列数）
2. 阶段 2：多选想回顾的题材（决定网格行数）
3. 阶段 3：逐格点击，从精选推荐里挑作品；动画/电影/游戏可输入关键字搜 Bangumi。每列下方可填一个一起追的朋友昵称（可跳过）
4. 阶段 4：自动生成 750×N 的分享卡，可保存图片 / 复制文案 / 重新开始

刷新页面会保留已填内容（localStorage），可随时回到第 1 步。

## 目录速览

```
schoollife-grid/
├── index.html                     单一入口
├── css/
│   ├── reset.css                  轻量 reset
│   ├── theme.css                  色板/字号/圆角变量（B站粉 #FB7299 + 蓝 #00A1D6）
│   ├── layout.css                 移动优先布局 + 安全区
│   └── components.css             步骤条/卡片/chip/网格/picker/toast
├── js/
│   ├── app.js                     主控：路由 stage、按钮事件、toast
│   ├── state.js                   appState + localStorage + 简易订阅
│   ├── data/
│   │   ├── lifestages.js          7 个生命阶段元数据 + 列派生
│   │   ├── categories.js          4 个题材元数据
│   │   ├── seed-anime.js          番剧静态种子（按生命阶段标签）
│   │   ├── seed-movie.js          电影静态种子
│   │   ├── seed-game.js           游戏静态种子
│   │   ├── seed-uppers.js         B站百大 UP 主静态名单
│   │   └── seeds.js               聚合：按 catKey/stageKey 取数据 + 关键词过滤
│   ├── api/
│   │   └── bangumi.js             Bangumi 搜索（lab.magiconch.com 代理 + 超时降级）
│   ├── components/
│   │   ├── stage1-life.js         阶段1：生命阶段单选
│   │   ├── stage2-cats.js         阶段2：题材多选
│   │   ├── stage3-grid.js         阶段3：网格表 + 朋友输入 + 长按清空
│   │   ├── stage4-share.js        阶段4：分享卡 + 下载/复制
│   │   └── work-picker.js         通用底部弹层：精选 + 搜索
│   └── share/
│       └── canvas-render.js       Canvas 绘制 750×N 分享图（含跨域封面回退）
├── assets/
│   └── icons/                     题材/装饰图标位（占位目录）
└── 生涯内容表需求.md
```

## 设计要点

- **状态单一来源**：`js/state.js` 持有 `appState`，所有组件通过 `getState/setState/subscribe` 操作，自动持久化到 `localStorage`。
- **阶段路由**：`js/app.js` 里 `gotoStep(n)` 控制 `<section data-stage="n">` 的显隐 + 步骤条 + 底部按钮文案/启用态。
- **picker 防抖与降级**：搜索 320ms 防抖，立刻反馈本地命中，再异步追加 Bangumi 搜索结果；Bangumi 失败/超时时不影响已展示的本地结果。
- **Canvas 跨域回退**：远程封面用 `crossOrigin='anonymous'` + 4.5s 超时；失败时落到色块 + emoji 卡，保证渲染永远成功，不阻塞分享。
- **朋友昵称文案动态拼接**：阶段 4 检查 `state.friends` 中所有非空昵称，按出现顺序拼为 `@xx、@yy`，分享文案自动改为「发给 @xx、@yy 试试」。
