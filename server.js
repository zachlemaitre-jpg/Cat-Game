const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

// Configuration géométrique des niveaux
const MAPS = [
    {
        platforms: [
            { x: -50, y: 0, w: 50, h: 576 },
            { x: 1024, y: 0, w: 50, h: 576 },
            { x: 0, y: 536, w: 1024, h: 40 },
            { x: 150, y: 400, w: 200, h: 20 },
            { x: 650, y: 400, w: 200, h: 20 },
            { x: 412, y: 280, w: 200, h: 20 },
            { x: 100, y: 180, w: 150, h: 20 },
            { x: 774, y: 180, w: 150, h: 20 }
        ]
    },
    {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function findRoomBySocket(socketId) {
    for (const roomCode in rooms) {
        if (rooms[roomCode].clients.find(c => c.id === socketId)) {
            return { roomCode, room: rooms[roomCode] };
        }
    }
    return null;
}

// ─── Socket Events ────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('🟢 Connexion:', socket.id);

    // 1. CRÉER UN NOUVEAU SALON
    socket.on('createRoom', (data) => {
        const pseudo = (data && data.pseudo) ? data.pseudo.trim() : 'Hôte';
        let roomCode;
        while (rooms[roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()]);

        rooms[roomCode] = {
            clients: [{ id: socket.id, pseudo }],
            settings: { mapIndex: 0, buffs: true, time: 120 },
            isPlaying: false,
            taggerId: null,
            tagCooldown: 0,
            gameInterval: null,
            lastActivity: Date.now()
        };

        socket.join(roomCode);
        socket.emit('lobbyJoined', {
            roomCode,
            isHost: true,
            settings: rooms[roomCode].settings
        });
        io.to(roomCode).emit('playersUpdated', rooms[roomCode].clients);
    });

    // 2. REJOINDRE UN SALON EXISTANT
    socket.on('joinRoom', (data) => {
        const roomCode = (data.roomCode || '').toUpperCase().trim();
        const pseudo = (data.pseudo || 'Joueur').trim();
        const room = rooms[roomCode];

        if (!room) {
            socket.emit('roomError', 'Salon introuvable.');
            return;
        }
        if (room.clients.length >= 6) {
            socket.emit('roomError', 'Le salon est complet (max 6 joueurs).');
            return;
        }

        // Éviter les doublons (reconnexion)
        if (!room.clients.find(c => c.id === socket.id)) {
            room.clients.push({ id: socket.id, pseudo });
        }

        socket.join(roomCode);
        room.lastActivity = Date.now();
        const isHost = room.clients[0].id === socket.id;

        socket.emit('lobbyJoined', { roomCode, isHost, settings: room.settings });
        io.to(roomCode).emit('playersUpdated', room.clients);

        // Si la partie est déjà en cours → mode spectateur
        if (room.isPlaying) {
            const client = room.clients.find(c => c.id === socket.id);
            if (client) client.playerNum = 'spectator';
            socket.emit('gameStarted', { playerNum: 'spectator', settings: room.settings });
        }
    });

    // 3. MISE À JOUR DES PARAMÈTRES (hôte uniquement)
    socket.on('updateSettings', (data) => {
        const room = rooms[data.roomCode];
        if (room && room.clients[0].id === socket.id) {
            room.settings = { ...room.settings, ...data.settings };
            room.lastActivity = Date.now();
            socket.to(data.roomCode).emit('settingsChanged', room.settings);
        }
    });

    // 4. LANCER LA PARTIE (hôte uniquement)
    socket.on('requestStartGame', (data) => {
        const room = rooms[data.roomCode];
        if (!room || room.clients[0].id !== socket.id || room.isPlaying) return;

        room.isPlaying = true;
        room.clients.forEach((client, index) => {
            const role = index < 6 ? index + 1 : 'spectator';
            client.playerNum = role;
            io.to(client.id).emit('gameStarted', { playerNum: role, settings: room.settings });
        });

        startGameServer(data.roomCode);
    });

    // 5. ENTRÉES CLAVIER TEMPS RÉEL (mode en ligne)
    socket.on('playerInput', (inputs) => {
        const found = findRoomBySocket(socket.id);
        if (found && found.room.isPlaying) {
            const player = found.room.clients.find(c => c.id === socket.id);
            if (player && player.serverPlayer) {
                player.serverPlayer.inputs = inputs;
                found.room.lastActivity = Date.now();
            }
        }
    });

    // 6. RETOUR AU LOBBY (hôte uniquement)
    socket.on('requestReturnToLobby', (roomCode) => {
        const room = rooms[roomCode];
        if (room && room.clients[0].id === socket.id) {
            room.isPlaying = false;
            if (room.gameInterval) {
                clearInterval(room.gameInterval);
                room.gameInterval = null;
            }
            io.to(roomCode).emit('returnToLobby');
        }
    });

    // 7. CHAT
    socket.on('sendChat', (data) => {
        io.to(data.room).emit('chatMessage', {
            sender: data.sender,
            pseudo: data.pseudo,
            text: data.text
        });
    });

    // 8. DÉCONNEXION
    socket.on('disconnect', () => {
        console.log('🔴 Déconnexion:', socket.id);
        for (const roomCode in rooms) {
            const room = rooms[roomCode];
            const index = room.clients.findIndex(c => c.id === socket.id);
            if (index !== -1) {
                const wasHost = index === 0;
                room.clients.splice(index, 1);

                if (room.clients.length === 0) {
                    if (room.gameInterval) clearInterval(room.gameInterval);
                    delete rooms[roomCode];
                } else {
                    if (wasHost) {
                        io.to(room.clients[0].id).emit('hostMigrated');
                    }
                    io.to(roomCode).emit('playersUpdated', room.clients);

                    // Si le loup quitte en pleine partie → réassigner
                    if (room.isPlaying && room.taggerId === socket.id) {
                        room.taggerId = room.clients[0].id;
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
// MOTEUR PHYSIQUE SERVEUR (60 FPS)
// ==========================================================================
function startGameServer(roomCode) {
    const room = rooms[roomCode];

    const pIds = room.clients.map(c => c.id);
    room.taggerId = pIds[Math.floor(Math.random() * pIds.length)];
    room.tagCooldown = 90;
    
    // NOUVEAU : Initialisation du timer serveur
    room.lastTimerUpdate = Date.now();

    // Initialiser les objets joueurs serveur sur chaque client
    room.clients.forEach((client, index) => {
        client.serverPlayer = {
            id: client.id,
            pseudo: client.pseudo,
            color: COLORS[index] || '#ffffff',
            x: 150 + (index * 130),
            y: 450,
            w: 32,
            h: 32,
            vx: 0,
            vy: 0,
            onGround: false,
            inputs: { left: false, right: false, jump: false },
            jumpCooldown: 0
        };
    });

    io.to(roomCode).emit('gameStarted', {
        taggerId: room.taggerId,
        players: room.clients.map(c => c.serverPlayer)
    });

    const gravity = 0.2;    
    const friction = 0.85;  
    const jumpForce = -10;  
    const moveSpeed = 0.5;  
    const maxSpeed = 3;     
    const platforms = MAPS[room.settings.mapIndex].platforms;

    room.gameInterval = setInterval(() => {
        if (!room.isPlaying) return;
        
        // --- NOUVEAU : GESTION DU TEMPS CÔTÉ SERVEUR ---
        const now = Date.now();
        if (now - room.lastTimerUpdate >= 1000) {
            room.timeRemaining--;
            room.lastTimerUpdate = now;
            
            if (room.timeRemaining <= 0) {
                room.isPlaying = false;
                clearInterval(room.gameInterval);
                io.to(roomCode).emit('gameOver');
                return; // Arrête la boucle pour cette frame
            }
        }

        if (room.tagCooldown > 0) room.tagCooldown--;

        const players = room.clients
            .filter(c => c.serverPlayer)
            .map(c => c.serverPlayer);

        players.forEach(p => {
            if (p.jumpCooldown > 0) p.jumpCooldown--;
            if (p.inputs.left) p.vx -= moveSpeed;
            if (p.inputs.right) p.vx += moveSpeed;
            p.vx *= friction;
            if (p.vx > maxSpeed) p.vx = maxSpeed;
            if (p.vx < -maxSpeed) p.vx = -maxSpeed;

            p.vy += gravity;
            
            if (p.inputs.jump && p.onGround && p.jumpCooldown === 0) {
                p.vy = jumpForce;
                p.jumpCooldown = 30; // 30 = 0.5 seconde d'attente (à 60fps)
            }
            p.onGround = false;
            p.x += p.vx;
            for (let plat of platforms) {
                if (!(plat.x >= p.x + p.w || plat.x + plat.w <= p.x || plat.y >= p.y + p.h || plat.y + plat.h <= p.y)) {
                    if (p.vx > 0) p.x = plat.x - p.w;
                    else if (p.vx < 0) p.x = plat.x + plat.w;
                    p.vx = 0;
                }
            }

            p.y += p.vy;
            for (let plat of platforms) {
                if (!(plat.x >= p.x + p.w || plat.x + plat.w <= p.x || plat.y >= p.y + p.h || plat.y + plat.h <= p.y)) {
                    if (p.vy > 0) { p.y = plat.y - p.h; p.vy = 0; p.onGround = true; }
                    else if (p.vy < 0) { p.y = plat.y + plat.h; p.vy = 0; }
                }
            }
            if (p.y < 0) { p.y = 0; p.vy = 0; }
        });

        // Vérification du tag
        if (room.tagCooldown === 0) {
            const taggerClient = room.clients.find(c => c.id === room.taggerId);
            const tagger = taggerClient ? taggerClient.serverPlayer : null;
            if (tagger) {
                for (let client of room.clients) {
                    if (client.id !== room.taggerId && client.serverPlayer) {
                        const p = client.serverPlayer;
                        if (!(p.x >= tagger.x + tagger.w || p.x + p.w <= tagger.x || p.y >= tagger.y + tagger.h || p.y + p.h <= tagger.y)) {
                            room.taggerId = client.id;
                            room.tagCooldown = 60;
                            io.to(roomCode).emit('playerTagged', { taggerId: room.taggerId });
                            break;
                        }
                    }
                }
            }
        }

        io.to(roomCode).emit('gameUpdate', {
            players,
            taggerId: room.taggerId,
            timeRemaining: room.timeRemaining // Envoie le temps au client
        });
    }, 1000 / 60);
}

// ─── Garbage Collector ────────────────────────────────────────────────────────
const ONE_HOUR_MS = 3_600_000;
setInterval(() => {
    let deleted = 0;
    const now = Date.now();
    for (const roomCode in rooms) {
        const room = rooms[roomCode];
        if (room.clients.length === 0 || (room.lastActivity && now - room.lastActivity > ONE_HOUR_MS)) {
            if (room.gameInterval) clearInterval(room.gameInterval);
            delete rooms[roomCode];
            deleted++;
        }
    }
    if (deleted > 0) console.log(`🧹 GC : ${deleted} salon(s) supprimé(s).`);
}, 600_000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`🚀 Serveur actif sur le port ${PORT}`));
