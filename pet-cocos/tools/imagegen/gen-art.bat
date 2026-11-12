@echo off
chcp 65001 >nul
setlocal
REM ============================================================================
REM 萌宠守卫战 · 用本机 Codex CLI 生成"绘画类"素材（背景、关卡缩略图、宠物立绘）。
REM 按钮、面板、图标等 UI 由代码生成（tools\ui-kit），这里不生成。
REM 双击运行。已经生成过的图片会跳过，中途关掉再运行会从断点继续。
REM 生成完自动运行 import-art.mjs，把图片裁剪压缩后放进 assets\resources。
REM ============================================================================
cd /d "%~dp0..\.."
if not exist art-gen mkdir art-gen
set "REF=assets\resources\art\camp.png"
set "STYLE=Style: hand-drawn doodle illustration for a cute casual mobile game, thick dark brown-black ink outlines, light cross-hatching in the shadows, flat warm colors on cream paper, exactly the same art style as the attached reference image. No text, no letters, no numbers, no watermark, no UI."
set "PET=Single cute chibi creature, full body, three-quarter front view, standing, big head and small body, friendly expression, centered with generous empty margin, plain flat pure white background, no ground shadow, nothing else in the picture."
echo [%date% %time%] start > art-gen\_status.txt

REM ---------------------------------------------------------------- 登录页主视觉
call :gen login-keyart "Portrait 1024x1536 key art background for the login screen of a cute pet tower-defense game. A glowing cyan crystal on a ring of grey stones in the middle of a forest camp clearing at golden morning light, wooden fences, a hatchery hut with eggs, bushes and tall trees framing the left and right edges, a few round fluffy shadow monsters with glowing red eyes peeking from the dark bushes at the far left and far right edges. The top 30 percent is calm pale sky and soft treetops with nothing important, reserved for the game logo. The bottom 30 percent is a calm empty dirt clearing, reserved for buttons. No characters in the center. Opaque background."

REM ---------------------------------------------------------------- 4 章关卡缩略图
call :gen stage-ch1 "Landscape 768x512 painted stage thumbnail, chapter Morning Light Forest: a sunny forest clearing with a stone path leading up to an evil red crystal core on a stone base, two dark swirling portals beside it, soft green trees and mushrooms. Opaque background."
call :gen stage-ch2 "Landscape 768x512 painted stage thumbnail, chapter Creek Valley: a shallow blue creek with stepping stones and reeds, small wooden bridges, an evil red crystal core on a rock island, two dark swirling portals on the far bank. Opaque background."
call :gen stage-ch3 "Landscape 768x512 painted stage thumbnail, chapter Rocky Canyon: warm orange canyon walls, boulders and dry grass, a narrow path to an evil red crystal core guarded by stone pillars, two dark swirling portals in the cliff. Opaque background."
call :gen stage-ch4 "Landscape 768x512 painted stage thumbnail, chapter Thunder Plateau: a windy high plateau under purple storm clouds with small lightning bolts, tall grass bending in the wind, an evil red crystal core on a stone altar, two dark swirling portals. Opaque background."

REM ---------------------------------------------------------------- 首发 10 只宠物立绘（也是做骨骼动画的设定图）
call :gen pet-W01 "%PET% Tuantuan Dog: a round fluffy cream-and-brown puppy warrior with floppy ears, a tiny leaf scarf and a small wooden sword, eager and brave."
call :gen pet-G01 "%PET% Shield Turtle: a stout little turtle with a big round grey stone shell shaped like a shield with a paw emblem, sleepy but sturdy, stubby legs."
call :gen pet-G02 "%PET% Moss Dragon: a small chubby green baby dragon covered in soft moss patches with tiny flowers, little stubby wings, a leaf-tipped tail, gentle smile."
call :gen pet-R01 "%PET% Chestnut Sparrow: a plump round chestnut-brown sparrow with a cream belly, carrying a tiny slingshot, alert sharp eyes, small tuft on its head."
call :gen pet-R02 "%PET% Ice Bean Penguin: a tiny round baby penguin with an icy blue scarf, holding a small snowball, frosty sparkles around it, calm focused look."
call :gen pet-M01 "%PET% Flame Chick: a round yellow chick with a little flickering flame crest on its head, tiny wings raised as if casting a spell, cheeky grin."
call :gen pet-M02 "%PET% Moon Fluff Bunny: a soft lavender bunny with very long droopy ears, a tiny crescent moon mark on its forehead, holding a small star wand, dreamy eyes."
call :gen pet-S01 "%PET% Sprout Cat: a small mint-green kitten with a sprouting two-leaf plant on its head, holding a tiny watering can, kind healing smile."
call :gen pet-S02 "%PET% Bell Deer: a small spotted fawn with tiny antlers decorated with little golden bells and ribbons, graceful and gentle pose."
call :gen pet-W04 "%PET% Ember Fox: a small orange fox with a white chest and fluffy tail, wearing a red scarf and holding a short sword, confident determined look."

echo [%date% %time%] generated >> art-gen\_status.txt
echo.
echo 正在导入到 assets\resources ...
call node tools\imagegen\import-art.mjs >> art-gen\_log.txt 2>&1
type art-gen\_log.txt | findstr /b "import"
echo [%date% %time%] done >> art-gen\_status.txt
echo.
echo 全部完成。可以关闭此窗口，回到 Cocos Creator 刷新资源。
pause
exit /b 0

:gen
REM %1 = 文件名（不带扩展名）, %2 = 画面描述
if exist "art-gen\%~1.png" (
  echo skip %~1 （已存在）
  exit /b 0
)
echo generating %~1 ...
echo [%time%] %~1 >> art-gen\_status.txt
REM 默认模型若不被当前账号支持，会依次尝试下面的模型，记住第一个成功的
if defined GOODMODEL (
  call :run %~1 "%~2" %GOODMODEL%
) else (
  for %%M in (gpt-5.5 gpt-5.4 gpt-5.3-codex gpt-5.2-codex gpt-5.2 gpt-5-codex gpt-5) do (
    if not exist "art-gen\%~1.png" (
      call :run %~1 "%~2" %%M
      if exist "art-gen\%~1.png" set "GOODMODEL=%%M"
    )
  )
)
if not exist "art-gen\%~1.png" echo   %~1 失败，详情见 art-gen\_log.txt
exit /b 0

:run
call codex exec "%~2 %STYLE% Save the final PNG image to art-gen/%~1.png in the current working directory." -m %3 -C "%cd%" -s workspace-write --skip-git-repo-check -i "%REF%" >> art-gen\_log.txt 2>&1
exit /b 0
