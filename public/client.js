// ==========================================
// 1. VARIABLES GLOBALES
// ==========================================
let socket = null;
if (typeof io !== 'undefined') {
    socket = io();
}

let gameMode = 'local';
let currentMapIndex = 0;
let gameSettings = { mapIndex: 0, buffs: true, time: 120 };
let isHost = true;
let currentRoom = '';
let myGlobalPseudo = 'Joueur';
let myPlayerId = 1; // numéro de joueur (1-6) ou 'spectator'

const PLAYER_COLORS = ['#e63946', '#2196f3', '#2ecc71', '#f4e04d', '#ff4081', '#18ffff'];

// ==========================================
// 2. GESTION DE L'INTERFACE (MENUS)
// ==========================================

function showScreen(screenId) {
    ['main-menu', 'connection-screen', 'lobby-screen', 'game-screen'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function selectMode(mode) {
    gameMode = mode;
    if (mode === 'local') {
        isHost = true;
        showScreen('lobby-screen');
        updateLobbyForLocal();
    } else {
        showScreen('connection-screen');
    }
}

// ─── MODE EN LIGNE ────────────────────────────────────────────────────────────

function joinOrCreateRoom() {
    if (!socket) { alert('⚠️ Serveur introuvable !'); return; }

    const pseudoInput = document.getElementById('pseudo-input').value.trim();
    const roomInput = document.getElementById('room-input').value.trim().toUpperCase();
    myGlobalPseudo = pseudoInput !== '' ? pseudoInput : 'Joueur';

    if (roomInput === '') {
        socket.emit('createRoom', { pseudo: myGlobalPseudo });
    } else {
        currentRoom = roomInput;
        socket.emit('joinRoom', { roomCode: currentRoom, pseudo: myGlobalPseudo });
    }
}

// ─── LOBBY ────────────────────────────────────────────────────────────────────

function updateLobbyForLocal() {
    document.getElementById('lobby-title').innerText = 'CHOOSE MAP';
    document.getElementById('lobby-subtitle').innerText = 'Sélectionnez le terrain de jeu';
    document.getElementById('room-code-display').style.display = 'none';
    document.getElementById('start-btn').style.display = 'block';
    document.getElementById('start-btn').disabled = false;
    document.getElementById('settings-host-controls').classList.remove('disabled-for-guest');
    
    // Afficher le sélecteur de joueurs uniquement en local
    const playerCountContainer = document.getElementById('local-player-count-container');
    if (playerCountContainer) playerCountContainer.style.display = 'block';

    // Lire le nombre de joueurs choisi (par défaut 3)
    const selectEl = document.getElementById('local-player-select');
    const count = selectEl ? parseInt(selectEl.value) : 3;

    const list = document.getElementById('players-list');
    const indicator = document.getElementById('player-count-indicator');
    list.innerHTML = '';
    
    // Créer la liste des joueurs selon le nombre choisi
    const allLocalPlayers = [
        'Joueur 1 (ZQSD)', 
        'Joueur 2 (Flèches)', 
        'Joueur 3 (IJKL)', 
        'Joueur 4 (TFGH)'
    ];
    
    const activePlayers = allLocalPlayers.slice(0, count);
    indicator.innerText = activePlayers.length;
    
    activePlayers.forEach(p => {
        const li = document.createElement('li');
        li.innerText = p;
        list.appendChild(li);
    });
}

function updateLobbyForOnline(clients) {
    // Masquer le sélecteur de joueurs locaux
    const playerCountContainer = document.getElementById('local-player-count-container');
    if (playerCountContainer) playerCountContainer.style.display = 'none';

    const list = document.getElementById('players-list');
    const indicator = document.getElementById('player-count-indicator');
    list.innerHTML = '';
    indicator.innerText = clients.length;

    clients.forEach((client, index) => {
        const li = document.createElement('li');
        const color = PLAYER_COLORS[index] || '#fff';
        const crown = index === 0 ? '👑 ' : `J${index + 1} : `;
        li.innerHTML = `<span style="color:${color}; font-weight:800">${crown}${client.pseudo}</span>`;
        list.appendChild(li);
    });
}

function returnToLobby() {
    engine.stop();
    if (gameMode === 'online' && isHost && socket) {
        socket.emit('requestReturnToLobby', currentRoom);
    } else if (gameMode === 'local') {
        showScreen('lobby-screen');
        updateLobbyForLocal();
    }
}

function leaveRoom() {
    if (gameMode === 'online' && socket) {
        socket.disconnect();
        setTimeout(() => socket.connect(), 150);
        currentRoom = '';
    }
    showScreen('main-menu');
}

// ─── CARTES ───────────────────────────────────────────────────────────────────

function selectMap(index) {
    currentMapIndex = index;
    gameSettings.mapIndex = index;
    document.querySelectorAll('.map-card').forEach((card, i) => {
        card.classList.toggle('active', i === index);
    });
    // Diffuser aux invités si en ligne et hôte
    if (gameMode === 'online' && isHost && socket) {
        socket.emit('updateSettings', { roomCode: currentRoom, settings: gameSettings });
    }
}

// ─── MODALE PARAMÈTRES ────────────────────────────────────────────────────────

function openSettingsModal() {
    document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function setBuffsSetting(isOn) {
    gameSettings.buffs = isOn;
    document.getElementById('btn-buffs-on').classList.toggle('active', isOn);
    document.getElementById('btn-buffs-off').classList.toggle('active', !isOn);
    if (gameMode === 'online' && isHost && socket) {
        socket.emit('updateSettings', { roomCode: currentRoom, settings: gameSettings });
    }
}

function setTimeSetting(time) {
    gameSettings.time = time;
    [60, 120, 180].forEach(t => {
        document.getElementById(`btn-time-${t}`).classList.toggle('active', t === time);
    });
    if (gameMode === 'online' && isHost && socket) {
        socket.emit('updateSettings', { roomCode: currentRoom, settings: gameSettings });
    }
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────

function sendChatMessage() {
    if (!socket || currentRoom === '') return;
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    socket.emit('sendChat', {
        room: currentRoom,
        sender: myPlayerId,
        pseudo: myGlobalPseudo,
        text: msg
    });
    input.value = '';
}

// ==========================================
// 2.5 CHARGEMENT AUTOMATIQUE DES SPRITES
// ==========================================
const sprites = {};
const colors = ['blue', 'green', 'red', 'yellow'];
const states = ['immo', 'w1', 'w2', 'jump'];

function loadAssets() {
    colors.forEach(color => {
        sprites[color] = {};
        
        // 1. États SANS direction (immo, jump)
        ['immo', 'jump'].forEach(s => {
            sprites[color][s] = new Image();
            sprites[color][s].src = `assets/${color}_${s}.png`;
            sprites[color][`${s}_cat`] = new Image();
            sprites[color][`${s}_cat`].src = `assets/${color}_${s}_cat.png`;
        });
        
        // 2. États AVEC direction (w1, w2)
        ['w1', 'w2'].forEach(s => {
            ['L', 'R'].forEach(dir => {
                sprites[color][`${s}_${dir}`] = new Image();
                sprites[color][`${s}_${dir}`].src = `assets/${color}_${s}_${dir}.png`;
                sprites[color][`${s}_${dir}_cat`] = new Image();
                sprites[color][`${s}_${dir}_cat`].src = `assets/${color}_${s}_${dir}_cat.png`;
            });
        });
    });
}
// Lance le chargement dès que le script est chargé
loadAssets();

// ==========================================
// 3. ÉVÉNEMENTS SOCKET (MODE EN LIGNE)
// ==========================================

if (socket) {

    socket.on('lobbyJoined', (data) => {
        isHost = data.isHost;
        currentRoom = data.roomCode;
        gameSettings = { ...gameSettings, ...data.settings };

        showScreen('lobby-screen');

        // Code salon affiché
        const codeDisplay = document.getElementById('room-code-display');
        codeDisplay.style.display = 'block';

        if (isHost) {
            document.getElementById('lobby-title').innerText = 'CHOOSE MAP';
            codeDisplay.innerHTML = `SALON : <strong>${currentRoom}</strong> <span class="host-badge">Vous êtes l'Hôte</span>`;
            document.getElementById('start-btn').style.display = 'block';
            document.getElementById('start-btn').disabled = false;
            document.getElementById('settings-host-controls').classList.remove('disabled-for-guest');
        } else {
            document.getElementById('lobby-title').innerText = 'EN ATTENTE';
            codeDisplay.innerHTML = `SALON : <strong>${currentRoom}</strong> <span class="guest-badge">En attente de l'hôte…</span>`;
            document.getElementById('start-btn').style.display = 'none';
            document.getElementById('settings-host-controls').classList.add('disabled-for-guest');
            // Appliquer les settings de l'hôte
            applySettings(data.settings);
        }

        // Afficher le chat
        document.getElementById('chat-section').classList.remove('hidden');
    });

    socket.on('playersUpdated', (clients) => {
        updateLobbyForOnline(clients);
    });

    socket.on('settingsChanged', (settings) => {
        if (!isHost) {
            gameSettings = { ...gameSettings, ...settings };
            applySettings(settings);
        }
    });

    socket.on('gameStarted', (data) => {
        myPlayerId = data.playerNum === 'spectator' ? 'spectator' : Number(data.playerNum);
        if (data.settings) gameSettings = { ...gameSettings, ...data.settings };
        
        showScreen('game-screen');
        
        const subtitle = document.getElementById('game-subtitle-online');
        if (subtitle) {
            if (myPlayerId === 'spectator') {
                subtitle.innerText = `SALON ${currentRoom} — SPECTATEUR`;
            } else {
                subtitle.innerText = `SALON ${currentRoom} — Joueur ${myPlayerId}`;
            }
            subtitle.style.display = 'block';
        }
        
        // En ligne, le moteur reçoit les positions du serveur → pas de start local
        if (gameMode === 'online') {
            engine.startOnline();
        }
    });

    socket.on('gameUpdate', (data) => {
        // Mise à jour des positions reçues du serveur
        engine.updateFromServer(data.players, data.taggerId);
    });

    socket.on('playerTagged', (data) => {
        engine.taggerId = data.taggerId;
        engine.updateHUD();
    });

    socket.on('returnToLobby', () => {
        engine.stop();
        showScreen('lobby-screen');
        if (isHost) {
            document.getElementById('start-btn').style.display = 'block';
            document.getElementById('settings-host-controls').classList.remove('disabled-for-guest');
            document.getElementById('lobby-title').innerText = 'CHOOSE MAP';
        } else {
            document.getElementById('start-btn').style.display = 'none';
            document.getElementById('settings-host-controls').classList.add('disabled-for-guest');
            document.getElementById('lobby-title').innerText = 'EN ATTENTE';
        }
        document.getElementById('room-code-display').style.display = 'block';
    });

    socket.on('hostMigrated', () => {
        isHost = true;
        document.getElementById('start-btn').style.display = 'block';
        document.getElementById('settings-host-controls').classList.remove('disabled-for-guest');
        const codeDisplay = document.getElementById('room-code-display');
        codeDisplay.innerHTML = `SALON : <strong>${currentRoom}</strong> <span class="host-badge">Vous êtes le nouvel Hôte</span>`;
        document.getElementById('lobby-title').innerText = 'CHOOSE MAP';
    });

    socket.on('roomError', (msg) => {
        alert('❌ ' + msg);
    });

    socket.on('chatMessage', (data) => {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'chat-msg';
        const color = (data.sender !== 'spectator' && data.sender <= 6)
            ? PLAYER_COLORS[data.sender - 1]
            : '#aaa';
        div.innerHTML = `<span style="color:${color}; font-weight:700">${escapeHtml(data.pseudo)}</span> : ${escapeHtml(data.text)}`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applySettings(settings) {
    if (settings.mapIndex !== undefined) {
        selectMap(settings.mapIndex);
    }
    if (settings.buffs !== undefined) {
        document.getElementById('btn-buffs-on').classList.toggle('active', settings.buffs);
        document.getElementById('btn-buffs-off').classList.toggle('active', !settings.buffs);
    }
    if (settings.time !== undefined) {
        [60, 120, 180].forEach(t => {
            document.getElementById(`btn-time-${t}`).classList.toggle('active', t === settings.time);
        });
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ==========================================
// 4. MOTEUR PHYSIQUE (TAG ENGINE)
// ==========================================

class TagEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.players = [];
        this.platforms = [];
        this.taggerId = null;
        this.tagCooldown = 0;
        this.isOnline = false;
        
        this.gravity = 0.6;
        this.friction = 0.82;
        this.jumpForce = -13;
        this.moveSpeed = 1.2;
        this.maxSpeed = 8;
        
        this.isRunning = false;
        this.lastTime = 0;
        this.loop = this.loop.bind(this);
    }

    // ─── MODE LOCAL ──────────────────────────────────────────────────────────
    start(mapIndex, playerCount) {
        this.isOnline = false;
        this.loadMap(mapIndex);
        this.spawnPlayers(playerCount);
        this.taggerId = this.players[Math.floor(Math.random() * this.players.length)].id;
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
        this.updateHUD();
    }

    // ─── MODE EN LIGNE ────────────────────────────────────────────────────────
    startOnline() {
        this.isOnline = true;
        this.loadMap(gameSettings.mapIndex || 0);
        this.players = [];
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }

    // Mise à jour des positions reçues du serveur
    updateFromServer(serverPlayers, taggerId) {
        if (!this.isOnline) return;
        this.players = serverPlayers;
        this.taggerId = taggerId;
        this.updateHUD();
        // Envoyer les entrées clavier au serveur
        if (socket && myPlayerId !== 'spectator') {
            const myInput = inputs[myPlayerId] || { left: false, right: false, jump: false };
            socket.emit('playerInput', myInput);
        }
    }

    stop() {
        this.isRunning = false;
    }

    loadMap(index) {
        this.platforms = [];
        this.platforms.push({ x: -50, y: 0, w: 50, h: this.height });
        this.platforms.push({ x: this.width, y: 0, w: 50, h: this.height });
        this.platforms.push({ x: 0, y: this.height - 40, w: this.width, h: 40 });

        if (index === 0) {
            this.platforms.push({ x: 150, y: 400, w: 200, h: 20 });
            this.platforms.push({ x: 650, y: 400, w: 200, h: 20 });
            this.platforms.push({ x: 400, y: 280, w: 200, h: 20 });
            this.platforms.push({ x: 100, y: 180, w: 150, h: 20 });
            this.platforms.push({ x: 750, y: 180, w: 150, h: 20 });
        } else if (index === 1) {
            this.platforms.push({ x: 200, y: 450, w: 150, h: 20 });
            this.platforms.push({ x: 650, y: 450, w: 150, h: 20 });
            this.platforms.push({ x: 420, y: 350, w: 180, h: 20 });
            this.platforms.push({ x: 200, y: 220, w: 150, h: 20 });
            this.platforms.push({ x: 650, y: 220, w: 150, h: 20 });
        } else if (index === 2) {
            this.platforms.push({ x: 300, y: 450, w: 424, h: 20 });
            this.platforms.push({ x: 380, y: 350, w: 264, h: 20 });
            this.platforms.push({ x: 460, y: 250, w: 104, h: 20 });
        }
    }

    spawnPlayers(count) {
        this.players = [];
        const colors = ['#e63946', '#2196f3', '#2ecc71', '#f4e04d', '#ff4081', '#18ffff'];
        const pseudos = ['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4'];
        for (let i = 0; i < count; i++) {
            this.players.push({
                id: i + 1,
                pseudo: pseudos[i] || `J${i + 1}`,
                x: 100 + (i * 200),
                y: 100,
                w: 32, h: 32,
                vx: 0, vy: 0,
                color: colors[i],
                onGround: false
            });
        }
    }

    rectIntersect(r1, r2) {
        return !(r2.x >= r1.x + r1.w || r2.x + r2.w <= r1.x || r2.y >= r1.y + r1.h || r2.y + r2.h <= r1.y);
    }

    checkCollisions(p) {
        p.onGround = false;
        p.x += p.vx;
        for (let plat of this.platforms) {
            if (this.rectIntersect(p, plat)) {
                if (p.vx > 0) { p.x = plat.x - p.w; p.vx = 0; }
                else if (p.vx < 0) { p.x = plat.x + plat.w; p.vx = 0; }
            }
        }
        p.y += p.vy;
        for (let plat of this.platforms) {
            if (this.rectIntersect(p, plat)) {
                if (p.vy > 0) { p.y = plat.y - p.h; p.vy = 0; p.onGround = true; }
                else if (p.vy < 0) { p.y = plat.y + plat.h; p.vy = 0; }
            }
        }
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        this.lastTime = timestamp;
        if (!this.isOnline) this.updatePhysics();
        this.draw();
        requestAnimationFrame(this.loop);
    }

    updatePhysics() {
        if (this.tagCooldown > 0) this.tagCooldown--;

        for (let p of this.players) {
            let input = inputs[p.id] || { left: false, right: false, jump: false };
            if (input.left) p.vx -= this.moveSpeed;
            if (input.right) p.vx += this.moveSpeed;
            p.vx *= this.friction;
            if (p.vx > this.maxSpeed) p.vx = this.maxSpeed;
            if (p.vx < -this.maxSpeed) p.vx = -this.maxSpeed;
            p.vy += this.gravity;
            if (input.jump && p.onGround) p.vy = this.jumpForce;
            this.checkCollisions(p);
            if (p.y < 0) { p.y = 0; p.vy = 0; }
        }
        this.checkTagging();
    }

    checkTagging() {
        if (this.tagCooldown > 0) return;
        const tagger = this.players.find(p => p.id === this.taggerId);
        if (!tagger) return;
        for (let p of this.players) {
            if (p.id !== tagger.id && this.rectIntersect(tagger, p)) {
                this.taggerId = p.id;
                this.tagCooldown = 60;
                this.updateHUD();
                break;
            }
        }
    }

    draw() {
        // 1. Fond du jeu
        this.ctx.fillStyle = '#4facfe';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. Dessin des plateformes
        this.ctx.fillStyle = '#2c3e50';
        for (let plat of this.platforms) {
            this.ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        }

        // 3. Dessin des joueurs
        for (let p of this.players) {
            let colorName = colors[p.id - 1] || 'blue';
            let dir = p.vx >= 0 ? 'R' : 'L';
            let state = 'immo';

            if (!p.onGround) {
                state = 'jump';
            } else if (Math.abs(p.vx) > 0.5) {
                state = (Math.floor(Date.now() / 200) % 2 === 0) ? 'w1' : 'w2';
            }

            // Construction de la clé : si immo ou jump, pas de suffixe _L ou _R
            let key = (state === 'immo' || state === 'jump') ? state : `${state}_${dir}`;
            
            // Si c'est le tagger (loup/chat), on ajoute le suffixe _cat
            if (p.id === this.taggerId) key += '_cat';

            let asset = sprites[colorName] ? sprites[colorName][key] : null;

            // Dessin du sprite ou du rectangle de secours
            if (asset && asset.complete && asset.naturalWidth > 0) {
                this.ctx.drawImage(asset, p.x, p.y, p.w, p.h);
            } else {
                this.ctx.fillStyle = (p.id === this.taggerId) ? '#ff0000' : (p.color || '#fff');
                this.ctx.fillRect(p.x, p.y, p.w, p.h);
            }

            // 4. Triangle blanc retourné uniquement au-dessus du "Chat" (tagger)
            if (p.id === this.taggerId) {
                let centerX = p.x + p.w / 2;
                this.ctx.fillStyle = '#ffffff'; // Blanc
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, p.y - 5);      // Pointe en bas
                this.ctx.lineTo(centerX - 6, p.y - 15); // Sommet gauche
                this.ctx.lineTo(centerX + 6, p.y - 15); // Sommet droit
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
    }

    updateHUD() {
        const hud = document.getElementById('tagger-indicator');
        if (!hud) return;
        const tagger = this.players.find(p => p.id === this.taggerId);
        if (tagger) {
            const name = tagger.pseudo || (this.isOnline ? tagger.id : `Joueur ${tagger.id}`);
            hud.innerText = `CHAT : ${name}`;
            hud.style.color = tagger.color || '#fff';
        } else {
            hud.innerText = `CHAT : —`;
        }
        hud.style.textShadow = '2px 2px 0 #000';
    }
}

// ==========================================
// 5. ENTRÉES CLAVIER (LOCAL MULTIJOUEUR)
// ==========================================

const inputs = {
    1: { left: false, right: false, jump: false },
    2: { left: false, right: false, jump: false },
    3: { left: false, right: false, jump: false },
    4: { left: false, right: false, jump: false }
};

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    // Joueur 1 : ZQSD
    if (key === 'q') inputs[1].left = true;
    if (key === 'd') inputs[1].right = true;
    if (key === 'z') inputs[1].jump = true;
    
    // Joueur 2 : Flèches
    if (e.key === 'ArrowLeft') inputs[2].left = true;
    if (e.key === 'ArrowRight') inputs[2].right = true;
    if (e.key === 'ArrowUp') inputs[2].jump = true;
    
    // Joueur 3 : IJKL
    if (key === 'j') inputs[3].left = true;
    if (key === 'l') inputs[3].right = true;
    if (key === 'i') inputs[3].jump = true;
    
    // Joueur 4 : TFGH (Nouveau)
    if (key === 'f') inputs[4].left = true;
    if (key === 'h') inputs[4].right = true;
    if (key === 't') inputs[4].jump = true;

    // Chat : Entrée pour envoyer
    if (e.key === 'Enter' && document.activeElement.id === 'chat-input') {
        sendChatMessage();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    
    // Joueur 1
    if (key === 'q') inputs[1].left = false;
    if (key === 'd') inputs[1].right = false;
    if (key === 'z') inputs[1].jump = false;
    
    // Joueur 2
    if (e.key === 'ArrowLeft') inputs[2].left = false;
    if (e.key === 'ArrowRight') inputs[2].right = false;
    if (e.key === 'ArrowUp') inputs[2].jump = false;
    
    // Joueur 3
    if (key === 'j') inputs[3].left = false;
    if (key === 'l') inputs[3].right = false;
    if (key === 'i') inputs[3].jump = false;
    
    // Joueur 4
    if (key === 'f') inputs[4].left = false;
    if (key === 'h') inputs[4].right = false;
    if (key === 't') inputs[4].jump = false;
});

// ==========================================
// 6. DÉMARRAGE DU JEU
// ==========================================

let engine = new TagEngine('game-canvas');

function startGame() {
    if (gameMode === 'local') {
        showScreen('game-screen');
        // Lire le nombre choisi
        const selectEl = document.getElementById('local-player-select');
        const count = selectEl ? parseInt(selectEl.value) : 3;
        // Lancer le moteur avec le bon nombre de joueurs
        engine.start(currentMapIndex, count);
    } else if (gameMode === 'online' && isHost && socket) {
        socket.emit('requestStartGame', { roomCode: currentRoom });
    }
}
