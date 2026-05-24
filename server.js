const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Servir les fichiers statiques (HTML, CSS, JS client) depuis le dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Stockage global des salons en mémoire
let rooms = {};

// Configuration géométrique des niveaux (les mêmes coordonnées que sur le client)
const MAPS = [
    {
        // Map 0 : Forêt
        platforms: [
            { x: -50, y: 0, w: 50, h: 576 },
            { x: 1024, y: 0, w: 50, h: 576 },
            { x: 0, y: 536, w: 1024, h: 40 }, // Sol principal ajusté pour 1024x576
            { x: 150, y: 400, w: 200, h: 20 },
            { x: 650, y: 400, w: 200, h: 20 },
            { x: 412, y: 280, w: 200, h: 20 },
            { x: 100, y: 180, w: 150, h: 20 },
            { x: 774, y: 180, w: 150, h: 20 }
        ]
    },
    {
        // Map 1 : Hiver
        platforms: [
            { x: -50, y: 0, w: 50, h: 576 },
            { x: 1024, y: 0, w: 50, h: 576 },
            { x: 0, y: 536, w: 1024, h: 40 },
            { x: 200, y: 430, w: 150, h: 20 },
            { x: 674, y: 430, w: 150, h: 20 },
            { x: 422, y: 320, w: 180, h: 20 },
            { x: 200, y: 210, w: 150, h: 20 },
            { x: 674, y: 210, w: 150, h: 20 }
        ]
    },
    {
        // Map 2 : Égypte
        platforms: [
            { x: -50, y: 0, w: 50, h: 576 },
            { x: 1024, y: 0, w: 50, h: 576 },
            { x: 0, y: 536, w: 1024, h: 40 },
            { x: 300, y: 430, w: 424, h: 20 },
            { x: 380, y: 320, w: 264, h: 20 },
            { x: 460, y: 210, w: 104, h: 20 }
        ]
    }
];

const COLORS = ['#e63946', '#2196f3', '#2ecc71', '#f4e04d', '#ff4081', '#18ffff'];

io.on('connection', (socket) => {
    console.log('🟢 Nouveau joueur connecté :', socket.id);

    // 1. CRÉATION OU REJOINDRE UN SALON
    socket.on('joinOrCreateRoom', (data) => {
        let roomCode = data.roomCode ? data.roomCode.toUpperCase().trim() : '';
        const pseudo = data.pseudo || 'Joueur';

        // Si aucun code n'est fourni, on génère un salon unique
        if (!roomCode) {
            do {
                roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            } while (rooms[roomCode]);

            rooms[roomCode] = {
                code: roomCode,
                players: {},
                settings: { mapIndex: 0, buffs: true, time: 120 },
                isPlaying: false,
                taggerId: null,
                tagCooldown: 0,
                gameInterval: null,
                lastActivity: Date.now()
            };
        }

        const room = rooms[roomCode];
        if (!room) {
            socket.emit('roomError', 'Salon introuvable.');
            return;
        }

        if (room.isPlaying) {
            socket.emit('roomError', 'La partie a déjà commencé dans ce salon.');
            return;
        }

        if (Object.keys(room.players).length >= 6) {
            socket.emit('roomError', 'Le salon est complet (max 6 joueurs).');
            return;
        }

        // Configuration réseau initiale du joueur
        const playerIndex = Object.keys(room.players).length;
        room.players[socket.id] = {
            id: socket.id,
            pseudo: pseudo,
            color: COLORS[playerIndex] || '#ffffff',
            x: 100 + (playerIndex * 140),
            y: 100,
            w: 32,
            h: 32,
            vx: 0,
            vy: 0,
            onGround: false,
            isHost: playerIndex === 0,
            inputs: { left: false, right: false, jump: false }
        };

        socket.join(roomCode);
        room.lastActivity = Date.now();

        // Réponse immédiate au client qui se connecte
        socket.emit('roomJoined', {
            roomCode: roomCode,
            myId: socket.id,
            isHost: room.players[socket.id].isHost,
            settings: room.settings
        });

        // Mise à jour de la liste des joueurs pour tout le monde dans le salon
        io.to(roomCode).emit('playersUpdated', Object.values(room.players));
    });

    // 2. RÉCEPTION DES ENTRÉES CLAVIER EN TEMPS RÉEL
    socket.on('playerInput', (inputs) => {
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            if (room.players[socket.id]) {
                room.players[socket.id].inputs = inputs;
                room.lastActivity = Date.now();
                break;
            }
        }
    });

    // 3. MISE À JOUR DES PARAMÈTRES (Hôte uniquement)
    socket.on('updateSettings', (newSettings) => {
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            if (room.players[socket.id] && room.players[socket.id].isHost) {
                room.settings = { ...room.settings, ...newSettings };
                room.lastActivity = Date.now();
                // Diffuser les nouveaux réglages aux autres joueurs
                socket.to(roomCode).emit('settingsUpdated', room.settings);
                break;
            }
        }
    });

    // 4. DEMANDE DE LANCEMENT DE LA PARTIE (Hôte uniquement)
    socket.on('requestStartGame', () => {
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            if (room.players[socket.id] && room.players[socket.id].isHost && !room.isPlaying) {
                startGameServer(roomCode);
                break;
            }
        }
    });

    // 5. GESTION DES DÉCONNEXIONS IMPRÉVUES OU DÉPARTS
    socket.on('disconnect', () => {
        console.log('🔴 Déconnexion du joueur :', socket.id);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            if (room.players[socket.id]) {
                const wasHost = room.players[socket.id].isHost;
                delete room.players[socket.id];

                // Si le salon se vide, on le supprime de la mémoire
                if (Object.keys(room.players).length === 0) {
                    if (room.gameInterval) clearInterval(room.gameInterval);
                    delete rooms[roomCode];
                } else {
                    // Si l'hôte est parti, on transmet le rôle au joueur suivant
                    if (wasHost) {
                        const nextHostId = Object.keys(room.players)[0];
                        room.players[nextHostId].isHost = true;
                        io.to(nextHostId).emit('hostMigrated');
                    }
                    
                    // Notifier le reste du salon
                    io.to(roomCode).emit('playersUpdated', Object.values(room.players));
                    
                    // Si le loup quitte en pleine partie, on réassigne le rôle au hasard
                    if (room.isPlaying && room.taggerId === socket.id) {
                        room.taggerId = Object.keys(room.players)[0];
                        room.tagCooldown = 60;
                        io.to(roomCode).emit('playerTagged', { taggerId: room.taggerId });
                    }
                }
                break;
            }
        }
    });
});

// ==========================================================================
// MOTEUR PHYSIQUE TEMPS RÉEL DU SERVEUR (BOUCLE FIXE 60 FPS)
// ==========================================================================
function startGameServer(roomCode) {
    const room = rooms[roomCode];
    room.isPlaying = true;

    const pIds = Object.keys(room.players);
    // Assigner le premier chat (le loup) au hasard
    room.taggerId = pIds[Math.floor(Math.random() * pIds.length)];
    room.tagCooldown = 90; // Temps d'attente initial (1.5 seconde de répit)

    // Reset des coordonnées de départ sur le sol
    pIds.forEach((id, index) => {
        room.players[id].x = 150 + (index * 130);
        room.players[id].y = 450;
        room.players[id].vx = 0;
        room.players[id].vy = 0;
        room.players[id].onGround = false;
    });

    // Envoyer le signal de départ avec l'état initialisé
    io.to(roomCode).emit('gameStarted', {
        taggerId: room.taggerId,
        players: Object.values(room.players)
    });

    // Constantes physiques de déplacement
    const gravity = 0.6;
    const friction = 0.82;
    const jumpForce = -13;
    const moveSpeed = 1.2;
    const maxSpeed = 8;
    const platforms = MAPS[room.settings.mapIndex].platforms;

    // Lancement de l'intervalle d'actualisation physique (Tick de calcul)
    room.gameInterval = setInterval(() => {
        if (!room.isPlaying) return;

        if (room.tagCooldown > 0) room.tagCooldown--;

        const playerList = Object.values(room.players);

        // 1. Mise à jour de la vélocité et des positions de chaque joueur
        playerList.forEach(p => {
            if (p.inputs.left) p.vx -= moveSpeed;
            if (p.inputs.right) p.vx += moveSpeed;

            p.vx *= friction;
            if (p.vx > maxSpeed) p.vx = maxSpeed;
            if (p.vx < -maxSpeed) p.vx = -maxSpeed;

            p.vy += gravity;
            if (p.inputs.jump && p.onGround) {
                p.vy = jumpForce;
            }

            // Résolution des collisions sur l'axe X (Gauche/Droite)
            p.onGround = false;
            p.x += p.vx;
            for (let plat of platforms) {
                // Rectangle Intersect Check (AABB)
                if (!(plat.x >= p.x + p.w || plat.x + plat.w <= p.x || plat.y >= p.y + p.h || plat.y + plat.h <= p.y)) {
                    if (p.vx > 0) p.x = plat.x - p.w;
                    else if (p.vx < 0) p.x = plat.x + plat.w;
                    p.vx = 0;
                }
            }

            // Résolution des collisions sur l'axe Y (Haut/Bas)
            p.y += p.vy;
            for (let plat of platforms) {
                if (!(plat.x >= p.x + p.w || plat.x + plat.w <= p.x || plat.y >= p.y + p.h || plat.y + plat.h <= p.y)) {
                    if (p.vy > 0) { // Atterrissage
                        p.y = plat.y - p.h;
                        p.vy = 0;
                        p.onGround = true;
                    } else if (p.vy < 0) { // Choc tête contre plafond
                        p.y = plat.y + plat.h;
                        p.vy = 0;
                    }
                }
            }

            // Sécurité anti-chute hors-écran en hauteur
            if (p.y < 0) { p.y = 0; p.vy = 0; }
        });

        // 2. Gestion des contacts et transmission du rôle de Chat
        if (room.tagCooldown === 0) {
            const tagger = room.players[room.taggerId];
            if (tagger) {
                for (let id in room.players) {
                    if (id !== room.taggerId) {
                        const p = room.players[id];
                        // Vérifier si les deux boîtes de collision se superposent
                        if (!(p.x >= tagger.x + tagger.w || p.x + p.w <= tagger.x || p.y >= tagger.y + tagger.h || p.y + p.h <= tagger.y)) {
                            room.taggerId = id;
                            room.tagCooldown = 60; // 1 seconde de répit (cooldown) avant le prochain tag
                            io.to(roomCode).emit('playerTagged', { taggerId: room.taggerId });
                            break;
                        }
                    }
                }
            }
        }

        // 3. Envoi du Snapshot de positions filtrées à tout le monde
        io.to(roomCode).emit('gameUpdate', {
            players: playerList,
            taggerId: room.taggerId
        });

    }, 1000 / 60);
}

// Système de nettoyage automatique des salons fantômes (Inactivité de plus d'une heure)
setInterval(() => {
    const now = Date.now();
    for (const roomCode in rooms) {
        if (now - rooms[roomCode].lastActivity > 3600000) {
            if (rooms[roomCode].gameInterval) clearInterval(rooms[roomCode].gameInterval);
            delete rooms[roomCode];
            console.log(`🧹 Salon inactif supprimé : ${roomCode}`);
        }
    }
}, 600000);

// Lancement de l'écoute du serveur
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`🚀 Serveur actif et en écoute sur le port ${PORT}`);
});
