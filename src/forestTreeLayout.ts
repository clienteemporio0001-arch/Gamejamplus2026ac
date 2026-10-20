/**
 * 2D forest tree pack supplied by the game creator (00.png, 01.png, 03.png).
 * Visual-only scenery. No Arcade bodies, collisions, interaction or network.
 *
 * One small lossless WebP atlas instead of dozens of large transparent PNGs.
 * The original license was not included in the ZIP: see assets/trees/README.md.
 */
export type ForestTreeStage=1|2|3|4;
export type ForestTreeFrame='tree00'|'tree01'|'tree03';
export type ForestTreeSpot={
  x:number;
  baseY:number;
  height:number;
  frame:ForestTreeFrame;
  alpha:number;
  tint:number;
  depth:number;
  flipX?:boolean;
};

export const FOREST_TREE_LAYOUTS:Readonly<Record<ForestTreeStage,readonly ForestTreeSpot[]>>={
  // Boca da Noite: dense, but the clearing at 5670 and major tree at 9400
  // retain their dedicated landmark illustrations.
  1:[
    {x:340,baseY:641,height:392,frame:'tree01',alpha:.73,tint:0xa3b5a2,depth:-13},
    {x:1060,baseY:639,height:342,frame:'tree00',alpha:.68,tint:0x92ad9e,depth:-13,flipX:true},
    {x:1610,baseY:642,height:268,frame:'tree03',alpha:.71,tint:0xa7b89e,depth:-13},
    {x:2470,baseY:639,height:410,frame:'tree01',alpha:.67,tint:0x88a99b,depth:-13,flipX:true},
    {x:3080,baseY:641,height:318,frame:'tree00',alpha:.72,tint:0xa1b3a2,depth:-13},
    {x:3700,baseY:640,height:264,frame:'tree03',alpha:.70,tint:0xa3c1a1,depth:-13,flipX:true},
    {x:4550,baseY:640,height:384,frame:'tree01',alpha:.72,tint:0x95b39a,depth:-13},
    {x:5180,baseY:639,height:326,frame:'tree00',alpha:.66,tint:0x9aad9b,depth:-13,flipX:true},
    {x:6220,baseY:640,height:398,frame:'tree01',alpha:.70,tint:0xa5b9a8,depth:-13},
    {x:6890,baseY:642,height:264,frame:'tree03',alpha:.74,tint:0x9ab9a5,depth:-13},
    {x:7680,baseY:638,height:354,frame:'tree00',alpha:.68,tint:0x9bbca9,depth:-13,flipX:true},
    {x:8260,baseY:641,height:390,frame:'tree01',alpha:.69,tint:0x94b5a4,depth:-13},
    {x:8690,baseY:640,height:262,frame:'tree03',alpha:.66,tint:0x93b3a2,depth:-13,flipX:true},
    {x:9930,baseY:640,height:344,frame:'tree00',alpha:.65,tint:0x8eab9c,depth:-13},
    {x:10490,baseY:639,height:398,frame:'tree01',alpha:.70,tint:0xa0bca6,depth:-13,flipX:true},
    {x:11100,baseY:640,height:265,frame:'tree03',alpha:.74,tint:0xa5b9a6,depth:-13}
  ],
  // Floresta Temporal: keep the river (2610–2970) and its warning readable.
  2:[
    {x:320,baseY:640,height:385,frame:'tree01',alpha:.65,tint:0x83aaa9,depth:-13},
    {x:850,baseY:638,height:260,frame:'tree03',alpha:.69,tint:0x97b9b2,depth:-13,flipX:true},
    {x:1520,baseY:639,height:360,frame:'tree00',alpha:.68,tint:0x8ca8aa,depth:-13},
    {x:2130,baseY:641,height:392,frame:'tree01',alpha:.64,tint:0x8bafaf,depth:-13,flipX:true},
    {x:3260,baseY:639,height:282,frame:'tree03',alpha:.66,tint:0x83acab,depth:-13},
    {x:3690,baseY:641,height:342,frame:'tree00',alpha:.65,tint:0x94b5ad,depth:-13},
    {x:4070,baseY:638,height:261,frame:'tree03',alpha:.61,tint:0x8eafa9,depth:-13,flipX:true}
  ],
  // Caminho das Árvores: just a few distant, misty tree crowns below the
  // cooperative branches. Nothing can hide prompts or jumping platforms.
  3:[
    {x:1470,baseY:1090,height:420,frame:'tree01',alpha:.33,tint:0x78aba7,depth:-18},
    {x:2510,baseY:920,height:312,frame:'tree00',alpha:.29,tint:0x7fa6a6,depth:-18,flipX:true},
    {x:3790,baseY:700,height:316,frame:'tree01',alpha:.29,tint:0x719b9c,depth:-18},
    {x:4730,baseY:545,height:244,frame:'tree03',alpha:.26,tint:0x78a7a2,depth:-18}
  ],
  // Floresta em Chamas: extremely restrained, charred silhouettes only.
  4:[
    {x:340,baseY:675,height:335,frame:'tree00',alpha:.22,tint:0x786552,depth:-18,flipX:true},
    {x:1840,baseY:675,height:360,frame:'tree01',alpha:.20,tint:0x755644,depth:-18},
    {x:4510,baseY:675,height:290,frame:'tree03',alpha:.18,tint:0x71564a,depth:-18}
  ]
} as const;

