// Cocos WeChat output is an intermediate build, never a TapTap distribution ZIP.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {verifyTapBuild} from './verify-taptap.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2];
assert(/^\d+\.\d+\.\d+$/.test(version || ''), 'Usage: node tools/build-taptap.mjs <version> [fresh-output-directory]');
const source = path.join(project, 'build', 'wechatgame');
const buildRoot = fs.realpathSync(path.join(project, 'build'));
const target = path.resolve(process.argv[3] || path.join(buildRoot, `taptap-${version}`));
assert(target.startsWith(buildRoot + path.sep), 'Output must be inside the project build directory');
assert(!fs.existsSync(target), 'Output already exists; choose a fresh directory to preserve previous builds');
// The official converter removes its target before writing. Require a real,
// non-symlink parent inside build so no source/user directory can be removed.
const realParent = fs.realpathSync(path.dirname(target));
assert(realParent === buildRoot || realParent.startsWith(buildRoot + path.sep), 'Unsafe output parent');
assert(target !== source && !source.startsWith(target + path.sep), 'Output overlaps source');
const plugin = path.resolve(process.env.TAPTAP_CONVERTER_DIR || path.join(project,
  '../.work/taptap-tools/plugin-1.2.2/taptap-minigame-tools'));
const metadata = JSON.parse(fs.readFileSync(path.join(plugin, 'package.json'), 'utf8'));
assert.equal(metadata.name, 'taptap-minigame-tools');
assert.equal(metadata.version, '1.2.2', 'Review and verify converter changes before upgrading');
const require = createRequire(import.meta.url);
const {convertWechatToTap} = require(path.join(plugin, 'dist', 'converter-ts.js'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceEntryHash = hash(path.join(source, 'game.js'));
let conversionErrors = 0;
const log = console.log;
try {
  // The official converter can continue after individual Babel errors. Treat
  // any such failure as a failed build so it cannot reach the upload step.
  console.log = (...args) => {
    if (String(args[0]).startsWith('[Babel] 转换失败:')) conversionErrors++;
    log(...args);
  };
  await convertWechatToTap({source, target, gameVersion:version, useSubpackage:false});
} finally { console.log = log; }
assert.equal(conversionErrors, 0, 'Some JavaScript files failed conversion; do not upload this package');
assert.equal(hash(path.join(source, 'game.js')), sourceEntryHash, 'Source build was changed during conversion');
const checks = await verifyTapBuild(path.join(target, 'game'), version);
const archive = path.join(target, 'game.zip');
assert(fs.statSync(archive).size < 20 * 1024 * 1024, 'ZIP exceeds the current console 20 MB limit');
const manifest = {createdAt:new Date().toISOString(), source, sourceEntrySha256:sourceEntryHash,
  pluginVersion:metadata.version, pluginSource:'https://developer.taptap.cn/minigameapidoc/dev/engine/Cocos-Laya-Egret/',
  archive, archiveBytes:fs.statSync(archive).size, archiveSha256:hash(archive), checks};
fs.writeFileSync(path.join(target, 'build-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(manifest, null, 2));
