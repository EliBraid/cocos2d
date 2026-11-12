# 特殊体型宠物骨骼

小狐狸那套两脚站立骨骼套不上的宠物，按体型单独做骨骼和动作，结果仍输出到 `assets/resources/pets/rig/<kind>/`，动作名和攻击判定（0.29 秒）跟其他宠物一致，游戏代码不用区分。

| 体型 | 宠物 | 动作特点 |
|---|---|---|
| quad 四足 | 乌龟 | 对角两条腿交替迈步，攻击是伸头撞，睡觉缩头 |
| flyer 飞行 | 蝙蝠 | 一直悬浮扇翅，攻击俯冲，睡觉落地收翅 |
| blob 圆身 | 章鱼 | 一颠一颠地走，前肢/触手拍动，底座（尾鳍/触手裙）摆动 |

    node tools/creature-rig/gen.mjs [kind ...]     # Codex 按体型拆件图重画，存 art-gen/creature/<kind>.png
    node tools/creature-rig/build.mjs <kind>        # 生成骨骼和动作

海豹试过 blob 体型效果不好，已改回 `tools/layered-rig`（和影鼬一样的两脚骨骼，部件按海豹重画），不要再用本工具生成海豹。

注意：乌龟、蝙蝠、章鱼**不要**再用 `tools/layered-rig/build.mjs` 生成，会被覆盖回狐狸骨骼。
