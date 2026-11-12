# 灵爪守望

基于 Cocos Creator 3.8.8 的宠物养成与自动战斗小游戏。工程位于 `pet-cocos/`，包含营地、宠物与装备养成、关卡战斗、平台适配和云函数源码。

## 本地运行

1. 安装 Cocos Creator **3.8.8** 和 Node.js **24 或更高版本**。
2. 在 `pet-cocos/` 目录执行 `npm ci`。
3. 使用 Cocos Creator 打开 `pet-cocos/`，等待资源导入完成。
4. 打开 `assets/scenes/Home.scene` 预览主界面；`assets/scenes/Battle.scene` 为战斗场景。

```powershell
cd pet-cocos
npm ci
npm test
```

## 构建

在 `pet-cocos/` 下设置编辑器路径，然后执行构建脚本：

```powershell
$env:COCOS_CREATOR = 'C:\path\to\CocosCreator.exe'
npm run build

# 微信小游戏
powershell -NoProfile -ExecutionPolicy Bypass -File tools/build.ps1 -Config build-config-wechat.json

# 小红书适配构建
powershell -NoProfile -ExecutionPolicy Bypass -File tools/build.ps1 -Config build-config-xhs.json
```

平台发布前请配置自己的 AppID、云环境和广告配置。云函数位于 `pet-cocos/cloudfunctions/game/`，需在对应云环境中部署；仓库不包含开发密钥。

## 目录

| 目录 | 内容 |
| --- | --- |
| `pet-cocos/assets/` | 场景、TypeScript 游戏逻辑和运行资源 |
| `pet-cocos/cloudfunctions/` | 云函数源码 |
| `pet-cocos/tests/` | 逻辑测试 |
| `pet-cocos/tools/` | 构建、资源生成与验证工具 |
| `pet-cocos/art-gen/`、`pet-cocos/source-assets/` | 美术源资源 |
| `pet-cocos/docs/` | 开发记录与说明，部分文档描述的是历史原型 |

构建结果、编辑器缓存、依赖目录、备份和本机凭据不纳入版本控制。`pet-cocos/README.md` 保留了早期角色动画原型的开发记录。
