// Asks Codex to repaint template.png as each monster's parts sheet, in the pets' hand-drawn style.
// Resumable: existing art-gen/monsters/parts-<kind>.png are skipped. Then run build.mjs.
// usage (from pet-cocos): node tools/monster-rig/gen-parts.mjs [kind ...]
import fs from 'node:fs';import {spawn} from 'node:child_process';
// kind -> look. Body = round chubby main body (no face), top = what sits on its head, faces are drawn separately.
const LOOK={
 fuzz:'Fuzzball: a small round grumpy dust-bunny creature with shaggy grey-brown fur; top = two tiny stubby horns.',
 shroom:'Mushroom Minion: a stubby beige mushroom-stem body; top = a big round red mushroom cap with white spots.',
 elite:'Horn Demon: a chunky dark purple furry imp body with small claws at the sides; top = two big curved ivory horns.',
 armor:'Iron Shell: a squat body covered in riveted grey iron armour plates like a little tank; top = an iron helmet with a short spike.',
 healer:'Healing Shroom: a soft pale green mushroom-stem body with a little leaf bandage; top = a mint green cap with white crosses and tiny glowing spores.',
 dasher:'Dasher: a lean orange-red furry body leaning forward, speed lines of fur; top = a pair of swept-back pointed ears like a rabbit about to sprint.',
 bomber:'Bomber: a round black bomb-shaped body with red cracks and orange glow; top = a short burning fuse with a spark.',
 summoner:'Summoner Shroom: a purple robed mushroom-stem body; top = a tall wobbly violet wizard-like mushroom cap with a few tiny fuzzballs peeking from under it.',
 warden:'Rock Warden: a heavy square body made of blue-grey stone blocks with moss; top = a flat stone crown with a glowing blue rune.',
 caster:'Shadow Caster: a dark indigo hooded-cloak body with tiny purple sparkles; top = a pointed dark hood tip with a crescent charm.',
 archer:'Spiky Archer: a round green cactus-like body covered in small spikes, with a tiny quiver strap; top = a cluster of longer spikes like a mohawk.',
 stunner:'Thunder Fuzz: a round yellow fluffy body with crackling static; top = two zig-zag lightning-bolt antennae.',
 splitter:'Splitter Slime: a wobbly translucent green jelly body with bubbles inside; top = a small jelly droplet blob.',
 frost:'Frost Shroom: a pale icy blue stem body with frost; top = an icy blue cap with icicles hanging from its rim.',
 ghost:'Ghost: a floaty white-lavender sheet-ghost body with a wavy bottom; top = a tiny wisp curl of ghost flame.',
 starmage:'Star Mage: a golden robed mushroom-stem body with star embroidery; top = a golden cap shaped like a star-studded wizard hat.',
 boss1:'Giant Moss Shroom (boss): a huge sturdy mushroom-stem body overgrown with moss and tiny flowers, with a scowl crease; top = a gigantic mossy green cap with roots.',
 boss2:'Iron Crab King (boss): a wide armoured blue crab-shell body with two big pincers on the sides; top = a small golden crown with spikes.',
 boss3:'Lava Fiend (boss): a hulking black rock body with glowing orange lava cracks; top = jagged volcanic horns dripping lava.',
 boss4:'Thunder King (boss): a big storm-cloud grey furry body with yellow lightning patterns; top = a crown of three lightning bolts.',
 boss5:'Swamp King (boss): a large murky green toad-like slimy body with lily pads stuck on it; top = a crown of reeds with a lily flower.',
 boss6:'Frost Giant (boss): a big icy-white furry yeti body with blue ice shards; top = two massive ice-crystal horns.',
 boss7:'Shadow Count (boss): a tall body in a dark purple high-collared vampire cape; top = a small black top hat with a red gem.',
 boss8:'Star Dragon King (boss): a large midnight-blue scaly body with golden star speckles; top = two golden dragon horns with a floating star between them.',
};
const prompt=(kind,look)=>`Image 1 is a parts sheet for a small 2D skeletal-animation enemy monster in a cute tower-defense mobile game: 6 grey-framed boxes, each holding one separate part: big box = round body (with NO face on it), top-right box = what sits on top of its head, then an ANGRY face (eyes, brows, mouth only), a HURT face (dizzy eyes, open mouth), left foot, right foot. Repaint the sheet as this monster: ${look} Cute-but-naughty villain, readable at small size. Draw in exactly the hand-drawn style of image 2 (thick dark brown-black ink outlines, light cross-hatching, warm flat colours, fur texture where furry). Keep exactly the same layout: same 6 grey boxes at the same positions, one part per box, centred, roughly the same size and placement as the example part in that box, not touching the box border, pure white background. The body must be a single solid blob with a plain front where the face will be placed, and no feet or top attached; the faces are just facial features on transparent/white with no head outline; the feet are small simple stubs. No text, no labels, no extra objects. Save the final PNG to art-gen/monsters/parts-${kind}.png in the current working directory.`;
const CODEX=process.env.CODEX_BIN||(process.platform==='win32'?`${process.env.APPDATA}/npm/node_modules/@openai/codex/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe`:'codex');
const want=process.argv.slice(2),kinds=(want.length?want:Object.keys(LOOK)).filter(k=>!fs.existsSync(`art-gen/monsters/parts-${k}.png`));
fs.mkdirSync('art-gen/monsters',{recursive:true});const log=fs.createWriteStream('art-gen/monsters/_log.txt',{flags:'a'});
const run=kind=>new Promise(ok=>{const t0=Date.now();
 const p=spawn(CODEX,['exec',prompt(kind,LOOK[kind]),'-C','.','-s','workspace-write','--skip-git-repo-check','-i','tools/monster-rig/template.png','-i','assets/resources/pets/portrait/W04.png'],{stdio:['ignore','pipe','pipe']});
 p.stdout.pipe(log,{end:false});p.stderr.pipe(log,{end:false});
 p.on('close',()=>{const done=fs.existsSync(`art-gen/monsters/parts-${kind}.png`);console.log(`${done?'ok  ':'FAIL'} ${kind} ${((Date.now()-t0)/1000).toFixed(0)}s`);ok(done);});});
const queue=[...kinds];const worker=async()=>{while(queue.length){const k=queue.shift();if(!await run(k))await run(k);}};
await Promise.all([worker(),worker(),worker()]);console.log('monster sheets done');
