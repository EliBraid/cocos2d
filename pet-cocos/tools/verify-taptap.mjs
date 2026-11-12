// Checks the distributed build, not just the Cocos source project.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function filesUnder(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    assert(!entry.isSymbolicLink(), `Unexpected symbolic link: ${full}`);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

// Run the actual release game.js through its Android and non-Android boot paths.
// Engine/rendering/platform services are stubs: this is NOT a device admission test.
async function checkBoot(entry, platform) {
  const calls = [];
  const frameQueue = [];
  const nativeFetch = () => { throw new Error('Native fetch must not load local game assets'); };
  let sandbox;
  const firstScreen = {
    start: async () => calls.push('screen:start'),
    setProgress: async value => calls.push(`progress:${value}`),
    end: async () => calls.push('screen:end'),
  };
  class Application {
    async init() { calls.push('application:init'); }
    async start() { calls.push('application:start'); }
  }
  sandbox = {
    fetch:nativeFetch,
    console:{...console, error:error => { throw error; }},
    wx:{getSystemInfoSync:() => ({platform, screenWidth:540, screenHeight:960, devicePixelRatio:2})},
    requestAnimationFrame:callback => frameQueue.push(callback),
    require:id => {
      if (id === './web-adapter') {
        assert.equal(sandbox.fetch, undefined, 'Official fetch adaptation must precede engine startup');
        assert.equal(sandbox.oldFetch, nativeFetch, 'Native fetch must be preserved by the converter');
        sandbox.window = sandbox;
        sandbox.devicePixelRatio = 2;
        sandbox.canvas = {width:540, height:960};
      } else if (id === './first-screen') return firstScreen;
      else if (/import-map\..*\.js$/.test(id)) return {default:{imports:{}}};
      return {};
    },
    System:{
      warmup:() => calls.push('system:warmup'),
      import:async id => id === 'cc' ? {} : {Application},
    },
  };
  sandbox.GameGlobal = sandbox;
  vm.runInNewContext(entry, sandbox, {filename:'game.js', timeout:5000});
  assert.equal(frameQueue.length, platform === 'android' ? 1 : 0);
  for (const callback of frameQueue) callback();
  // Drain the asynchronous boot chain without sleeping or running a render loop.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.filter(call => call === 'application:start').length, 1, `${platform}: application did not start exactly once`);
  assert(calls.indexOf('application:init') < calls.indexOf('application:start'));
  return platform;
}

export async function verifyTapBuild(directory, expectedVersion) {
  const root = path.resolve(directory);
  const config = readJson(path.join(root, 'game.json'));
  assert.equal(config.convertScriptVersion, '2.0.4-ts', 'Unconverted/unsupported package: run the pinned TapTap converter');
  assert(/^\d+\.\d+\.\d+$/.test(config.productVersion), 'Missing productVersion');
  if (expectedVersion) assert.equal(config.productVersion, expectedVersion);
  const entry = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
  assert(entry.startsWith('/* Unity Converter Injection */'), 'Official runtime adaptation is missing');
  assert(fs.existsSync(path.join(root, 'check-version.js')), 'Missing official version checker');
  const files = filesUnder(root);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  for (const file of jsFiles) new vm.Script(fs.readFileSync(file, 'utf8'), {filename:file});
  const settingsFiles = files.filter(file => /[/\\]src[/\\]settings\.[^/\\]+\.json$/.test(file));
  assert.equal(settingsFiles.length, 1, 'Expected one Cocos settings file');
  const settings = readJson(settingsFiles[0]);
  const subpackages = config.subpackages || config.subPackages || [];
  const withinRoot = relative => {
    const full = path.resolve(root, relative);
    assert(full.startsWith(root + path.sep), `Package path escapes root: ${relative}`);
    assert(fs.existsSync(full), `Missing local boot dependency: ${relative}`);
    return full;
  };
  for (const script of settings.scripting.scriptPackages) withinRoot(script.replace(/^project:\/\//, ''));
  for (const {bundle} of settings.assets.preloadBundles) {
    const sub = subpackages.find(item => item.name === bundle);
    const base = sub ? sub.root : `assets/${bundle}`;
    withinRoot(`${base}/config.${settings.assets.bundleVers[bundle]}.json`);
    withinRoot(sub ? `${base}/game.js` : `${base}/index.${settings.assets.bundleVers[bundle]}.js`);
  }
  for (const sub of subpackages) withinRoot(`${sub.root}/game.js`);
  const wasmFiles = files.filter(file => file.endsWith('.wasm'));
  for (const file of wasmFiles) assert(WebAssembly.validate(fs.readFileSync(file)), `Invalid WASM: ${file}`);
  const bootPaths = [];
  for (const platform of ['android', 'ios', 'unknown']) bootPaths.push(await checkBoot(entry, platform));
  return {version:config.productVersion, converter:config.convertScriptVersion, files:files.length,
    syntaxChecked:jsFiles.length, wasmValidated:wasmFiles.length, bootPaths,
    limitation:'Boot harness uses engine/platform stubs; device admission and rendering are not verified.'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert(process.argv[2], 'Usage: node tools/verify-taptap.mjs <game-directory> [version]');
  console.log(JSON.stringify(await verifyTapBuild(process.argv[2], process.argv[3]), null, 2));
}
