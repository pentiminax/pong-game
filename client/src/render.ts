import { Ref } from 'vue';

export function renderGame(
  canvas: HTMLCanvasElement,
  ball: Ref<any>,
  paddles: Ref<any>,
  paddleY: Ref<number>,
  playerNumber: Ref<number>
) {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  // Effacer le canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dessiner la balle
  ctx.beginPath();
  ctx.arc(ball.value.x, ball.value.y, 10, 0, Math.PI * 2);
  ctx.fill();

  // Dessiner les palettes
  for (const id in paddles.value) {
    const player = paddles.value[id];
    const isPlayer1 = player.playerNumber === 1;
    const x = isPlayer1 ? 10 : 580;
    const y = player.paddleY;

    ctx.fillRect(x, y, 10, 100);
  }

  // Dessiner sa propre palette si non synchronisée
  if (!paddles.value[socket.id]) {
    const x = playerNumber.value === 1 ? 10 : 580;
    ctx.fillRect(x, paddleY.value, 10, 100);
  }
}
