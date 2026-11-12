# 微光林地 · 赤焰小狐 v0.4

Cocos Creator 3.8.8 单狐场景样板。本次重新处理狐狸的完整体态、关节遮盖和原生Spine运动；场景改为透视镜头、分层树墙、真实石阶高台与可切换视角。

## 体验

使用 Creator 3.8.8 打开本目录，打开 `assets/scenes/Forest.scene` 并预览。场景和UI在运行时创建，静态编辑画布只显示启动结构。

已构建版本位于 `build/forest-v04`。工程目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

访问 **http://127.0.0.1:8394/**。点地面移动、点小狐或“摸摸”互动；“练剑”完成5次命中；“小憩”睡眠/唤醒；“篝火”走近火光。“视角”切换真实镜头位置，“表情”选择好奇/受惊/开心；右上切换昼夜与近景。

## 重建与检查

```powershell
npm install
npm test
npm run forest:assets
$env:COCOS_CREATOR = '你的安装目录\CocosCreator.exe'
npm run build
```

Node.js要求24+。预览服务启动后运行 `npm run verify:forest`。自动检查使用系统Chrome，可用 `CHROME_PATH` 指定；录屏为 `node tools/record-forest-v04.mjs`，需要 `npx playwright install ffmpeg`。Creator导入后可执行TypeScript `tsc --noEmit`。

20项逻辑测试通过；真实Creator构建、项目类型检查及10项浏览器交互检查通过。报告、截图、实际Cocos录屏位于 `docs/forest-v04-verification`。自动化检查覆盖透视与相机切换、网格变形、表情与前后朝向、台阶拾取和角色高度、草丛触碰、连续5次命中、昼夜/篝火、睡眠/唤醒及390×844竖屏操作。

## 主要文件

| 路径 | 职责 |
| --- | --- |
| `assets/scripts/ForestSlice.ts` | 资源、UI、点选与互动 |
| `assets/scripts/ForestLogic.ts` | 寻路、行为、命中去重、草丛弹簧 |
| `assets/scripts/ForestPetView.ts` | 原生Spine分轨、皮肤、动画事件 |
| `assets/scripts/ForestWorld.ts` | 透视相机、场景、光影、石阶与环境 |
| `assets/scripts/ForestTerrain.ts` | 台阶高度、射线拾取 |
| `assets/resources/forest/fox/` | 狐狸Spine JSON/atlas/PNG |
| `source-assets/forest-v04/` | 原画与导入拆件 |
| `tools/build-fox-v04.mjs` / `organic-mesh.mjs` | 生成绑定、网格及动作 |
| `docs/forest-v04-implementation.md` | 修改依据、真实实现和制作范围 |
| `docs/forest-v04-art-prompts.json` | 内置image_gen完整提示词 |

身体使用连续绘画与加权网格，头部表情在独立轨道切换完整附件；尚未逐个拆分眼睛和嘴。光照是为手绘素材制作的环境色、局部火光和贴图投影，未复刻原作完整stencil/LUT渲染管线。交付不包含Spine编辑器保存的 `.spine` 文件，包含4.2运行数据、拆件和脚本。

保留旧Camp代码和原始构建脚本；旧版文档在 `docs/README-v02.md`、`docs/README-v03.md`。v0.3交付ZIP和本地静态 `build/forest-web` 可用于对照；本次ZIP只带v0.4静态构建。源码中的旧 `build-forest-rigs.mjs` 是v0.3生成器，请使用默认 `forest:assets` 生成v0.4。

本版是单宠、单场景样板，暂无声音，未做微信小游戏或手机硬件性能验证。所有项目素材为原创生成与本地制作，未将参考游戏资源加入工程；原画固定在工程内，运行不依赖生成服务。
