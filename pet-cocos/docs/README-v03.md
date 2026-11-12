# 微光林地 · 赤焰小狐 v0.3

用 Cocos Creator 3.8.8 制作的一只狐狸和一块可交互的2.5D森林场景，重点展示原生 Spine 动作、独立表情、前后换肤、场景分层、昼夜火光与环境互动。

## 打开与体验

1. 使用 **Cocos Creator 3.8.8** 打开本目录，等待资源导入。
2. 打开 `assets/scenes/Forest.scene`，点击预览。场景和UI由 `ForestSlice` 运行时创建，编辑态画布不代表最终画面。
3. 已构建版本在 `build/forest-web`。工程目录执行 `powershell -ExecutionPolicy Bypass -File tools/serve.ps1`，访问 **http://127.0.0.1:8393/**。不能直接双击 HTML。

点地面移动，点狐狸或“摸摸”互动；“练剑”会寻路到靶前完成5次挥剑；“小憩”可以睡眠/唤醒；“篝火”会靠近火光。“表情”可选好奇、受惊和开心；右上角切换昼夜与近景。

## 本版内容

- 28根骨骼、16个插槽、前后两套皮肤，19个身体/表情/视线动画片段；原生 Spine 4.2 实时播放，包含加权网格与实际 deform 时间线。
- 起步、停止、转向、前后行走、蓄力挥剑、受击、开心、嗅闻、睡眠和唤醒；身体与眼睛/嘴部表情分轨，耳朵、尾巴、围巾独立运动。
- 地面、前后树木、草、蕨类、石头、火把、晶石和靶子分层摆放；3D深度遮挡、前景遮挡淡化、相机跟随与缩放。
- 昼夜环境色、按距离变化的局部火光、轮廓投影和软接触阴影；Spine火焰、火星、萤火虫、飘叶、风吹草木。
- 草丛随接触方向弯曲并回弹；原生脚步触发尘土，原生攻击事件触发靶子回弹和斩击反馈；有障碍寻路。

## 构建与检查

日常编辑和预览无需安装工程 npm 依赖。重建素材或运行自动化检查使用 Node.js 24+：

```powershell
npm install
npm test
npm run forest:assets
$env:COCOS_CREATOR = '你的安装目录\CocosCreator.exe'
npm run build
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

服务启动后，在另一个终端执行 `npm run verify:forest`；自动检查默认使用系统 Chrome，可通过 `CHROME_PATH` 指定路径。录屏脚本是 `node tools/record-forest.mjs`，需先执行 `npx playwright install ffmpeg`。

目前 **18项单元测试、真实 Creator 构建、9项浏览器交互检查通过**。浏览器运行无错误或警告。检查覆盖真实原生骨骼/网格变形、前后换肤、表情、草丛触碰、连续5次训练命中、昼夜、篝火、睡眠与390×844竖屏点击。报告和实际运行截图/视频在 `docs/forest-verification`。Creator 导入后会生成 `temp/tsconfig.cocos.json`，可执行 TypeScript `tsc --noEmit`。

## 源文件

| 路径 | 用途 |
| --- | --- |
| `assets/scripts/ForestSlice.ts` | 场景入口与竖屏互动 |
| `assets/scripts/ForestLogic.ts` | 寻路、动作状态和草丛弹簧 |
| `assets/scripts/ForestPetView.ts` | 原生 Spine 播放、表情、换肤和事件 |
| `assets/scripts/ForestWorld.ts` | 3D场景、相机、光影和环境互动 |
| `assets/resources/forest/fox/` | 狐狸 Spine JSON、atlas、PNG |
| `assets/resources/forest/fire/` | 火焰 Spine JSON、atlas、PNG |
| `assets/resources/forest/ink-light.effect` | 自定义风摆与局部受光材质 |
| `source-assets/forest-v03/` | 原画、参考和独立拆件 |
| `tools/build-forest-assets.mjs` / `build-forest-rigs.mjs` | 可重复的拆件和骨架生成脚本 |
| `docs/forest-v03-architecture.md` | 实现结构、检查范围与制作边界 |
| `docs/forest-v03-art-prompts.json` | 内置 image_gen 的完整提示词和素材路径 |

保留旧版 `Camp.scene` 及养成、地图、战斗代码；`build-camp-v02.json` 保存旧构建设置。旧版说明另存 `docs/README-v02.md`，旧版检查脚本为 `npm run verify:runtime`，其默认端口为8392。

## 制作范围

原作仅用于架构研究，狐狸、场景贴图、骨架和代码均来自本工程的原创素材及实现。美术通过内置 image_gen 生成并固定在本地。这里实现的是定制色彩受光和贴图轮廓投影，未使用实时阴影贴图或物理光照。

当前是一只宠物与一块场景的质量样板；动画仍可逐帧打磨，暂无声音，尚未做微信小游戏或手机真机性能验证。交付包含 Spine 4.2 JSON/atlas/PNG、拆件及生成脚本，不包含 Spine 编辑器保存的 `.spine` 文件。正式发布时按使用的 Spine Runtime 版本配置授权。
