// ==========================================
// 1. VARIABLES GLOBALES ET ÉTAT DE L'INTERFACE
// ==========================================
let socket = null;
if (typeof io !== 'undefined') {
    socket = io();
}

let gameMode = 'local';
let currentMapIndex = 0;
let gameSettings = { buffs: true, time: 120 };

// ==========================================
// 2. GESTION DE L'INTERFACE (MENUS & MODALES)
// ==========================================

function showScreen(screenId) {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('connection-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById(screenId).classList.remove('hidden');
}

function selectMode(mode) {
    gameMode = mode;
    if (mode === 'local') {
        // En local, on saute l'étape de connexion et on va direct au lobby
        showScreen('lobby-screen');
        updateLobbyUI();
    } else {
        // En ligne, on demande le pseudo et le salon
        showScreen('connection-screen');
    }
}

function joinOrCreateRoom() {
    // Logique réseau future... Pour l'instant, on simule l'entrée dans le salon
    showScreen('lobby-screen');
    updateLobbyUI();
}

function returnToLobby() {
    engine.stop();
    showScreen('lobby-screen');
}

function leaveRoom() {
    showScreen('main-menu');
}

// --- Cartes ---
function selectMap(index) {
    currentMapIndex = index;
    document.querySelectorAll('.map-card').forEach((card, i) => {
        card.classList.toggle('active', i === index);
    });
}

// --- Modale Settings ---
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
}

function setTimeSetting(time) {
    gameSettings.time = time;
    [60, 120, 180].forEach(t => {
        document.getElementById(`btn-time-${t}`).classList.toggle('active', t === time);
    });
}

function updateLobbyUI() {
    const list = document.getElementById('players-list');
    const indicator = document.getElementById('player-count-indicator');
    list.innerHTML = '';
    
    // Pour le prototype local, on crée 2 à 4 joueurs par défaut
    const localPlayers = ['Joueur 1 (ZQSD)', 'Joueur 2 (Flèches)', 'Joueur 3 (IJKL)'];
    indicator.innerText = localPlayers.length;
    
    localPlayers.forEach(p => {
        const li = document.createElement('li');
        li.innerText = p;
        list.appendChild(li);
    });
}

// ==========================================
// 3. MOTEUR PHYSIQUE (TAG ENGINE)
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
        this.tagCooldown = 0; // Empêche de retoucher immédiatement
        
        // Constantes physiques
        this.gravity = 0.6;
        this.friction = 0.82;
        this.jumpForce = -13;
        this.moveSpeed = 1.2;
        this.maxSpeed = 8;
        
        this.isRunning = false;
        this.lastTime = 0;
        
        // Bind de la boucle
        this.loop = this.loop.bind(this);
    }

    start(mapIndex, playerCount) {
        this.loadMap(mapIndex);
        this.spawnPlayers(playerCount);
        
        // Choix du premier chat aléatoire
        this.taggerId = this.players[Math.floor(Math.random() * this.players.length)].id;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
        
        this.updateHUD();
    }

    stop() {
        this.isRunning = false;
    }

    loadMap(index) {
        this.platforms = [];
        // Bordures de l'écran (Murs invisibles ou visibles)
        this.platforms.push({ x: -50, y: 0, w: 50, h: this.height }); // Mur Gauche
        this.platforms.push({ x: this.width, y: 0, w: 50, h: this.height }); // Mur Droit
        this.platforms.push({ x: 0, y: this.height - 40, w: this.width, h: 40 }); // Sol principal
        
        if (index === 0) {
            // Map 0 : Forêt (Classique)
            this.platforms.push({ x: 150, y: 400, w: 200, h: 20 });
            this.platforms.push({ x: 650, y: 400, w: 200, h: 20 });
            this.platforms.push({ x: 400, y: 280, w: 200, h: 20 });
            this.platforms.push({ x: 100, y: 180, w: 150, h: 20 });
            this.platforms.push({ x: 750, y: 180, w: 150, h: 20 });
        } else if (index === 1) {
            // Map 1 : Hiver (Plateformes espacées)
            this.platforms.push({ x: 200, y: 450, w: 150, h: 20 });
            this.platforms.push({ x: 650, y: 450, w: 150, h: 20 });
            this.platforms.push({ x: 420, y: 350, w: 180, h: 20 });
            this.platforms.push({ x: 200, y: 220, w: 150, h: 20 });
            this.platforms.push({ x: 650, y: 220, w: 150, h: 20 });
        } else if (index === 2) {
            // Map 2 : Egypte (Pyramide)
            this.platforms.push({ x: 300, y: 450, w: 424, h: 20 });
            this.platforms.push({ x: 380, y: 350, w: 264, h: 20 });
            this.platforms.push({ x: 460, y: 250, w: 104, h: 20 });
        }
    }

    spawnPlayers(count) {
        this.players = [];
        const colors = ['#e63946', '#2196f3', '#2ecc71', '#f4e04d']; // Rouge, Bleu, Vert, Jaune
        
        for (let i = 0; i < count; i++) {
            this.players.push({
                id: i + 1,
                x: 100 + (i * 200),
                y: 100,
                w: 32,
                h: 32,
                vx: 0,
                vy: 0,
                color: colors[i],
                onGround: false
            });
        }
    }

    // Gestion AABB (Axis-Aligned Bounding Box) pour les collisions
    checkCollisions(p) {
        p.onGround = false;
        
        // 1. Appliquer X et vérifier collisions X
        p.x += p.vx;
        for (let plat of this.platforms) {
            if (this.rectIntersect(p, plat)) {
                if (p.vx > 0) { // Touche le côté gauche du mur
                    p.x = plat.x - p.w;
                    p.vx = 0;
                } else if (p.vx < 0) { // Touche le côté droit du mur
                    p.x = plat.x + plat.w;
                    p.vx = 0;
                }
            }
        }
        
        // 2. Appliquer Y et vérifier collisions Y
        p.y += p.vy;
        for (let plat of this.platforms) {
            if (this.rectIntersect(p, plat)) {
                if (p.vy > 0) { // Tombe sur le sol
                    p.y = plat.y - p.h;
                    p.vy = 0;
                    p.onGround = true;
                } else if (p.vy < 0) { // Tape le plafond
                    p.y = plat.y + plat.h;
                    p.vy = 0;
                }
            }
        }
    }

    rectIntersect(r1, r2) {
        return !(r2.x >= r1.x + r1.w || 
                 r2.x + r2.w <= r1.x || 
                 r2.y >= r1.y + r1.h || 
                 r2.y + r2.h <= r1.y);
    }

    loop(timestamp) {
        if (!this.isRunning) return;
        
        const delta = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.updatePhysics();
        this.draw();
        
        requestAnimationFrame(this.loop);
    }

    updatePhysics() {
        if (this.tagCooldown > 0) this.tagCooldown--;

        for (let p of this.players) {
            let input = inputs[p.id] || { left: false, right: false, jump: false };
            
            // Entrées horizontales
            if (input.left) p.vx -= this.moveSpeed;
            if (input.right) p.vx += this.moveSpeed;
            
            // Friction et Limite de vitesse
            p.vx *= this.friction;
            if (p.vx > this.maxSpeed) p.vx = this.maxSpeed;
            if (p.vx < -this.maxSpeed) p.vx = -this.maxSpeed;
            
            // Gravité et Saut
            p.vy += this.gravity;
            if (input.jump && p.onGround) {
                p.vy = this.jumpForce;
            }
            
            // Résolution des collisions
            this.checkCollisions(p);
            
            // Bloquer au plafond de l'écran par sécurité
            if (p.y < 0) { p.y = 0; p.vy = 0; }
        }

        // Vérification de la mécanique de Tag (Toucher)
        this.checkTagging();
    }

    checkTagging() {
        if (this.tagCooldown > 0) return; // En pause
        
        const tagger = this.players.find(p => p.id === this.taggerId);
        if (!tagger) return;

        for (let p of this.players) {
            if (p.id !== tagger.id && this.rectIntersect(tagger, p)) {
                // TAG ! Transfert du rôle
                this.taggerId = p.id;
                this.tagCooldown = 60; // 1 seconde d'invincibilité à 60fps
                this.updateHUD();
                break;
            }
        }
    }

    draw() {
        // Effacer l'écran (fond bleu ciel pour l'instant)
        this.ctx.fillStyle = '#4facfe';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Dessiner les plateformes
        this.ctx.fillStyle = '#2c3e50';
        for (let plat of this.platforms) {
            this.ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        }
        
        // Dessiner les joueurs
        for (let p of this.players) {
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, p.w, p.h);
            
            // Ajouter une bordure noire pour le style
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(p.x, p.y, p.w, p.h);
            
            // Si c'est le chat, dessiner le triangle rouge au-dessus de sa tête
            if (p.id === this.taggerId) {
                this.ctx.fillStyle = '#ff0000';
                this.ctx.beginPath();
                this.ctx.moveTo(p.x + p.w / 2, p.y - 15); // Pointe haute
                this.ctx.lineTo(p.x + p.w / 2 - 10, p.y - 5); // Bas gauche
                this.ctx.lineTo(p.x + p.w / 2 + 10, p.y - 5); // Bas droite
                this.ctx.fill();
                this.ctx.stroke();
            }
        }
    }

    updateHUD() {
        const hud = document.getElementById('tagger-indicator');
        if(hud) {
            hud.innerText = `CHAT : JOUEUR ${this.taggerId}`;
            // Mettre la couleur du texte à la couleur du joueur
            const color = this.players.find(p => p.id === this.taggerId)?.color || '#fff';
            hud.style.color = color;
            hud.style.textShadow = '2px 2px 0 #000';
        }
    }
}

// ==========================================
// 4. GESTION DES ENTRÉES CLAVIER (MULTIPLAYEUR LOCAL)
// ==========================================

const inputs = {
    1: { left: false, right: false, jump: false },
    2: { left: false, right: false, jump: false },
    3: { left: false, right: false, jump: false }
};

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    // Joueur 1 : Z Q S D
    if (key === 'q') inputs[1].left = true;
    if (key === 'd') inputs[1].right = true;
    if (key === 'z') inputs[1].jump = true;
    
    // Joueur 2 : Flèches
    if (e.key === 'ArrowLeft') inputs[2].left = true;
    if (e.key === 'ArrowRight') inputs[2].right = true;
    if (e.key === 'ArrowUp') inputs[2].jump = true;
    
    // Joueur 3 : I J K L
    if (key === 'j') inputs[3].left = true;
    if (key === 'l') inputs[3].right = true;
    if (key === 'i') inputs[3].jump = true;
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
});

// ==========================================
// 5. INITIALISATION DU JEU
// ==========================================

let engine = new TagEngine('game-canvas');

function startGame() {
    showScreen('game-screen');
    // On lance la partie avec la carte sélectionnée et 3 joueurs pour tester le clavier
    engine.start(currentMapIndex, 3);
}
