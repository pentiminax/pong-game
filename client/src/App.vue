<template>
  <div id="app">
    <div v-if="!gameStarted && !waiting && !opponentDisconnected">
      <button @click="createRoom">Créer un salon</button>
      <input v-model="roomId" placeholder="ID du salon" />
      <button @click="joinRoom">Rejoindre le salon</button>
    </div>

    <div v-if="roomCreated && !gameStarted && !waiting">
      <p>Salon créé avec succès ! ID du salon : {{ roomId }}</p>
      <p>En attente d'un autre joueur...</p>
    </div>

    <div v-if="waiting">
      <p>En attente d'un autre joueur...</p>
    </div>

    <div v-if="opponentDisconnected">
      <p>Adversaire déconnecté</p>
    </div>

    <div v-if="gameStarted">
      <canvas id="gameCanvas" width="600" height="400"></canvas>
      <p>Score Joueur 1: {{ scores.player1 }}</p>
      <p>Score Joueur 2: {{ scores.player2 }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import { io } from 'socket.io-client';
import { renderGame } from './render';
import axios from 'axios';

export default defineComponent({
  setup() {
    const socket = io('http://localhost:3000');

    // Références pour le jeu
    const roomId = ref('');
    const roomCreated = ref(false);
    const playerNumber = ref(0);
    const waiting = ref(false);
    const gameStarted = ref(false);
    const opponentDisconnected = ref(false);

    const ball = ref({ x: 300, y: 200 });
    const paddles = ref<any>({});
    const scores = ref({ player1: 0, player2: 0 });

    const paddleY = ref(150);
    const moveUp = ref(false);
    const moveDown = ref(false);

    const createRoom = async () => {
      try {
        const response = await axios.get('http://localhost:3000/create-room');
        roomId.value = response.data.roomId;
        roomCreated.value = true;
        joinRoom();
      } catch (error) {
        console.error('Erreur lors de la création du salon:', error);
      }
    };

    // Rejoindre un salon
    const joinRoom = () => {
      socket.emit('join_room', roomId.value);
    };

    // Gérer les touches du clavier
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') moveUp.value = true;
      if (e.key === 'ArrowDown') moveDown.value = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') moveUp.value = false;
      if (e.key === 'ArrowDown') moveDown.value = false;
    };

    // Mettre à jour la position de la palette
    const updatePaddle = () => {
      if (moveUp.value) paddleY.value -= 5;
      if (moveDown.value) paddleY.value += 5;

      // Limiter la palette à l'écran
      if (paddleY.value < 0) paddleY.value = 0;
      if (paddleY.value > 300) paddleY.value = 300;

      // Envoyer la position au serveur
      socket.emit('update_paddle', {
        roomId: roomId.value,
        paddleY: paddleY.value,
      });
    };

    // Écouter les événements Socket.IO
    onMounted(() => {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      socket.on('player_number', (num: number) => {
        playerNumber.value = num;
      });

      socket.on('waiting', () => {
        waiting.value = true;
      });

      socket.on('start_game', () => {
        waiting.value = false;
        gameStarted.value = true;
      });

      socket.on('update_game', (data: any) => {
        ball.value = data.ball;
        paddles.value = data.paddles;
        scores.value = data.scores;
      });

      socket.on('game_over', (finalScores: any) => {
        alert(`Jeu terminé ! Scores finaux : ${JSON.stringify(finalScores)}`);
        location.reload();
      });

      socket.on('opponent_disconnected', () => {
        opponentDisconnected.value = true;
        gameStarted.value = false;
      });

      const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

      const renderInterval = setInterval(() => {
        if (gameStarted.value) {
          renderGame(canvas, ball, paddles, paddleY, playerNumber);
          updatePaddle();
        }
      }, 16);

      onBeforeUnmount(() => {
        clearInterval(renderInterval);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      });
    });

    return {
      roomId,
      joinRoom,
      createRoom,
      roomCreated,
      waiting,
      gameStarted,
      opponentDisconnected,
      ball,
      paddles,
      scores,
      paddleY,
      playerNumber,
    };
  },
});
</script>

<style scoped>
body {
  font-family: Arial, sans-serif;
}

#gameCanvas {
  border: 1px solid #000;
}
</style>
