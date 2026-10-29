@echo off
chcp 65001 >nul
setlocal
REM ============================================================================
REM 萌宠守卫战 · 第二批原画：20 只新宠物立绘 + 第 5-8 章关卡缩略图（本机 Codex CLI）
REM 双击运行。已生成的会跳过，可断点续跑。完成后自动导入 assets\resources。
REM ============================================================================
cd /d "%~dp0..\.."
if not exist art-gen mkdir art-gen
set "REF=assets\resources\pets\portrait\W04.png"
set "REF2=assets\resources\art\camp.png"
set "STYLE=Style: hand-drawn doodle illustration for a cute casual mobile game, thick dark brown-black ink outlines, light cross-hatching in the shadows, flat warm colors, exactly the same art style as the attached reference image. No text, no letters, no numbers, no watermark, no UI."
set "PET=Single cute chibi creature, full body, three-quarter front view, standing, big head and small body, friendly expression, centered with generous empty margin, plain flat pure white background, no ground shadow, nothing else in the picture. Draw it so its head, arms, legs and tail are clearly separated from the body (they will be cut into parts for animation)."
echo [%date% %time%] start batch2 > art-gen\_status2.txt
call :gen pet-N01 "%PET% Spiky Hedgehog: a small round hedgehog guard with soft brown spines, a tiny leaf shield on one arm, shy but determined, stubby legs." "%REF%"
call :gen pet-N02 "%PET% Honey Bear: a chubby warm-brown bear cub guard hugging a small honey pot, round belly, big gentle smile, sturdy stance." "%REF%"
call :gen pet-N03 "%PET% Tiger Cub: an orange striped tiger cub warrior with a tiny red headband and small wooden claws gauntlet, fierce but adorable." "%REF%"
call :gen pet-N04 "%PET% Charging Boar: a round pink-brown baby boar warrior with tiny tusks, a little iron helmet, head lowered ready to charge." "%REF%"
call :gen pet-N05 "%PET% Silver Moon Wolf: a small silver-white wolf pup warrior with a glowing crescent moon mark on its forehead, a short curved blade, flowing blue scarf, noble look." "%REF%"
call :gen pet-N06 "%PET% Pinecone Squirrel: a small orange squirrel archer with a huge fluffy tail, cheeks full, holding a pinecone and a tiny slingshot, mischievous." "%REF%"
call :gen pet-N07 "%PET% Night Owl: a round grey-brown owl archer with big golden eyes, tiny bow, little feather tufts on its head, calm and sharp." "%REF%"
call :gen pet-N08 "%PET% Hoppy Frog: a bright green frog archer with a long sticky tongue sticking out playfully, a small purple poison drop bottle at the belt." "%REF%"
call :gen pet-N09 "%PET% Bubble Seal: a pale blue-grey baby seal mage blowing magical bubbles, a tiny star-topped wand, round and squishy." "%REF%"
call :gen pet-N10 "%PET% Little Star Dragon: a tiny golden-cream baby dragon mage with sparkling star patterns, small glowing wings, a tiny star floating above its head." "%REF%"
call :gen pet-N11 "%PET% Fluffy Sheep: a cloud-white fluffy lamb healer with a soft blue ribbon and a tiny shepherd staff with a bell, sleepy kind face." "%REF%"
call :gen pet-N12 "%PET% Bamboo Panda: a black-and-white panda cub healer holding a cup of green bamboo tea, a bamboo leaf on its head, relaxed smile." "%REF%"
call :gen pet-N13 "%PET% Shadow Weasel: a slim brown weasel assassin with a dark mask over its eyes and a tiny dagger, sneaky crouching pose." "%REF%"
call :gen pet-N14 "%PET% Little Bat: a round purple bat assassin with big ears and wide wings, two tiny fangs, mischievous grin, hovering." "%REF%"
call :gen pet-N15 "%PET% Ninja Cat: a dark grey cat ninja with a navy headband and face scarf, holding a little shuriken, cool confident pose." "%REF%"
call :gen pet-N16 "%PET% Snow Fox: a pure white arctic fox assassin with icy blue eyes, an ice crystal dagger, fluffy tail with frost sparkles." "%REF%"
call :gen pet-N17 "%PET% Hamster Captain: a round golden hamster summoner wearing a tiny captain hat, holding a sunflower seed like a baton, cheeks stuffed." "%REF%"
call :gen pet-N18 "%PET% Mole Miner: a dark brown mole summoner with round glasses and a little miner helmet with a lamp, holding a small shovel." "%REF%"
call :gen pet-N19 "%PET% Butterfly Fairy: a tiny pink fairy creature summoner with large colorful butterfly wings and a flower crown, holding a petal wand." "%REF%"
call :gen pet-N20 "%PET% Little Octopus: a soft pink baby octopus summoner with eight curly tentacles, a tiny wizard hat, friendly smile, floating a little." "%REF%"
call :gen stage-ch5 "Landscape 768x512 painted stage thumbnail, chapter Misty Swamp: a foggy green swamp with lily pads, reeds and twisted roots, a wooden boardwalk path to an evil red crystal core on a mossy rock, two dark swirling portals in the mist. Opaque background." "%REF2%"
call :gen stage-ch6 "Landscape 768x512 painted stage thumbnail, chapter Ice Crystal Snowfield: a bright snowy field with pine trees covered in snow and blue ice crystals, a snowy path to an evil red crystal core on an ice pedestal, two dark swirling portals. Opaque background." "%REF2%"
call :gen stage-ch7 "Landscape 768x512 painted stage thumbnail, chapter Shadow Castle: a spooky but cute purple-grey ruined castle courtyard with broken pillars and glowing lanterns, a stone path to an evil red crystal core, two dark swirling portals. Opaque background." "%REF2%"
call :gen stage-ch8 "Landscape 768x512 painted stage thumbnail, chapter Starry Summit: a mountain peak above the clouds under a deep blue starry night sky with shooting stars, a glowing path to an evil red crystal core on a star altar, two dark swirling portals. Opaque background." "%REF2%"

echo [%date% %time%] generated >> art-gen\_status2.txt
echo 正在导入到 assets\resources ...
call node tools\imagegen\import-art.mjs >> art-gen\_log2.txt 2>&1
echo [%date% %time%] done >> art-gen\_status2.txt
echo 全部完成，可以关闭此窗口。
exit /b 0

:gen
if exist "art-gen\%~1.png" (
  echo skip %~1
  exit /b 0
)
echo generating %~1 ...
echo [%time%] %~1 >> art-gen\_status2.txt
if defined GOODMODEL (
  call :run %~1 "%~2" %GOODMODEL% "%~3"
) else (
  for %%M in (gpt-5.5 gpt-5.4 gpt-5.3-codex gpt-5.2) do (
    if not exist "art-gen\%~1.png" (
      call :run %~1 "%~2" %%M "%~3"
      if exist "art-gen\%~1.png" set "GOODMODEL=%%M"
    )
  )
)
if not exist "art-gen\%~1.png" (echo   %~1 失败 & echo [%time%] FAIL %~1 >> art-gen\_status2.txt)
exit /b 0

:run
call codex exec "%~2 %STYLE% Save the final PNG image to art-gen/%~1.png in the current working directory." -m %3 -C "%cd%" -s workspace-write --skip-git-repo-check -i "%~4" >> art-gen\_log2.txt 2>&1
exit /b 0
