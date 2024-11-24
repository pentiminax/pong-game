<template>
  <div id="app">
    <div v-if="!gameStarted && !waiting && !opponentDisconnected && !roomCreated">
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
import { defineComponent, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
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

    const socketId = ref('');
    let renderInterval: number | undefined;

    // Fonction pour créer un salon
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

    // Fonction pour rejoindre un salon
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

      socket.on('connect', () => {
        socketId.value = socket.id;
      });

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
    });

    // Surveiller le changement de gameStarted
    watch(gameStarted, async (newValue) => {
      if (newValue) {
        await nextTick(); // Attendre que le DOM se mette à jour
        const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        if (canvas) {
          renderInterval = window.setInterval(() => {
            renderGame(canvas, ball, paddles, paddleY, playerNumber, socketId);
            updatePaddle();
          }, 16);
        }
      } else {
        // Arrêter la boucle de rendu si le jeu est terminé ou arrêté
        if (renderInterval) {
          clearInterval(renderInterval);
        }
      }
    });

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (renderInterval) {
        clearInterval(renderInterval);
      }
    });

    return {
      roomId,
      createRoom,
      joinRoom,
      roomCreated,
      waiting,
      gameStarted,
      opponentDisconnected,
      ball,
      paddles,
      scores,
      paddleY,
      playerNumber,
      socketId, // Ajouté pour être accessible dans renderGame
    };
  },
});
</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: Arial, sans-serif;
}

#gameCanvas {
  border: 2px solid #000;
  background-color: #f0f0f0;
}

button {
  margin: 5px;
  padding: 10px 20px;
}

input {
  padding: 10px;
  margin: 5px;
  width: 200px;
}
</style>
