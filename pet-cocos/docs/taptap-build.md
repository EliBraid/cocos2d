# TapTap build and loading diagnosis

The ZIP uploaded as package 418803 / version 0.6.0 contained exactly the 806
files in `build/wechatgame`, with no TapTap conversion. The admission report
(task 40223) reported Android 1/5 passed and iOS 1/1 passed. Four Android
devices reported “小游戏加载失败”. Device logs are still needed to attribute
the individual failures; an uploaded/ready package is not an admission pass.

## Build

1. Build the WeChat intermediate output with the existing Cocos build script.
2. Download official plugin 1.2.2 from the
   [Cocos adapter documentation](https://developer.taptap.cn/minigameapidoc/dev/engine/Cocos-Laya-Egret/).
   The archive used for this repair has SHA-256
   `6b8a9a3cc62b6c54cefab397097babb771d9d99f90442cddff06310a4c9ed73f`.
3. Extract it under the workspace `.work/taptap-tools/plugin-1.2.2/`, or set
   `TAPTAP_CONVERTER_DIR` to the directory containing the plugin package.json.
4. From `pet-cocos`, run `node tools/build-taptap.mjs 0.6.1`.
   If that output already exists, pass a fresh directory inside `build` as
   the second argument. Existing builds are never overwritten.
5. Upload only the resulting `game.zip`. Do not ZIP `build/wechatgame` directly.

The wrapper uses the unmodified official converter, fails on any individual
Babel conversion error, checks the startup dependencies, validates WASM,
and exercises the release entry point's Android/iOS/unknown boot branches
with engine/platform stubs. It writes a SHA-256 manifest beside the ZIP.
These checks do not replace real device tests or verify rendering/gameplay.

The official converter injects the runtime prelude (preserving native fetch
as `GameGlobal.oldFetch`, then disabling global fetch for WeChat-compatible
loading), transforms JavaScript, and writes conversion/version metadata.
No speculative change to the supported Android frame callback is made.

## Release evidence

After upload, inspect the new **package admission report** in the developer
console. The generic CLI `ready` state and `analyze-app-status` returning no
blockers do not report this test result. Keep the previous draft package
binding until the replacement has passed. No store review or release is
performed by these scripts.

## 2026-11-03 first repair candidate (superseded)

- Verified build: `build/taptap-0.6.1-verified/game.zip` (13,214,054 bytes).
- SHA-256: `72cb3b28d65b73603e1001ff823c00aa2b5d52a09e4306dea121dd89780ff1d5`.
- Upload artifact: 36517. Registered development package: **423343 / 0.6.1**.
- Initially registered as `stage=dev`; subsequently submitted to store review as **423343 / 0.6.1**.
- 20 JS syntax checks, 1 WASM validation and three stubbed boot paths passed.
  The original unconverted build is rejected by the new verification gate.
- ZIP CRC passed; no original files lost; 788 files unchanged. Changed files
  are JavaScript compatibility transforms and game.json version metadata;
  check-version.js is the sole added package file.
- Admission task **40661** failed: Android **1/5**, iOS **1/1**. Store audit
  **1195806** was rejected on 2026-11-03 11:58:05 for device test failure
  and missing minigame qualification. Submitting before both requirements
  were verified was premature.
- User explicitly authorized accepting the updated 2026-09-17 TapTap
  minigame developer agreement, but the click has NOT been performed.

## 2026-11-03 cloud API repair (0.6.2)

- Downloaded OPPO and Redmi logs from task 40661. Both startup screenshots
  show `TypeError: d(...).cloud.callFunction is not a function` and
  “主城加载失败”. Evidence is in workspace `outputs/taptap/report-40661-oppo`
  and `outputs/taptap/report-40661-redmi`.
- `Cloud.ts` now requires callable `cloud.init` and `cloud.callFunction`,
  handles initialization rejection, and resolves failed calls to the
  existing offline fallback. A partial TapTap cloud stub no longer blocks
  main-city startup. Supported WeChat cloud behavior is preserved.
- Five isolated runtime compatibility tests passed, including missing APIs,
  synchronous throws, rejected promises, callback failures, and working
  WeChat save/feedback/rank paths. TypeScript check passed.
- In-game legal text now identifies 王怡超 / 1632050253@qq.com, removes
  placeholders, and describes actual local and optional cloud data handling.
- Final package: `build/taptap-0.6.2-final/game.zip`, **13,215,158 bytes**.
- SHA-256: `8554976ff98866cc2d6ae5be4a33bb5c04a31050b9a509b594289b58b0be614d`.
- Official converter 1.2.2; 20 JS checks, one WASM check, three stubbed boot
  checks passed. Build logs are in workspace `outputs/taptap`.
- Uploaded artifact **36563**, registered package **423872 / 0.6.2** at
  **2026-11-03 12:30:58**. The package page subsequently showed **测试通过**
  at approximately 12:41. Screenshot evidence is
  `outputs/taptap/package-423872-test-passed.png` in the workspace. It has
  NOT been resubmitted to store review while qualification remains incomplete.
- Minigame qualification remains **待提交**. Developer identity certification
  is already complete, but qualification requires separate identity/contact
  material, game content documentation, a signed declaration and personal
  electronic verification. Do not infer qualification from generic CLI status.
- Qualification draft now selects **423872 / 0.6.2**. The game content
  DOCX, confirmed copyright owner, game description, name and email are saved.
  The user must supply the remaining identity/contact documents, signed
  declaration and personal verification before qualification submission.
