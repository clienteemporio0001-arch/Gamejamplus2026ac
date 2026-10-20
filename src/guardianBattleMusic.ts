/** New original 64-second Guardian battle cue, rendered locally once. */
export async function composeGuardianBattle():Promise<AudioBuffer>{
 const context=new OfflineAudioContext(1,22050*64,22050);
 const master=context.createGain();
 master.gain.value=.65;
 master.connect(context.destination);
 const seq=[43,46,41,38,43,48,41,36];
 for(let bar=0;bar<32;bar++){
  const root=seq[bar%seq.length],begin=bar*2;
  for(let beat=0;beat<8;beat++){
   const t=begin+beat*.25;
   const pitch=beat%2===0?root-12:root+12;
   const oscillator=context.createOscillator();
   const gain=context.createGain();
   oscillator.type=beat%2===0?'sawtooth':'triangle';
   oscillator.frequency.value=440*Math.pow(2,(pitch-69)/12);
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.exponentialRampToValueAtTime(beat%2===0?.18:.08,t+.02);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.22);
   oscillator.connect(gain);
   gain.connect(master);
   oscillator.start(t);
   oscillator.stop(t+.23);
  }
 }
 return context.startRendering();
}
