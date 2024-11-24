const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Stockage des salons
const rooms = {};

// Fonction pour initialiser un nouveau jeu
function createGame(roomId) {
    return {
        players: {},
        ball: {
            x: 300,
            y: 200,
            vx: 5,
            vy: 5,
            radius: 10,
        },
        scores: {
            player1: 0,
            player2: 0,
        },
        interval: null,
    };
}

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
    console.log('Un joueur s\'est connecté:', socket.id);

    // Rejoindre un salon
    socket.on('join_room', (roomId) => {
        socket.join(roomId);

        // Créer le salon s'il n'existe pas
        if (!rooms[roomId]) {
            rooms[roomId] = createGame(roomId);
        }

        const game = rooms[roomId];
        const playerNumber = Object.keys(game.players).length + 1;

        // Limiter à 2 joueurs par salon
        if (playerNumber > 2) {
            socket.emit('room_full');
            socket.leave(roomId);
            return;
        }

        // Attribuer le joueur au salon
        game.players[socket.id] = {
            paddleY: 150,
            playerNumber: playerNumber,
        };

        // Informer le client de son numéro de joueur
        socket.emit('player_number', playerNumber);

        // Démarrer la partie si deux joueurs sont connectés
        if (Object.keys(game.players).length === 2) {
            io.to(roomId).emit('start_game');
            startGameLoop(roomId);
        } else {
            socket.emit('waiting');
        }
    });

    // Mise à jour de la position de la palette
    socket.on('update_paddle', ({ roomId, paddleY }) => {
        const game = rooms[roomId];
        if (game && game.players[socket.id]) {
            game.players[socket.id].paddleY = paddleY;
        }
    });

    // Gestion de la déconnexion
    socket.on('disconnect', () => {
        console.log('Un joueur s\'est déconnecté:', socket.id);
        for (const roomId in rooms) {
            const game = rooms[roomId];
            if (game.players[socket.id]) {
                delete game.players[socket.id];
                io.to(roomId).emit('opponent_disconnected');
                clearInterval(game.interval);
                delete rooms[roomId];
                break;
            }
        }
    });
});

// Fonction pour démarrer la boucle de jeu
function startGameLoop(roomId) {
    const game = rooms[roomId];

    game.interval = setInterval(() => {
        const ball = game.ball;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Collision avec le haut et le bas
        if (ball.y <= ball.radius || ball.y >= 400 - ball.radius) {
            ball.vy = -ball.vy;
        }

        // Récupérer les palettes des joueurs
        const players = Object.values(game.players);
        const paddleWidth = 10;
        const paddleHeight = 100;

        // Collision avec les palettes
        players.forEach((player) => {
            const isPlayer1 = player.playerNumber === 1;
            const paddleX = isPlayer1 ? 10 : 580;

            if (
                ball.x - ball.radius <= paddleX + paddleWidth &&
                ball.x + ball.radius >= paddleX &&
                ball.y >= player.paddleY &&
                ball.y <= player.paddleY + paddleHeight
            ) {
                ball.vx = -ball.vx;
            }
        });

        // Gérer les points
        if (ball.x <= 0) {
            // Le joueur 2 marque un point
            game.scores.player2 += 1;
            resetBall(ball, -5);
        } else if (ball.x >= 600) {
            // Le joueur 1 marque un point
            game.scores.player1 += 1;
            resetBall(ball, 5);
        }

        // Vérifier si un joueur a gagné
        if (game.scores.player1 >= 5 || game.scores.player2 >= 5) {
            io.to(roomId).emit('game_over', game.scores);
            clearInterval(game.interval);
            delete rooms[roomId];
        } else {
            // Envoyer les données aux clients
            io.to(roomId).emit('update_game', {
                ball: game.ball,
                paddles: game.players,
                scores: game.scores,
            });
        }
    }, 16);
}

// Fonction pour réinitialiser la balle après un point
function resetBall(ball, vx) {
    ball.x = 300;
    ball.y = 200;
    ball.vx = vx;
    ball.vy = 5;
}

// Démarrer le serveur
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});
