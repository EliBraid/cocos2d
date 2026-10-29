"""Package portable project and native Spine data; no editor cache or game research assets."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

project = Path(__file__).resolve().parents[1]
output = project.parent / 'outputs'
output.mkdir(exist_ok=True)
project_zip = output / '微光林地-Cocos狐狸与场景-v0.4.zip'
spine_zip = output / '赤焰小狐-Spine-v0.4.zip'
report = json.loads((project / 'docs/forest-v04-verification/runtime-verification.json').read_text(encoding='utf-8'))
assert report['passed'] and not report['errors']

def include(relative):
    if relative.parts[0] in {'library', 'temp', 'node_modules', 'build-logs'}:
        return False
    if relative.parts[0] == 'build':
        return len(relative.parts) > 1 and relative.parts[1] == 'forest-v04'
    if relative.parts[0] == 'docs':
        if relative.name in {'failure.png', 'failure.json', 'README-v03.new.md', 'smoke.json', 'forest-first.png'}:
            return False
        # Keep the old documentation but avoid bundling old demonstration media.
        if len(relative.parts) > 1 and relative.parts[1] in {'verification', 'forest-verification'}:
            return False
    return not relative.name.endswith('.tmp')

with ZipFile(project_zip, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(project.rglob('*')):
        relative = file.relative_to(project)
        if file.is_file() and include(relative):
            archive.write(file, 'pet-cocos/' + relative.as_posix())

native_readme = '''# 赤焰小狐 / 微光林地 v0.4

fox/fox.json + fox.atlas + fox.png：原生 Spine 4.2.73 运行数据。
fox/images/：独立拆件，可用于重新导入编辑器。
fire/：同场景的火焰 Spine 数据。
28根角色骨骼、6个插槽、2套皮肤、19个动画片段。
包含加权网格与待机 deform；动作、表情、视线可分轨播放。
此包不包含 Spine 编辑器保存的 .spine 文件。

Cocos Creator 3.8.8 可直接导入 JSON、atlas、PNG，使用 sp.Skeleton。
完整 Cocos 工程另见微光林地-Cocos狐狸与场景-v0.4.zip。
素材为本工程原创，内置 image_gen 生成；提示词一并提供。
'''
with ZipFile(spine_zip, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
    for kind in ('fox', 'fire'):
        for file in (project / f'assets/resources/forest/{kind}').iterdir():
            if file.suffix in {'.json', '.atlas', '.png'}:
                archive.write(file, f'{kind}/{file.name}')
    for file in (project / 'source-assets/forest-v04/images').glob('*.png'):
        archive.write(file, 'fox/images/' + file.name)
    for name in ('flame-a', 'flame-b'):
        file = project / f'assets/proto/forest/art/{name}.png'
        archive.write(file, f'fire/images/{name}.png')
    for name in ('forest-v04-rig.json', 'forest-v04-art-prompts.json'):
        archive.write(project / 'docs' / name, name)
    archive.writestr('README.md', native_readme)

manifest = []
for file in (project_zip, spine_zip):
    with ZipFile(file) as archive:
        assert archive.testzip() is None
        entries = len(archive.namelist())
        if file == project_zip:
            assert 'pet-cocos/assets/scenes/Forest.scene' in archive.namelist()
            assert 'pet-cocos/build/forest-v04/index.html' in archive.namelist()
            assert not any('/node_modules/' in name or '/library/' in name for name in archive.namelist())
    manifest.append({'file': file.name, 'bytes': file.stat().st_size, 'entries': entries, 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
(output / '微光林地-v0.4-交付清单.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(manifest, ensure_ascii=False))
