"""Package the original fox and runnable Cocos sample, excluding inspection assets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import os
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--version', default='0.5.2')
version = parser.parse_args().version

project = Path(__file__).resolve().parents[1]
modern = version not in {'0.5', '0.5.0', '0.5.1'}
walk_root = project / ('docs/walk-v055' if version == '0.5.5' else 'docs/walk-v054' if version == '0.5.4' else 'docs/walk-v053' if version == '0.5.3' else 'docs/walk-v052')
rig = json.loads((project / 'assets/proto/forest/fox/fox.json').read_text(encoding='utf-8'))
output = project.parent / 'outputs'
output.mkdir(exist_ok=True)
verification = project / 'docs/forest-v05-verification'
report = json.loads((verification / 'runtime-verification.json').read_text(encoding='utf-8'))
poses = json.loads((verification / 'attack-poses.json').read_text(encoding='utf-8'))
assert report['passed'] and not report['errors'] and not report['warnings']
assert poses['passed'] and len(poses['poses']) == 8
assert (verification / 'forest-native-spine.mp4').is_file()

project_zip = output / f'微光林地-Cocos狐狸与场景-v{version}.zip'
spine_zip = output / f'赤焰小狐-Spine-v{version}.zip'

def include(rel):
    parts = rel.parts
    if parts[0] in {'library', 'temp', 'local', 'node_modules', 'build-logs', '.git'}:
        return False
    if parts[0] == 'build':
        return len(parts) == 1 or parts[1] == 'forest-v05'
    if parts[0] == 'docs':
        if len(parts) > 1 and ('verification' in parts[1] and parts[1] != 'forest-v05-verification'):
            return False
        if 'idle-frames' in parts or 'loop-frames' in parts or 'frames' in parts or rel.name in {'failure.png', 'failure.json', 'README-v03.new.md'}:
            return False
    if parts[:2] == ('source-assets', 'fox-v05') and rel.name.startswith('plate-'):
        return False  # full-canvas debug plates are reproducible from the shipped sources
    return not rel.name.endswith('.tmp')

with ZipFile(project_zip, 'w', ZIP_DEFLATED, compresslevel=6) as z:
    for base, dirs, files in os.walk(project):
        relbase = Path(base).relative_to(project)
        dirs[:] = [d for d in dirs if include(relbase / d)]
        for name in sorted(files):
            file = Path(base) / name
            rel = file.relative_to(project)
            if include(rel):
                z.write(file, 'pet-cocos/' + rel.as_posix())

native_readme = '''# 赤焰小狐 Spine v0.5

fox/fox.json + fox.atlas + fox.png 是 Cocos 实际播放的 Spine 4.2.73 运行数据。
fox/images 是注册后的独立原创拆件；fox/registration.json 与 contract.json 保留画布和绑定约定。
38 根骨骼，16 个插槽，4 个 IK，7 份皮肤（包含默认组合），19 个动作/表情/视线片段。
身体 track 0、表情 track 1、视线 track 2。脸不替换整张头部轮廓。
默认围巾插槽为赤色，中性纹理支持插槽染色。

运行时外观组合：fox/front + gear/scarf-front + gear/sword-front；背面使用对应 back 组件。
赤色 RGB=(1,.16,.12)，海蓝=(.15,.62,.9)，苔绿=(.42,.63,.27)，只应用到 scarf 插槽。
腿部根级目标由游戏控制器驱动；单独导入播放 walk 不包含实际场景位移与世界落脚控制。
PetMotion.ts、PetAppearance.ts、ForestPetView.ts、FoxRig.ts 随包提供，完整接入见 Cocos 工程。

不含 Spine 编辑器保存的 .spine 文件。图像由内置 image_gen 参考原创狐狸生成/修补，再按同一画布注册拆件。
未使用参考游戏的图集、骨架、纹理或代码。背面当前为整体加权网格，尚非完整多方向动作集。
'''
with ZipFile(spine_zip, 'w', ZIP_DEFLATED, compresslevel=6) as z:
    for kind in ('fox', 'fire'):
        for file in (project / f'assets/resources/forest/{kind}').iterdir():
            if file.suffix in {'.json', '.atlas', '.png'}:
                z.write(file, f'{kind}/{file.name}')
    images = {file.name: file for file in (project / 'source-assets/fox-v05/images').glob('*.png')}
    if modern:
        images.update({file.name: file for file in (project / 'source-assets/fox-v052/images').glob('*.png')})
    if version == '0.5.5':
        images.update({file.name: file for file in (project / 'source-assets/fox-v055/images').glob('*.png')})
    used = {a.get('path', name) for skin in rig['skins'] for attachments in skin['attachments'].values() for name, a in attachments.items()}
    for name, file in images.items():
        if file.stem in used:
            z.write(file, 'fox/images/' + name)
    for name in ('registration.json', 'contract.json', 'registration-check.json'):
        folder = 'fox-v052' if modern and name == 'contract.json' else 'fox-v05'
        z.write(project / 'source-assets' / folder / name, 'fox/' + name)
    if modern:
        z.write(project / 'source-assets/fox-v052/body-registration.json', 'fox/body-registration.json')
    for name in ('PetProfile.ts', 'PetAppearance.ts', 'PetMotion.ts', 'ForestPetView.ts', 'FoxRig.ts', 'ForestLogic.ts', 'FoxWalkPose.ts', 'AuthoredWalk.ts'):
        z.write(project / 'assets/scripts' / name, 'cocos-integration/' + name)
    for name in ('forest-v05-art-prompts.json', 'REA资产与代码配合-v05.md'):
        z.write(project / 'docs' / name, 'docs/' + name)
    z.write(project / 'docs/walk-v052/fox-native-idle.gif' if modern else verification / 'fox-native-idle.gif', 'preview/fox-native-idle.gif')
    walk_preview = walk_root / 'fox-walk.gif' if modern else project / 'docs/walk-v06/fox-walk.gif'
    if walk_preview.exists():
        z.write(walk_preview, 'preview/fox-walk.gif')
        if modern:
            z.write(walk_root / '手臂与背面步行修正.md' if version == '0.5.5' else walk_root / 'REA对照与动作重做.md' if version == '0.5.4' else walk_root / '步行修正.md' if version == '0.5.3' else project / 'docs/walk-v052/整体动作重做.md', 'docs/本轮动作修正.md')
            z.write(project / 'docs/walk-v052/imagegen-prompts.json', 'docs/imagegen-prompts.json')
            z.write(walk_root / 'contact-down-pass-up.png', 'preview/contact-down-pass-up.png')
        else:
            z.write(project / 'docs/walk-v06/步态修正.md', 'docs/步态修正.md')
    native_readme = native_readme.replace('Spine v0.5', 'Spine v' + version).replace('38 根骨骼，16 个插槽', f"{len(rig['bones'])} 根骨骼，{len(rig['slots'])} 个插槽")
    if modern:
        native_readme = native_readme.replace('背面当前为整体加权网格', '正反身体均为连续加权网格，头尾、手臂与剑单独绑定')
        native_readme += '\nbody-registration.json 记录新连续身体的图像区域及逆绑定矩阵，registration.json 保留头尾等原拆件的画布登记。\n'
    if version in {'0.5.3', '0.5.4', '0.5.5'}:
        native_readme = native_readme.replace('19 个动作', '20 个动作')
        native_readme = native_readme.replace('正反身体均为连续加权网格', '正反胸腹与双腿按统一原画登记分层绑定')
        native_readme += '\nv0.5.3 将同一原画的胸腹与双腿分为独立网格，毛发覆盖腿根，坐标和各层逆绑定保存在 body-registration.json。walk-preview 可直接播放完整平地循环；walk 供游戏地形落脚使用。\n'
        z.write(walk_root / 'back/fox-walk.gif', 'preview/fox-walk-back.gif')
        z.write(walk_root / 'after-walk.mp4', 'preview/scene-walk.mp4')
    if version in {'0.5.4', '0.5.5'}:
        native_readme = f'''# 赤焰小狐 Spine v0.5.4

fox/fox.json + fox.atlas + fox.png 是 Cocos 实际使用的 Spine 4.2.73 运行数据。
{len(rig['bones'])} 根骨骼、{len(rig['slots'])} 个插槽、4 个 IK、{len(rig['skins'])} 份组合皮肤、{len(rig['animations'])} 个动作/表情/视线片段。
身体 track 0、表情 track 1、视线 track 2；表情不替换外轮廓头图。

walk、walk-back 包含完整的踝/趾、膝部绘制控制、身体承重、头部补偿和尾巴滞后。
walk-preview 可直接在原生 Spine 中循环。游戏通过 ground-left/right 父骨骼适配朝向与地形，保留动画的足部曲线。
AuthoredWalk.ts 是姿势与周期的唯一来源；ForestPetView.ts 和 ForestWorld.ts 负责原生动作及场景接入，完整源码在 Cocos 工程中。

body-registration.json 保存当前身体分层及逆绑定矩阵，registration.json 保留原始头、尾等原画登记。
围巾通过组合皮肤及插槽染色复用。正反两套外观仍是制作样件，尚无完整的多方向专用动作集。

preview/fox-walk.gif 与 fox-walk-back.gif 是实际原生渲染循环，scene-walk.mp4 是实际场景运行录像。
本包不含 Spine 编辑器保存的 .spine 文件。原作骨架、图集、纹理、提取帧及代码没有进入本包。
'''
    if version == '0.5.5':
        native_readme = native_readme.replace('v0.5.4', 'v0.5.5')
        native_readme += '\nv0.5.5 新正反手臂各自绑定，肩轴收进躯干、上臂展开、前臂自然下垂；背面两条落脚线沿纵深交替，步频与侧面一致。\n'
        z.write(project / 'source-assets/fox-v055/registration.json', 'fox/arm-registration.json')
        z.write(project / 'source-assets/fox-v055/imagegen-prompt.json', 'docs/arm-imagegen-prompt.json')
    z.writestr('README.md', native_readme)

manifest = []
for file in (project_zip, spine_zip):
    with ZipFile(file) as z:
        assert z.testzip() is None
        entries = z.namelist()
        assert not any('/inspection-' in name or '/Cult of the Lamb/' in name for name in entries)
        if file == project_zip:
            assert 'pet-cocos/build/forest-v05/index.html' in entries
            assert 'pet-cocos/assets/scenes/Forest.scene' in entries
            assert not any('/node_modules/' in n or '/library/' in n for n in entries)
        else:
            assert all('fox/' + name in entries for name in ('fox.json', 'fox.atlas', 'fox.png'))
    manifest.append({'file': file.name, 'bytes': file.stat().st_size, 'entries': len(entries), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
(output / f'微光林地-v{version}-交付清单.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(manifest, ensure_ascii=False))
