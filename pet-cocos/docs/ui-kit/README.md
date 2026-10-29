# UI 素材分工与使用说明

## 分工

| 素材 | 做法 | 位置 |
|---|---|---|
| 按钮、面板、卡片、页签、进度条、角标、品级框、星星、图标 | 代码生成（SVG → 2 倍图 PNG，带九宫格切图参数） | `tools/ui-kit/ui-kit.mjs` → `assets/resources/ui/`、`assets/scripts/ui/UISkin.ts` |
| 登录页主视觉、章节缩略图、宠物立绘 | 本机 Codex CLI 生图 | `tools/imagegen/gen-art.bat` → `art-gen/` → `import-art.mjs` → `assets/resources/home、stages、pets/portrait` |

原则：会拉伸、会有按下/置灰状态、要全游戏统一的，用代码；要绘画质感的，用 Codex。文字一律由引擎渲染，不画进图里。

## 改 UI 皮肤

1. 改 `tools/ui-kit/ui-kit.mjs` 里的颜色或形状（如 `BTN` 按钮配色、`RARITY` 品级色）。
2. 运行 `npm run ui:kit`，重新生成全部 PNG 和 `UISkin.ts`。
3. 回到 Cocos Creator 刷新资源。

代码里用法（`PaperUI`）：

- `ui.btn(parent, id, '文字', x, y, w, h, onTap, 'red' | 'cream' | 'green' | 'gold' | 'blue' | 'grey', 字号, 图标名)`：带按下状态的按钮
- `ui.frame(parent, name, x, y, w, h, 'panel' | 'card' | 'card-gold' | 'card-empty' | 'slot-epic' …)`：可拉伸的底框
- `ui.roundBtn(...)`、`ui.img(parent, 'icon-coin', x, y, size)`、`ui.icon(parent, 'coin', ...)`、`ui.bar(...)`

全部 63 个部件见 `ui-kit-sheet.png`。

## 生成绘画素材

1. 双击 `tools/imagegen/gen-art.bat`（需要本机已登录 Codex CLI 和 Node）。
2. 已经生成的图会跳过，中途关掉再运行会继续。
3. 生成后自动运行 `import-art.mjs`：背景转为 JPG 并缩放；宠物立绘去白底、裁边，存为 PNG。
4. 游戏里登录页、关卡卡片会自动换成新图；没有新图时继续用原来的营地图。

## 上线前

`assets/resources/ui/` 里可以加一个自动图集（Auto Atlas），构建时把这些小图合成一张，减少 Draw Call。
