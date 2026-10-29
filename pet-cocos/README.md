# 微光林地 · 赤焰小狐 v0.6

Cocos Creator 3.8.8 单狐、单场景样件。以完整原画注册坐标重做拆件与绑定；资料、行为、移动、外观、动画分开控制。重点是颈部连接、独立眼嘴、支撑脚 IK、按路程推进步态，以及组合皮肤和围巾染色。

v0.5.1 调整了初始半步、离地/落地缓动、脚掌摆动、重心与头部补偿、重复目标/转向衔接，以及台阶上的身体高度过渡。新走路录像与透明循环预览见 `docs/walk-v06/`。

v0.5.2 重绘连续的正反身体与腿，重绑收拢站姿和脚底，统一待机/走路的低位持剑基准，以整只角色的接触、承重、经过、抬起关键姿态组织动作。最新录像、循环和说明见 `docs/walk-v052/`。

v0.5.3 修正双脚始终各占一侧、无法交替领先的问题，收窄侧向行走的落脚轨迹，减小骨盆侧摆、起伏与抬脚高度。胸腹与两腿从同一原画分出独立网格，保留统一坐标和毛发遮缝，避免交叉时把胯部三角形折到腹部。最新实际录像和正反面循环见 `docs/walk-v053/`；`walk-preview` 是可直接播放的完整原生 Spine 平地循环。

v0.5.4 重新通过 REA 对照原作走路资源与控制器，替换旧脚部轨迹拼接。`AuthoredWalk.ts` 同时设计落脚滚动、膝部折叠、承重、头部补偿和尾巴滞后，并生成完整原生 `walk`、`walk-back`。地形由独立父骨骼适配，不覆盖动作里的踝/趾曲线。实际循环、录像和证据说明见 `docs/walk-v054/`。

v0.5.5 重画四块独立正反手臂及不带手掌的剑，重新绑定肩、肘、手和持剑姿势，肩根由躯干毛发覆盖。背面使用独立上身/摆臂曲线、两条落脚线和纵深步幅，移除侧面翻掌与加速步频。原画、提示词、绑定登记见 `source-assets/fox-v055/`；实际正反循环和场景录像见 `docs/walk-v055/`。

v0.6 重做走路：`ChibiWalk.ts` 统一曲线，0.6 秒短步、每步弹跳与挤压拉伸、头耳尾围巾逐级滞后；支撑脚按地速后移，运行时不再在世界坐标重钉脚，只补地形高度；新增朝镜头的 `walk-front`。对照视频与说明见 `docs/walk-v06-chibi/`，改前文件备份在 `.backup-v055-walk/`。

**当前默认角色：赤焰小狐 ember-1.0（新骨骼）。** 不再从整张立绘切图，改为按关节设计的分层部件 + 代码生成的 Spine 4.2 骨骼与动作，源码在 `tools/ember-fox/`，说明和预览视频见 `docs/ember-fox/`。`assets/scripts/ActiveRig.ts` 可切回旧狐狸。

## 体验

Creator 打开本目录，打开 `assets/scenes/Forest.scene` 并预览。角色、场景与 UI 在运行时创建。

静态构建在 `build/forest-v05`。在工程目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8395
```

访问 http://127.0.0.1:8395/。点地面移动；“摸摸”“表情”改变情绪；“练剑”完成 5 次事件命中；“围巾”切换三种配色；“小憩”睡眠/唤醒；“篝火”走近局部火光。“视角”、右上角缩放与昼夜按钮用于检查不同镜头。

## 重建

```powershell
npm install
npm test
npm run forest:assets
$env:COCOS_CREATOR = '你的安装目录\CocosCreator.exe'
npm run build
```

Node.js 24+。启用本地服务后，`npm run verify:forest` 检查实际 Cocos 浏览器交互；`node tools/record-forest-v05.mjs` 录制实际画面；`node tools/export-fox-frames.mjs` 从原生角色 RenderTexture 导出透明待机帧。自动化默认使用系统 Chrome，可设置 `CHROME_PATH`。录像需要 Playwright 的 ffmpeg。

## 资源与实现

| 入口 | 职责 |
|---|---|
| `assets/scripts/PetProfile.ts` | 身份、职业与外观资料 |
| `assets/scripts/ForestLogic.ts` | 行为、寻路和互动 |
| `assets/scripts/PetMotion.ts` | 加速、制动、路程与落脚相位 |
| `assets/scripts/PetAppearance.ts` | 组合 Skin 与插槽染色 |
| `assets/scripts/ForestPetView.ts` | 身体/脸/视线轨道、脚步及攻击事件 |
| `assets/scripts/ForestWorld.ts` | 透视世界、角色投影、光影和环境 |
| `source-assets/fox-v05/` | 原创底稿、拆件和注册契约 |
| `assets/resources/forest/fox/` | 原生 Spine 4.2.73 JSON、atlas、PNG |
| `docs/REA资产与代码配合-v05.md` | 原作证据、对应实现和当前范围 |
| `docs/forest-v05-art-prompts.json` | 本轮内置 image_gen 完整提示词 |
| `docs/forest-v05-verification/` | 实际渲染截图、采样、GIF、视频与验证 |

头、五官、围巾、尾巴等保留原画注册坐标。v0.5.2 的正反连续身体按独立登记重新绑定到同一骨架，替换不适合走路的旧胸腹/双腿切片。默认围巾插槽为赤色，中性底图可运行时染成海蓝或苔绿。表情只改变眼嘴和眉，外轮廓头图保持不变。步行循环由实际路程推进，根级踝/趾目标与 4 个 IK 分离身体起伏和脚部支撑。

样件包含正反两套外观，胸腹与双腿按同一原画登记分层绑定，头、尾、手臂和剑独立绑定；完整多方向转身和每方向专用攻击尚未制作。场景保留透视、真实台阶、前景遮挡、草丛互动、昼夜与局部火光。暂无声音，未进行微信小游戏发布或手机硬件性能验证。

这是一套可运行、可复用的制作样件，自动检查不能代替动画美术验收。包含原生 Spine 运行数据和生成脚本，不包含编辑器保存的 `.spine` 文件。原作资源与代码没有进入新工程。旧版文档和 ZIP 保留用于对照，默认资源生成器与构建均指向 v0.5。
