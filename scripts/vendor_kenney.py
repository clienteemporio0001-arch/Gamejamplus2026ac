#!/usr/bin/env python3
"""Vendor all 6 authentic Kenney Toon Characters 1 CC0 atlases and UI previews.

This runs once in GitHub Actions if source atlases are missing. The generated
assets are committed to the repository for reliable offline itch.io builds.
The authentic OpenGameArt ZIP is checksum-verified before extraction.
"""
import hashlib
import io
import pathlib
import urllib.request
import zipfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
TARGET=ROOT/'public'/'characters'/'kenney'
URL='https://opengameart.org/sites/default/files/kenney_toonCharacters1.zip'
SHA256='54e585338e05bb4662da78a1b19283a3dda1f90dbe527353b65a4bb88b5f6297'
SOURCE={
 'teo':('Male adventurer','maleAdventurer'),
 'lia':('Female adventurer','femaleAdventurer'),
 'nino':('Male person','malePerson'),
 'mulher':('Female person','femalePerson'),
 'robo':('Robot','robot'),
 'zumbi':('Zombie','zombie'),
}
expected=[TARGET/f'{name}.{ext}' for name in SOURCE for ext in ('png','xml')]
expected += [TARGET/f'preview-{name}.png' for name in SOURCE]
expected.append(TARGET/'LICENSE.txt')
if all(path.exists() and path.stat().st_size>200 for path in expected):
 print('Kenney assets already vendored. No download necessary.')
 raise SystemExit(0)
TARGET.mkdir(parents=True,exist_ok=True)
request=urllib.request.Request(URL,headers={'User-Agent':'Mozilla/5.0 (A Floresta Mente asset build)'})
with urllib.request.urlopen(request, timeout=90) as response:
 raw=response.read(10_000_000)
digest=hashlib.sha256(raw).hexdigest()
if digest != SHA256:
 raise RuntimeError(f'Kenney source archive checksum mismatch: {digest} != {SHA256}')
with zipfile.ZipFile(io.BytesIO(raw)) as archive:
 for name,(folder,slug) in SOURCE.items():
  for ext in ('png','xml'):
   original=f'{folder}/Tilesheet/character_{slug}_sheet.{ext}'
   payload=archive.read(original)
   (TARGET/f'{name}.{ext}').write_bytes(payload)
   print(f'Created {name}.{ext}: {len(payload)} bytes')
 (TARGET/'LICENSE.txt').write_bytes(archive.read('License.txt'))
# A preview is the actual unaltered 96x128 idle frame at (0,0) of
# each atlas, cropped for small accessible lobby cards.
from PIL import Image
for name in SOURCE:
 atlas=Image.open(TARGET/f'{name}.png').convert('RGBA')
 assert atlas.width>=96 and atlas.height>=128
 preview=atlas.crop((0,0,96,128))
 preview.save(TARGET/f'preview-{name}.png',optimize=True)
 print(f'Created preview-{name}.png')
print('All 6 genuine Kenney CC0 atlases and previews vendored successfully.')
