import { createApp, ref, onMounted, onBeforeUnmount } from 'vue';
import { renderGame } from './render';
import io from 'socket.io-client';
import './style.css';

const app = createApp({
    setup() {
        const socket = io('http://localhost:3000');

        // Références pour le jeu
        const roomId = ref('');
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
            const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

            const renderInterval = setInterval(() => {
                if (gameStarted.value) {
                  renderGame(canvas, ball, paddles, paddleY, playerNumber);
                }
              }, 16);

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

            onBeforeUnmount(() => {
                clearInterval(renderInterval);
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
              });
        });

        // Boucle de jeu client
        setInterval(() => {
            if (gameStarted.value) {
                updatePaddle();
            }
        }, 16);

        return {
            roomId,
            joinRoom,
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

app.mount('#app');
