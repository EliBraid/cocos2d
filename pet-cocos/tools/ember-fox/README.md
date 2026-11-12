# Ember Fox (赤焰小狐) rig builder

Layered vector art -> Spine 4.2 skeleton, atlas and animations, generated from code.

    npm i -D @resvg/resvg-js sharp
    node tools/ember-fox/build.mjs assets/resources/forest/ember assets/scripts/EmberRig.ts

| file | role |
|---|---|
| parts.mjs | every body part drawn in one shared 1000x1000 canvas (front 3/4 + back) |
| rig.mjs | bone positions (canvas px) and slot/draw order |
| anims.mjs | all clips as pose functions of time (walk, attack, idle ...) |
| build.mjs | renders parts, packs the atlas, writes ember.json + EmberRig.ts |
| geom.mjs / render.mjs | drawing helpers, SVG -> PNG |

Joints are hidden by construction: limbs rotate on round caps, leg tops tuck
under the body (legs are 2-bone meshes from hip to foot), ear bases sit behind
the head, the scarf covers the neck. To swap in painted art, keep each part's
canvas position and pivot and replace its SVG with an image of the same layer.
