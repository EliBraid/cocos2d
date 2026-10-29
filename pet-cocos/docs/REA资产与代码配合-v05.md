# 原作资产如何与代码配合，以及狐狸 v0.5 的实现

本轮使用 REA 6.7.0 的实际 stdio MCP 读取用户指定的本地《咩咩启示录》程序集，结合前轮对同一安装目录的 Unity 序列化资产及原始 Spine 骨架检查。结论是：品质来自整套制作约定——注册一致的绘画与绑定、按语义组织的资产、控制器分工、动作过渡，以及角色与环境的反馈。

## 能对应上的资产与代码

| 责任 | 原作实际证据 | 狐狸样件中的对应实现 |
|---|---|---|
| 角色资料 | `FollowerInfo` 保存 SkinCharacter、SkinVariation、SkinColour、服装与帽子等选择资料 | `PetProfile.ts` 保存身份、职业和外观选择，不负责绘画 |
| 行为决策 | `FollowerBrain.Tick` 处理状态与任务；Follower 再响应动作与移动接口 | `ForestBrain` 决定移动、练剑、开心、受惊、闻嗅和睡醒 |
| 移动 | `Follower.UpdateMovement`，token `0x06002670`，普通路径分支有加速、速度限制、路径段进度插值；不能把其他分支的衰减概括为全部停止策略 | `PetMotor` 处理实际路径位移、加速与制动，累计真实移动距离 |
| 外观组合 | `FollowerOutfit.SetOutfit`（`0x060026c1`）调用 `FollowerBrain.SetFollowerCostume`（`0x06002884`）；后者创建 Skin，FindSkin/AddSkin，SetSkin，再恢复插槽绑定姿态与设置颜色 | `PetAppearance` 组合身体、围巾、剑三份 Skin；缓存组合结果；只给围巾插槽染色 |
| 动物配色 | `FollowerPet.UpdateSkin`（`0x060025cc`）组合皮肤，再调用 AnimalData.GetAnimalColors、FindSlot、SetColor | 围巾源图先做中性底色，赤焰/海蓝/苔绿由资料驱动；毛发、剑、徽章保留原色 |
| 身体、脸和情绪 | Follower.SetBodyAnimation（`0x06002679`）、SetFaceAnimation（`0x06002678`）、SetEmotionAnimation（`0x0600267b` 等）分别提供入口 | 身体 track 0，眼嘴表情 track 1，视线 track 2；表情不替换外轮廓整头 |
| 骨架与脚步 | 原作 Fox 普通 walk 约 0.867 秒，根级脚部控制、两组腿 IK 与两组脚掌 IK；有脚步事件，普通 walk 没有 DeformTimeline | 根级踝与趾目标、4 个原生 IK；身体步态按位移距离推进；支撑脚保留世界位置，摆动脚抬起再落地 |
| 动画事件 | 动作资产提供脚步等时间点，代码监听事件分发反馈 | step-left/right 触发足尘；strike 在挥剑命中时触发训练靶反馈，且每次攻击只结算一次 |
| 场景空间 | 开场世界相机资产保存透视设置；树、火把等绘画平面有空间角度，地面、前景、雾与阴影分层 | Cocos 透视世界相机、分角度绘画卡片、真实台阶高度、前景遮挡、局部火光和草丛弹簧 |

`FollowerPet` 的动物配色路线与普通 Follower 的服装路线是两条已分别确认的调用链。`SpineExtensions.SetFaceAnimation` 中另有用于 SkeletonGraphic 的 UI 重载，不能当成世界角色的实现证据。

原作保存的 `.skel.bytes` 负责骨骼、插槽、网格、皮肤和动作曲线；atlas 把附件名映射到贴图区域；SkeletonData 和动画配置资产保存骨架引用及混合设置；Prefab 再把这些资源、材质与控制组件接起来。代码通过这些约定选择外观和动作，而不是在 Tick 中重新拼像素。

## 为什么之前会显得拼装和僵硬

之前分别生成、裁切整头和身体，再把不同零件缩放到人为指定的尺寸。头的旋转支点又落在头图中央，表情还会换掉整头。即使每张图片单独好看，组合后颈部也会错位。

v0.5 从用户认可的完整狐狸原画重新拆件。所有部件使用同一 1280×1280 画布、同一原点与像素比例；裁切偏移写入 registration.json，再从这个记录计算附件和逆绑定坐标。AI 只补隐藏区域、无五官面板、中性围巾与独立表情素材，外轮廓仍取原画。静止画面不靠单独缩放头或腿重新拟合。

头支点移到颈部附近，重新计算绑定使原画位置保持不变。眼、眉、鼻、嘴有自己的插槽与骨骼。肩、胯隐藏区有覆盖；头、耳、尾巴、围巾与手臂有不同节奏，避免所有部分同相摆动。普通步行不堆 FFD 数量：先把身体重心、摆腿、支撑与步幅配合做好。

移动也不再是等待起步动画后立刻切到恒速。空间速度逐渐变化，步态相位来自实际路程。支撑脚目标不继承身体呼吸和起伏；腿链由原生 Spine 求解。路径瞬移或正反面切换会重置落脚状态，避免沿用远处旧支撑点。

## 工程与资源入口

- `assets/scripts/PetProfile.ts`：资料与配色。
- `assets/scripts/ForestLogic.ts`：行为与寻路。
- `assets/scripts/PetMotion.ts`：移动和落脚相位。
- `assets/scripts/PetAppearance.ts`：组合 Skin、插槽染色。
- `assets/scripts/ForestPetView.ts`：身体、表情、视线轨道与事件。
- `assets/scripts/FoxRig.ts`：由绑定契约生成的骨骼目标与命名。
- `assets/scripts/ForestWorld.ts`：角色纸片在 3D 世界中的投影、环境与接触。
- `source-assets/fox-v05/`：原创底稿、注册坐标、拆件、绑定契约。
- `assets/resources/forest/fox/fox.json + fox.atlas + fox.png`：实际在 Cocos 播放的 Spine 4.2.73 数据。
- `tools/build-fox-v05-art.mjs` 与 `tools/build-fox-v05.mjs`：可重建拆件和骨架的流程。

默认围巾插槽保存赤色，底图为中性灰白，导入后仍可直接显示赤色。游戏中的外观模块可覆盖颜色。组合 Skin 使用本版本 Cocos 内置原生运行时；其中原生骨架访问封装在 PetAppearance 中，升级引擎时应复核该接口。

## 验证与当前范围

`forest-v05-verification/` 保存实际 Cocos WebGL 截图、运行检查、原生脚部采样和视频。脚部采样比较的是原生脚踝骨骼与踝目标，不能等同于像素脚底摩擦或原作游戏的测量。GIF 从 Cocos 的 RenderTexture.readPixels 导出，透明背景，表情和身体由原生 Spine 计算。

本轮修复了场景地面视野覆盖和脚掌下缘裁切，但场景的整套美术统一仍有空间。背面目前使用一张整体加权网格；正反面切换仍是两套外观，尚未制作完整的多方向转身和每个方向专用的攻击动作。技术结构相近不能据此称作原作级品质。

挥剑按 8 个实际原生姿态检查了 RenderTexture 的透明边界与最低轮廓。修正了原先过低的剑尖轨迹，并扩大渲染留白、同时保持每个 Spine 单位对应的世界尺寸不变，避免剑尖被角色纹理边缘截断。

## REA 证据定位

本轮父证据：`ev_90da21f3529165939b42c4d82c00aa3db6cf0086cb613436823eb883f675efd2`。选定范围为 8 个类型、375 个方法、337 个字段、4105 条调用、2313 条字段访问及 174 条字符串，分页完整，未报告缺失。

证据目录为项目同级的 `outputs/cult-lamb-asset-contract-20261025/`：`rea-asset-code-evidence.json` 是 REA 原生导出，`asset-code-collections.json` 是分页集合，`asset-binding-methods.json` 是按 token 摘出的调用链。原程序集 SHA-256 为 `88272efd174dbc43f97fbd2f840c626ea64c68cef0ec7846f8bb4b4705dc30ba`。

原始 Fox 骨架取样和移动算术的补充证据见 `outputs/cult-lamb-detail-20261025/`，场景/渲染配置复核见 `outputs/cult-lamb-revisit-20261025/`。UnityPy 序列化解析及官方 Spine 解码是补充证据，未冒充 REA 原生结果；没有本轮原作 GPU 抓帧，不能据静态材质参数确认每帧启用了哪些 pass。

原游戏的代码、图集、骨架与纹理没有打入新工程。交付的是原创狐狸、自己的 TypeScript 实现、原生运行数据与构建流程；不含 Spine 编辑器保存的 `.spine` 文件。
