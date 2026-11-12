# 宠物分层骨骼（与赤焰小狐同一套骨骼/动作）
每只宠物用代码画成矢量分层部件（species/*.mjs），由 build-pet.mjs 接到 ember-fox 的骨骼和动画上。
    node tools/pet-rig/build-pet.mjs <species> <outDir>      # 输出 <species>.json/.atlas/.png
    node tools/pet-rig/preview.mjs <species> prev.png       # 静态预览
依赖 ../ember-fox 的 geom/render/rig/anims。
产物放到 assets/resources/pets/rig/<species>/。
