/** Colisão de habilidade com um alvo de puzzle, sem impor um lado fixo.
 * À distância o projétil deve ser disparado na direção do alvo.
 * Dentro do círculo a habilidade funciona de ambos os lados, mesmo
 * quando o personagem está olhando na direção contrária.
 * Usa coordenadas já validadas pela autoridade; não altera dano a inimigos.
 */
export function puzzleShotInRange(
  player:{x:number;y:number},target:{x:number;y:number},
  facing:-1|1=1,reach=360,vertical=65,contact=85
):boolean{
  const dx=target.x-player.x;
  return Math.abs(player.y-18-target.y)<=vertical&&
   (Math.abs(dx)<=contact||(dx*facing>=0&&Math.abs(dx)<=reach));
}

/** Um dash válido pode atravessar o círculo pela esquerda OU direita. */
export function dashTravelled(startX:number,endX:number,minDistance:number):boolean{
 return Math.abs(endX-startX)>=minDistance;
}
/** Dash iniciado dentro da própria marca OU deslocamento comprovado
 * ao atravessar o alvo de qualquer lado. A proximidade no instante da
 * ativação continua sendo verificada pela autoridade de cada fase. */
export function dashCanActivate(
 startX:number,endX:number,targetX:number,minDistance:number,startRadius=85
):boolean{
 return Math.abs(startX-targetX)<=startRadius||
  dashTravelled(startX,endX,minDistance);
}
