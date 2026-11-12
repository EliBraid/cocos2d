# 怪物专属形象

每种怪原来只是 3 种身体（毛球 / 蘑菇 / 角魔）换色。现在每种怪都有 Codex 画的专属部件，做成和 minion 同骨骼、同动画的 Spine 骨骼。

    node tools/monster-rig/template.mjs        # 把毛球怪的 6 个部件（身体/头顶/生气脸/受伤脸/两只脚）排成拆件模板
    node tools/monster-rig/gen-parts.mjs [kind ...]   # Codex 按 LOOK 里的设定逐个重画，存 art-gen/monsters/parts-<kind>.png（3 只并行，可续跑）
    node tools/monster-rig/build.mjs [kind ...]       # 抠图、摆位，输出 assets/resources/battle/mon-rig/<kind>/
    node tools/monster-icons/build.mjs                # 重新渲染图鉴图标 assets/resources/battle/mon/<kind>.png

- 骨骼、插槽、附件名、动画（idle/walk/attack/hit/die/spawn）全部沿用 `battle/minion`，`BattleSlice` 只是换了 SkeletonData 和皮肤 `main`，不再染色。
- 没有专属骨骼的怪会自动退回旧的染色 minion。
- 想重画某只：删掉它的 `parts-<kind>.png`，重跑后三步再 build。
