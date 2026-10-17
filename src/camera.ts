import Phaser from 'phaser';

/** Enquadramento responsivo sem modificar tamanho ou coordenadas físicas do mundo. */
export function configureCamera(scene: Phaser.Scene, actor: Phaser.GameObjects.GameObject): void {
  const cam=scene.cameras.main;
  cam.setBounds(0,0,1200,700);
  const size=scene.scale.gameSize;
  const narrow=size.width<900;
  cam.setZoom(narrow?1.0:1.18);
  cam.startFollow(actor as Phaser.GameObjects.Components.Transform, false, .085, .10);
  cam.setDeadzone(narrow?70:160,115);
  cam.setRoundPixels(true);
}
