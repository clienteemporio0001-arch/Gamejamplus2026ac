#!/usr/bin/env python3
"""Original procedurally arranged orchestral loops for A FLORESTA MENTE.
No commercial songs, external audio samples, or third-party melodies.
Deterministic synthesis; MP3 files are generated and committed by GitHub Actions.
"""
from __future__ import annotations
import json, math, subprocess, tempfile, wave
from pathlib import Path
import numpy as np
SR=22050
RNG=np.random.default_rng(20261018)
OUT=Path(__file__).resolve().parents[1]/'public'/'audio'
SCORES={
 'boca_da_noite':dict(bpm=80,bars=32,root=57,mood='mystery'),
 'floresta_temporal':dict(bpm=88,bars=32,root=50,mood='rain'),
 'caminho_das_arvores':dict(bpm=110,bars=32,root=62,mood='height'),
 'floresta_em_chamas':dict(bpm=100,bars=32,root=53,mood='fire'),
 'depois_das_cinzas':dict(bpm=70,bars=24,root=57,mood='hope')
}
HARMONY={
 'mystery':[[0,3,7],[8,0,3],[5,8,0],[7,10,2]],
 'rain':[[0,3,7],[5,8,0],[8,0,3],[3,7,10]],
 'height':[[0,3,7],[7,10,2],[8,0,3],[10,2,5]],
 'fire':[[0,3,7],[1,5,8],[8,0,3],[7,11,2],[5,8,0],[3,7,10],[1,5,8],[7,11,2]],
 'hope':[[0,4,7],[5,9,0],[9,0,4],[7,11,2]]
}
MOTIFS={
 'mystery':[0,7,3,2,0,-2,3,7,8,7,3,0,-2,0,2,3],
 'rain':[0,2,3,7,5,3,2,-2,0,-2,2,3,7,5,3,0],
 'height':[0,3,7,10,12,10,7,3,5,8,12,15,12,8,7,5],
 'fire':[0,-2,0,3,7,8,7,3,1,3,7,10,8,7,3,1],
 'hope':[0,4,7,9,7,4,2,0,5,7,9,12,11,9,7,4]
}
def pitch(midi):
 return 440.0*2.0**((midi-69)/12.)
def envelope(n,attack,decay,release,sustain=.7):
 a=min(n,max(1,int(SR*attack)))
 d=min(max(n-a,0),max(1,int(SR*decay)))
 r=min(max(n-a-d,0),max(1,int(SR*release)))
 e=np.full(n,sustain,dtype=np.float32)
 if a:e[:a]=np.linspace(0,1,a,dtype=np.float32)
 if d:e[a:a+d]=np.linspace(1,sustain,d,dtype=np.float32)
 if r:e[-r:]*=np.linspace(1,0,r,dtype=np.float32)
 return e
def note(f,seconds,kind,velocity):
 n=max(1,int(SR*seconds));t=np.arange(n,dtype=np.float32)/SR
 phase=2*np.pi*f*t
 if kind=='flute':
  vib=np.sin(t*5.3*2*np.pi)*.003*f
  p=phase+2*np.pi*np.cumsum(vib)/SR
  w=np.sin(p)+.11*np.sin(2*p)+.045*np.sin(3*p)
  e=envelope(n,.08,.22,.32,.78)
 elif kind=='piano':
  w=np.sin(phase)+.21*np.sin(2*phase)+.12*np.sin(3*phase)+.06*np.sin(4*phase)
  e=envelope(n,.006,.06,.13,.78)*np.exp(-t*1.5)
 elif kind=='cello':
  p=phase+.0019*np.sin(2*np.pi*4.7*t)
  w=.85*np.sin(p)+.37*np.sin(2*p)+.19*np.sin(3*p)+.09*np.sin(4*p)
  e=envelope(n,.15,.19,.45,.83)
 elif kind=='strings':
  detune=.0028*np.sin(t*1.8*2*np.pi)
  w=np.sin(phase)+.3*np.sin(phase*(1.001+detune))+.22*np.sin(2*phase)
  e=envelope(n,.21,.24,.48,.75)
 elif kind=='choir':
  w=(np.sin(phase)+.28*np.sin(2*phase)+.11*np.sin(3*phase))*(.84+.16*np.sin(2*np.pi*2*t))
  e=envelope(n,.6,.26,.9,.78)
 elif kind=='water':
  w=np.sin(phase*(1+.0015*np.sin(t*3.1)))+.22*np.sin(phase*2.001)
  e=envelope(n,.21,.22,.75,.7)
 else:
  w=np.sin(phase);e=envelope(n,.06,.16,.3,.73)
 return (w*e*velocity).astype(np.float32)
def add(buf,sample,offset):
 at=offset%len(buf)
 if at+len(sample)<=len(buf):buf[at:at+len(sample)]+=sample
 else:
  k=len(buf)-at;buf[at:]+=sample[:k];buf[:len(sample)-k]+=sample[k:]
def drum(kind,n):
 t=np.arange(n,dtype=np.float32)/SR
 noise=RNG.uniform(-1,1,n).astype(np.float32)
 if kind=='kick':
  p=2*np.pi*(63*t+25*(1-np.exp(-t*22))/22)
  w=(np.sin(p)*.8+noise*.09)*np.exp(-t*25)
 elif kind=='tom':
  p=2*np.pi*(110*t+30*(1-np.exp(-t*12))/12)
  w=(np.sin(p)+noise*.15)*np.exp(-t*12)
 elif kind=='shaker':
  high=noise-np.convolve(noise,np.ones(13,dtype=np.float32)/13,mode='same')
  w=high*np.exp(-t*38)*.20
 else:w=noise*np.exp(-t*37)*.17
 return w.astype(np.float32)
def main():
 OUT.mkdir(parents=True,exist_ok=True);manifest={}
 for track,cfg in SCORES.items():
  bpm,bars,root,mood=cfg['bpm'],cfg['bars'],cfg['root'],cfg['mood']
  seconds=bars*4*60/bpm;beat=60/bpm;length=int(round(seconds*SR))
  melody=np.zeros(length,np.float32);harmony=np.zeros(length,np.float32)
  bass=np.zeros(length,np.float32);percussion=np.zeros(length,np.float32)
  chords=HARMONY[mood];motif=MOTIFS[mood]
  for bar in range(bars):
   chord=chords[bar%len(chords)]
   dynamics=.72+.22*np.sin(2*np.pi*(bar%16)/16)**2
   if mood=='fire':dynamics=.69+.31*(bar%8)/7
   for j,degree in enumerate(chord):
    tone=root-12+degree+(12 if j==2 and mood=='hope' else 0)
    kind='choir' if mood=='fire' and j==2 else ('water' if mood=='rain' else 'strings')
    add(harmony,note(pitch(tone),beat*3.7,kind,.052*dynamics),int(round(bar*4*beat*SR)))
   add(bass,note(pitch(root-24+chord[0]),beat*3.8,'cello' if mood=='fire' else 'strings',
    (.085 if mood=='fire' else .056)*dynamics),int(round(bar*4*beat*SR)))
   rate=1 if mood in ('rain','hope') else (2 if mood=='mystery' else 4)
   for step in range(4*rate):
    degree=motif[(bar*4*rate+step)%len(motif)]
    if mood=='rain' and step%4==3:continue
    if mood=='fire' and step%4==3:continue
    if mood=='hope' and step%4==2:continue
    key=root+(12 if mood=='height' else 0)+degree
    if mood=='fire':key-=3
    kind='piano' if mood in ('rain','hope') else 'flute' if mood=='mystery' else 'strings'
    duration=beat*(.84 if rate==1 else .42 if rate==2 else .225)
    add(melody,note(pitch(key),duration,kind,(.15 if mood=='rain' else .17)*dynamics),
        int(round((bar*4+step/rate)*beat*SR)))
   if mood=='fire':
    for step in range(4):
     add(percussion,drum('kick' if step in (0,2) else 'tom',int(SR*.30)),
      int(round((bar*4+step)*beat*SR)))
     if step in (1,3):add(percussion,drum('shaker',int(SR*.17)),int(round((bar*4+step+.5)*beat*SR)))
   elif mood=='height':
    for step in range(8):
     if step%2==0:add(percussion,drum('tom',int(SR*.22)),int(round((bar*4+step/2)*beat*SR)))
     add(percussion,drum('shaker',int(SR*.13)),int(round((bar*4+step/2)*beat*SR)))
   elif mood=='mystery':
    for step in (0,2):add(percussion,drum('tom',int(SR*.16)),int(round((bar*4+step)*beat*SR)))
   elif mood=='rain':
    for step in range(4):
     add(percussion,drum('shaker',int(SR*.20))*.22,int(round((bar*4+step)*beat*SR)))
  music=melody*.8+harmony*.79+bass*.78+percussion*(.66 if mood=='fire' else .4)
  # Circular seam softening: align the last ~0.48s of the motif with the start.
  overlap=int(SR*.48)
  for i in range(overlap):
   factor=i/(overlap-1)
   music[-overlap+i]=music[-overlap+i]*(1-factor)+music[i]*factor
  music-=np.mean(music);peak=float(np.max(np.abs(music)))
  if peak>0:music*=min(1.,.73/peak)
  pcm=(np.clip(music,-.97,.97)*32767).astype('<i2')
  with tempfile.TemporaryDirectory() as temp:
   wav=Path(temp)/(track+'.wav');mp3=OUT/(track+'.mp3')
   with wave.open(str(wav),'wb') as wf:
    wf.setnchannels(1);wf.setsampwidth(2);wf.setframerate(SR);wf.writeframes(pcm.tobytes())
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),
    '-ar','22050','-ac','1','-codec:a','libmp3lame','-b:a','80k',str(mp3)],check=True)
  manifest[track]=dict(file=track+'.mp3',durationSeconds=round(seconds,3),
   bpm=bpm,bars=bars,sizeBytes=mp3.stat().st_size,origin='Original procedural composition for A Floresta Mente',
   license='Original game soundtrack; use and distribution with the game project authorized')
  print(track,manifest[track],flush=True)
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if __name__=='__main__':main()
