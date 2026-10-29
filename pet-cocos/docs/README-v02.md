# 萌宠守卫战 · 赤焰小狐样板

按提供的界面参考制作的竖屏 Cocos 游戏工程。当前完成一只可培养、可移动、可训练、可实时战斗的宠物。

## 打开与体验

1. 使用 **Cocos Creator 3.8.8** 打开本目录，等待资源导入。
2. 打开 `assets/scenes/Camp.scene`，点击编辑器预览按钮。运行时由 `PetGame` 创建 UI 与 2.5D 场景，因此编辑态画布不代表最终画面。
3. 已构建的浏览器版本在 `build/web-mobile`。在工程目录执行 `powershell -ExecutionPolicy Bypass -File tools/serve.ps1`，访问 `http://127.0.0.1:8392/`。不能直接双击 HTML。

首次进入需勾选体验说明。点击营地地面移动小狐，点击小狐互动；训练场完成五次命中获得20金币。宠物页可喂食、培养升级、预览五种动作；冒险页可进入核心守卫关卡。

## 已实现

- 登录、主城、宠物、阵容、背包、路线地图、战斗与结算界面。
- 奶油色纸张、黑线稿、珊瑚红按钮，配套原创营地与道具插画。
- 赤焰小狐：火焰战士，基础生命1080、攻击112、防御20；局外培养上限20级，默契上限100。
- 原生 `sp.Skeleton` 实时播放 Spine 4.2 数据，21根骨骼、9个加权网格附件。耳朵、尾巴、围巾、手臂有独立骨骼；包含待机、小跑、挥剑、受击、开心、自动眨眼和表情切换。
- Cocos 3D 地面坐标、正交相机、面向镜头的角色/道具平面、深度遮挡、软接触阴影、核心脉动、飘叶、脚步尘土和挥剑反馈。
- 狐狸自动寻敌，Spine 的 `strike` 事件触发命中。每场战斗从1级开始，击杀获得战斗金币和经验，每3次击杀升级；击退6只怪物获胜。胜利结算金币=击杀金币48+通关奖励50。
- 喂食、金币、体力、培养等级与默契保存到当前浏览器本地；战斗中途刷新不会恢复该场战斗。

## 工程结构

| 文件 | 职责 |
| --- | --- |
| `assets/scripts/GameModel.ts` | 资源、培养、局内成长和存档 |
| `assets/scripts/PetBrain.ts` | 移动/攻击/受击状态和一次性命中判定 |
| `assets/scripts/PetView.ts` | Spine 播放、混合和动画事件 |
| `assets/scripts/WorldScene.ts` | 3D 相机、RenderTexture、角色平面、阴影与地面点击 |
| `assets/scripts/GameUI.ts` / `PaperUI.ts` | 竖屏界面、按钮与反馈 |
| `assets/scripts/PetGame.ts` | 训练、怪物生成、战斗与各模块连接 |
| `assets/resources/fox/` | 可直接用于 Cocos 的 Spine JSON、atlas、贴图和拆件 |
| `source-assets/fox-v1/` | 狐狸原始拆件与基础骨架，供重新生成绑定 |
| `tools/build-fox.mjs` | 生成加权网格、骨骼和动画，切分原创道具素材 |
| `docs/verification/` | 真实 Cocos 构建的截图和交互检查报告 |

## 构建与检查

日常编辑和预览无需安装工程 npm 依赖。重新生成绑定、运行自动化检查时使用 Node.js 24+：

```powershell
npm install
npm test
npm run rig:build
$env:COCOS_CREATOR = '你的安装目录\CocosCreator.exe'
npm run build
```

Creator 必须先导入工程，才会生成 `temp/tsconfig.cocos.json`。类型检查可使用 TypeScript 对本目录执行 `tsc --noEmit`；`skipLibCheck` 仅跳过 Creator 自带声明中的兼容问题，项目源码仍检查类型。

自动交互检查要求预览服务已启动，并安装 Chrome 或 Playwright Chromium：

```powershell
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run verify:runtime
```

目前11项单元检查、真实 Creator CLI 构建和11项浏览器交互检查通过。检查覆盖资源消耗、存档恢复、动画实际骨骼变化、地面移动、五次训练命中、六只怪物通关、每场重置等级、撤退后资源释放，以及390×844竖屏点击。浏览器控制台无错误或警告。测试环境为 Windows Chrome 软件 WebGL，不代表已做微信小游戏真机性能验证。

实际运行录屏为 `docs/verification/fox-native-spine.webm`，GIF为同目录的 `fox-native-spine.gif`。录制脚本 `tools/record-preview.mjs` 直接点击 Cocos 中的动作按钮；需要先执行 `npx playwright install ffmpeg` 安装录屏组件。

## 参考方法与制作边界

见 `docs/架构与制作说明.md` 和 `docs/咩咩启示录架构分析.md`。原作仅用于只读架构研究，未复制其角色、动画、贴图或代码进本工程。

当前是**单宠可玩样板**：阵容其他职业、羁绊、孵化抽取、进化换外观和后续地图尚未实现。路线锁定节点会明确提示。无账号后端、支付或联网功能。

营地大背景目前是一张绘画；动态来自飘叶、核心、角色和交互反馈。并非整张背景都已拆层制作。照明使用 unlit 材质与软接触阴影，还没有复刻原作的定制受光、遮罩或复杂投影。

狐狸已有真实骨架与加权网格，但步态、挥剑和表情仍是首版，需要后续逐帧打磨。交付包含 Spine 运行数据与生成脚本，不包含由 Spine 编辑器保存的 `.spine` 工程文件。商用发布前需按使用版本核对 Spine Runtime 的授权要求。

营地及道具通过内置 `image_gen` 生成，固定结果已复制进工程，运行不依赖生成服务。完整提示词保存在 `docs/art-prompts.json`。
