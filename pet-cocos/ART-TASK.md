# 交给本地 Claude Code 的任务：画第二批原画

背景：云端 Claude 已经把 20 只新宠物（N01–N20）和第 5–8 章的代码、数据都写好了，游戏里现在用的是换色占位图。
这一步只负责用本机 Codex CLI 生成原画，并导入到 assets/resources。

1. 结束旧脚本：找到命令行里包含 `gen-art2.bat` 的 cmd.exe，以及包含 `art-gen/pet-N` 的 codex 进程，把它们结束。
   旧脚本写死了模型名，现在全部报 model not supported，只会白跑。其它进程不要动。
2. 先单独试一张，确认默认模型能出图（在 pet-cocos 目录下执行）：
   codex exec "画一只可爱的小刺猬，白底，保存为 art-gen/test.png" -C . -s workspace-write --skip-git-repo-check
   - 能生成 art-gen/test.png：删掉这张测试图，进入第 3 步。
   - 不能生成：看报错。如果是模型问题，运行 `codex` 查看可用的模型名，把 tools/imagegen/gen-art3.bat 里 `:run` 那行补上 `-m <可用模型>`。
3. 运行 tools\imagegen\gen-art3.bat。它会生成：
   - 20 张宠物立绘：art-gen/pet-N01.png … pet-N20.png
   - 4 张关卡缩略图：art-gen/stage-ch5.png … stage-ch8.png
   已有的图会跳过，可以断点续跑；进度看 art-gen/_status2.txt，详细日志在 art-gen/_log2.txt。
4. 全部画完后脚本会自动运行 `node tools/imagegen/import-art.mjs`，抠白底、压缩，写进 assets/resources/pets/portrait/Nxx.png 和 stages/ch5-8.jpg。
5. 完成后在 art-gen/_status2.txt 末尾追加一行 `HANDOFF DONE`，云端 Claude 会自己来检查结果，再继续做切部件和拼骨骼。
