/** Curadoria dos 14 assets originais de "assets para ambiente.rar".
 * Somente decoração: nenhum elemento desta lista cria colisão ou interação.
 * Marcos interativos (pedra, arco, tronco oco) são tratados separadamente,
 * nas coordenadas originais em officialLandmarks.ts.
 */
export type ImmersiveStage=1|2;
export type ImmersiveFrame=
 'fern_broad'|'fern_tall'|'fern_moss'|'fern_drape'|
 'mushrooms_blue'|'mushrooms_pink'|'roots'|'fallen_log'|
 'wood_platform'|'branch_log'|'step_tree'|'hollow_stump'|
 'rune_arch'|'split_rock';
export type ImmersiveSpot={
 x:number;baseY:number;width:number;height:number;frame:ImmersiveFrame;
 alpha:number;tint:number;depth:number;flipX?:boolean;
};
/** Limit detailed foreground objects near critical landmarks, enemies and voids.
 * Lower-alpha oversized trees add depth; no unreachable fake platforms.
 * Wood-platform art is added only at real solid platform coordinates.
 */
export const IMMERSIVE_SPOTS:Readonly<Record<ImmersiveStage,readonly ImmersiveSpot[]>>={
 1:[
  {x:410,baseY:638,width:230,height:145,frame:'fern_broad',alpha:.64,tint:0x8ca58d,depth:-10},
  {x:760,baseY:638,width:135,height:145,frame:'fern_moss',alpha:.67,tint:0x87b89e,depth:-10},
  {x:1860,baseY:639,width:175,height:107,frame:'mushrooms_pink',alpha:.67,tint:0x92bad2,depth:-9},
  {x:2040,baseY:638,width:215,height:134,frame:'roots',alpha:.59,tint:0x94a785,depth:-11,flipX:true},
  {x:2550,baseY:638,width:228,height:318,frame:'step_tree',alpha:.58,tint:0x819e81,depth:-12},
  {x:2920,baseY:638,width:120,height:135,frame:'fern_tall',alpha:.77,tint:0x80b193,depth:-9},
  {x:3890,baseY:638,width:158,height:148,frame:'fern_drape',alpha:.72,tint:0x92bd98,depth:-10},
  {x:4480,baseY:638,width:130,height:125,frame:'fern_moss',alpha:.73,tint:0x9cb58e,depth:-9},
  {x:5150,baseY:638,width:225,height:105,frame:'branch_log',alpha:.53,tint:0x7a967b,depth:-12},
  {x:6070,baseY:638,width:158,height:93,frame:'mushrooms_blue',alpha:.55,tint:0x8ac2ce,depth:-9},
  {x:6280,baseY:638,width:240,height:105,frame:'fallen_log',alpha:.54,tint:0x88aa87,depth:-10},
  {x:6980,baseY:638,width:145,height:137,frame:'fern_drape',alpha:.71,tint:0xa1bb9c,depth:-9},
  {x:7290,baseY:638,width:194,height:131,frame:'fern_broad',alpha:.59,tint:0x84ad92,depth:-11,flipX:true},
  {x:8050,baseY:638,width:208,height:306,frame:'step_tree',alpha:.54,tint:0x789c87,depth:-13,flipX:true},
  {x:8460,baseY:638,width:161,height:94,frame:'mushrooms_pink',alpha:.63,tint:0x88a6b2,depth:-10},
  {x:8880,baseY:638,width:210,height:114,frame:'roots',alpha:.59,tint:0x8fac83,depth:-11},
  {x:10150,baseY:638,width:160,height:105,frame:'fern_tall',alpha:.70,tint:0x88b0a1,depth:-9},
  {x:10970,baseY:638,width:170,height:91,frame:'mushrooms_blue',alpha:.59,tint:0x91afb9,depth:-9},
  // Hollow-tree wooden ledge is a REAL Arcade collider centred at 1300,546.
  {x:1300,baseY:556,width:176,height:54,frame:'wood_platform',alpha:.95,tint:0xb2bda4,depth:9}
 ],
 2:[
  {x:300,baseY:638,width:190,height:135,frame:'fern_broad',alpha:.62,tint:0x7ba7a0,depth:-11},
  {x:610,baseY:638,width:132,height:120,frame:'fern_drape',alpha:.64,tint:0x8eacb0,depth:-10},
  {x:1040,baseY:638,width:145,height:88,frame:'mushrooms_blue',alpha:.65,tint:0x81c5d6,depth:-9},
  {x:1180,baseY:638,width:155,height:99,frame:'roots',alpha:.48,tint:0x7a9d99,depth:-11},
  {x:1670,baseY:638,width:170,height:102,frame:'mushrooms_pink',alpha:.64,tint:0x9baed5,depth:-10},
  {x:1980,baseY:638,width:220,height:300,frame:'step_tree',alpha:.52,tint:0x76aaa7,depth:-13},
  {x:2230,baseY:638,width:140,height:143,frame:'fern_tall',alpha:.65,tint:0x87b8ad,depth:-10},
  {x:2450,baseY:638,width:168,height:90,frame:'branch_log',alpha:.54,tint:0x829f98,depth:-12},
  {x:3020,baseY:638,width:176,height:88,frame:'fallen_log',alpha:.54,tint:0x85aaa3,depth:-12},
  {x:3290,baseY:638,width:138,height:120,frame:'fern_moss',alpha:.68,tint:0x8abfb3,depth:-10},
  {x:3820,baseY:638,width:142,height:82,frame:'mushrooms_blue',alpha:.65,tint:0x85b8c2,depth:-9,flipX:true},
  {x:4040,baseY:638,width:136,height:145,frame:'fern_drape',alpha:.64,tint:0x8baba6,depth:-10},
  {x:4400,baseY:638,width:180,height:119,frame:'fern_broad',alpha:.56,tint:0x8ca8a3,depth:-11},
  {x:760,baseY:638,width:125,height:133,frame:'fern_moss',alpha:.62,tint:0x7bb7a9,depth:-10,flipX:true},
  // Actual root platform at TEMP_ECHO[0], y539: decorative art only.
  {x:680,baseY:551,width:145,height:48,frame:'wood_platform',alpha:.91,tint:0xa6bbaf,depth:9}
 ]
} as const;
