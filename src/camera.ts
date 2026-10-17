import Phaser from 'phaser';

/** Câmera com seguimento suave e coordenadas físicas intactas. */
export function configureCamera(scene: Phaser.Scene, actor: Phaser.GameObjects.Rectangle): void {
  const cam=scene.cameras.main;
  cam.setBounds(0,0,1200,700);
  const narrow=scene.scale.gameSize.width<900;
  cam.setZoom(narrow?1:1.18);
  cam.startFollow(actor,false,.085,.10);
  cam.setDeadzone(narrow?70:160,115);
  cam.setRoundPixels(true);
}
