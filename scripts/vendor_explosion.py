#!/usr/bin/env python3
"""Vendor exactly the user-selected Explosion 4 from Ansimuz CC0 OpenGameArt.

The archive is the same 35KB zip the player uploaded for this request.
Checksum-verification ensures reproducible builds; only PNG and license
are versioned in the game, not unrelated explosions/macOS junk files.
"""
from pathlib import Path
import hashlib,io,urllib.request,zipfile
root=Path(__file__).resolve().parents[1]
target=root/'public'/'assets'/'fx'
image=target/'explosion-4.png'
license_file=target/'LICENSE-ANSIMUZ.txt'
if image.is_file() and license_file.is_file():
 print('Explosion 4 already vendored')
 raise SystemExit(0)
url='https://opengameart.org/sites/default/files/explosions-pack.zip'
expected='2dcea890eff80e38fce579c22f8106e20ecc5a054d76a9e2bf20d80c08882225'
request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (A Floresta Mente GameJam)'})
with urllib.request.urlopen(request,timeout=90) as reply:
 data=reply.read(2_000_000)
actual=hashlib.sha256(data).hexdigest()
if actual!=expected:
 raise RuntimeError(f'Untrusted explosion archive: SHA256 {actual}, expected {expected}')
target.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(io.BytesIO(data)) as arc:
 image.write_bytes(arc.read('explosions-pack/spritesheets/explosion-4.png'))
 license_file.write_bytes(arc.read('explosions-pack/license.txt'))
print('Imported Explosion 4 (12 frames, 128x128), Ansimuz CC0')
