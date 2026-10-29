# 手绘分层骨骼（战斗 / 主城宠物）

做法和赤焰小狐的新骨骼一样：分层部件 + 代码生成的 Spine 4.2 骨骼和动作（`tools/ember-fox/rig.mjs`、`anims.mjs`），
区别是部件不再用代码画矢量，而是让 Codex 按每只宠物的立绘画风重画一张"拆件图"，所以战斗里的样子和立绘一致。

1. `node tools/layered-rig/template.mjs` —— 把小狐狸的可动部件（头、身体、尾巴、两只耳朵、两条手臂、两条腿、手持物）
   炸开排成 10 个格子，输出 `template.png` / `template.json`。关节在设计时就藏好：手臂是圆头胶囊、腿的上端藏进身体、耳根藏在头后。
2. `node tools/layered-rig/gen-parts.mjs [kind ...]` —— 每只宠物：Codex 拿 template.png + 立绘，按同样的格子画出这只宠物的部件，
   存到 `art-gen/parts/parts-<kind>.png`。3 只并行，已画好的跳过，可断点续跑。宠物描述和"翅膀放哪个格子"等写在脚本里的 `PETS`。
3. `node tools/layered-rig/build.mjs <kind>` —— 抠出每个格子的部件，按小狐狸对应部件的位置和关节摆好（耳朵贴到头顶实际轮廓上），
   打成 2 的幂尺寸的图集，绑到小狐狸骨骼和动作上，输出 `assets/resources/pets/rig/<kind>/`。已有 .meta 保留，uuid 不变。
4. `node tools/layered-rig/shoot-battle.mjs <outDir> [kind,...]` —— build 后起 8395 服务，用无头 Chrome 截主城和战斗。

某只画得不满意：删掉 `art-gen/parts/parts-<kind>.png`，重跑 2、3 步再 build 即可。
游戏里 `BattleSlice` / `HomeSlice` 会给每只宠物加载 `pets/rig/<kind>`，没有的才退回 `PET_LOOK.base` 的染色骨骼。
