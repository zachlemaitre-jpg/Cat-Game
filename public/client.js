const socket = io();

// 1. TUILES
const TILES = {
    FLOOR: 0, WALL: 1, ENTRY_DOOR: 99,
    
    // === MEUBLES ===
    
    // === CACHETTES ===
    BED:             70,   // 36x58 lit
    BED_OPEN:        71,   // 19x59 lit ouvert
    BED_DOUBLE:      72,   // 67x58 lit double
    BED_DOUBLE_OPEN: 73,   // 19x59 lit double ouvert
    WARDROBE:        80,   // 48x48 armoire
    WARDROBE_OPEN:   81,   // 48x48 armoire ouverte
    KANGOO:          76,   // voiture
    KANGOO_OPEN:     77,   // voiture ouverte
    SHOWER:          74,   // douche
    SHOWER_OPEN:     75,   // douche ouverte
    RUG:             78,   // tapis
    RUG_OPEN:        79,   // tapis ouvert
    BATHTUB:         88,   // baignoire
    BATHTUB_OPEN:    89,   // baignoire ouverte

    // === DECORS ===
    PLANT:           61,   // 25x24 plante décorative
    CHAIR:           60,   // 32x32 décoratif
    DESK_MAC:        31,   // 51x25 version Mac
    PLANT:           61,   // 25x24 décoratif
    NIGHTSTAND:      62,   // 23x23 table de chevet 
    CHAIR_DESK:      63,   // 30x28 chaise de bureau
    LAMP:            64,   // 23x23 lampe de chambre
    BILLARD:         65,   // billard
    CHAIR_TABLE:     67,   // chaise table
    FRIDGE:          69,   // frigo
    COUCH:           66,   // canapé
    ARMCHAIR:        68,   // fauteuil
    BOILER:          82,   // chaudière
    MOTO:            83,   // moto Kawasaki
    TRUNK:           84,   // malle
    TABLE:           85,   // table
    TV:              87,   // télévision
    TOILET:          50,   // wc
};

// 2. DICTIONNAIRE D'IMAGES
const imagePaths = {
    // === TRAQUÉ (HIDER) ===
    hider_down: 'assets/hider_down.png',
    hider_up: 'assets/hider_up.png',
    hider_left: 'assets/hider_left.png',
    hider_right: 'assets/hider_right.png',

    // === CHASSEUR (HUNTER) - IDLE ===
    hunter_idle_down: 'assets/hunter_idle_down.png',
    hunter_idle_up: 'assets/hunter_idle_up.png',
    hunter_idle_left: 'assets/hunter_idle_left.png',
    hunter_idle_right: 'assets/hunter_idle_right.png',

    // === CHASSEUR (HUNTER) - WALK ===
    hunter_walk1_down: 'assets/hunter_walk1_down.png',
    hunter_walk2_down: 'assets/hunter_walk2_down.png',
    hunter_walk1_up: 'assets/hunter_walk1_up.png',
    hunter_walk2_up: 'assets/hunter_walk2_up.png',
    hunter_walk1_left: 'assets/hunter_walk1_left.png',
    hunter_walk2_left: 'assets/hunter_walk2_left.png',
    hunter_walk1_right: 'assets/hunter_walk1_right.png',
    hunter_walk2_right: 'assets/hunter_walk2_right.png',
    
    // === DÉCORS ET MEUBLES ===
    [TILES.FLOOR]:           'assets/sol.png',
    [TILES.WALL]:            'assets/mur.png',

    // === CACHETTES ===
    [TILES.BED]:             'assets/bed.png',
    [TILES.BED_OPEN]:        'assets/bed_f.png',
    [TILES.BED_DOUBLE]:      'assets/lit_double.png',
    [TILES.BED_DOUBLE_OPEN]: 'assets/lit_double_f.png',
    [TILES.WARDROBE]:        'assets/armoire.png',
    [TILES.WARDROBE_OPEN]:   'assets/armoire_f.png',
    [TILES.SHOWER]:          'assets/douche.png',
    [TILES.SHOWER_OPEN]:     'assets/douche_f.png',
    [TILES.KANGOO]:          'assets/kangoo.png',
    [TILES.KANGOO_OPEN]:     'assets/kangoo_f.png',
    [TILES.RUG]:             'assets/tapis.png',    
    [TILES.RUG_OPEN]:        'assets/tapis_f.png',
    [TILES.BATHTUB]:         'assets/baignoire.png',      
    [TILES.BATHTUB_OPEN]:    'assets/baignoire.png',

    // === DECORS ===
    [TILES.CHAIR]:           'assets/chaise.png',
    [TILES.DESK]:            'assets/bureau.png',
    [TILES.SHELF]:           'assets/etagere.png',
    [TILES.DESK_MAC]:        'assets/bureau_mac.png',
    [TILES.PLANT]:           'assets/plant.png',
    [TILES.NIGHTSTAND]:      'assets/chevet.png',
    [TILES.CHAIR_DESK]:      'assets/desk_chair.png',
    [TILES.LAMP]:            'assets/lampe.png',
    [TILES.BILLARD]:         'assets/billard.png',
    [TILES.COUCH]:           'assets/canape.png',
    [TILES.CHAIR_TABLE]:     'assets/chaise_table.png',
    [TILES.ARMCHAIR]:        'assets/fauteuil.png',
    [TILES.FRIDGE]:          'assets/frigo.png',
    [TILES.FRIDGE]:          'assets/frigo.png',
    [TILES.TOILET]:          'assets/toilettes.png',    //(utiliser l'ID 50)
    [TILES.BOILER]:          'assets/chaudiere.png',    
    [TILES.MOTO]:            'assets/kawasaki.png',   
    [TILES.TRUNK]:           'assets/malle.png',       
    [TILES.TABLE]:           'assets/table.png',     
    [TILES.TV]:              'assets/tv.png',     
    

};

// ==========================================
// 1. VARIABLES GLOBALES
// ==========================================
let myRole = 'SPECTATOR';
let isHost = false;
let currentRoom = '';
let gameSettings = { roundDuration: 120000, mapIndex: 0 };

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 32;
const FLOOR_HEIGHT_TILES = 12;
const FLOOR_HEIGHT_PX = FLOOR_HEIGHT_TILES * TILE_SIZE;

let isPlaying = false;
let mapTiles = [];
let playersState = {};
let timeRemaining = 0;
let hunterCountdown = 0; // Décompte de 10s avant que le chasseur puisse jouer
let clientsInputs = {};
let isWallGrid = []; // NOUVEAU : La grille de collision et d'ombre
let furnitures = []; // Liste des entités (vide pour l'instant) 

// --- Gestion des Touches ---
const keys = { up: false, down: false, left: false, right: false, action1: false, action2: false };

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase(); // Transforme Z en z
    if (key === 'z' || e.key === 'ArrowUp') keys.up = true;
    if (key === 's' || e.key === 'ArrowDown') keys.down = true;
    if (key === 'q' || e.key === 'ArrowLeft') keys.left = true;
    if (key === 'd' || e.key === 'ArrowRight') keys.right = true;
    if (key === 'e') keys.action1 = true; 
    if (key === 'f') keys.action2 = true; 
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'z' || e.key === 'ArrowUp') keys.up = false;
    if (key === 's' || e.key === 'ArrowDown') keys.down = false;
    if (key === 'q' || e.key === 'ArrowLeft') keys.left = false;
    if (key === 'd' || e.key === 'ArrowRight') keys.right = false;
    if (key === 'e') keys.action1 = false;
    if (key === 'f') keys.action2 = false;
});

// --- Préchargement des Images ---
const images = {};
// Associe chaque type de tuile (et les personnages) à son chemin d'image

let imagesLoaded = 0;
const totalImages = Object.keys(imagePaths).length;

function loadImages() {
    console.log(`[Images] Chargement de ${totalImages} images...`);
    for (const key in imagePaths) {
        images[key] = new Image();
        images[key].src = imagePaths[key];
        images[key].onload = () => {
            imagesLoaded++;
            console.log(`[Images] ${imagesLoaded}/${totalImages} — OK : ${imagePaths[key]}`);
        };
        images[key].onerror = () => {
            imagesLoaded++; // On compte quand même pour ne pas bloquer le rendu
            console.error(`[Images] MANQUANT (${imagesLoaded}/${totalImages}) : ${imagePaths[key]}`);
        };
    }
}
loadImages();


// ==========================================
// 2. GESTION DE L'INTERFACE (LOBBY)
// ==========================================

function showScreen(screenId) {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('film-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById(screenId).classList.remove('hidden');
}

function joinOrCreateRoom() {
    const pseudo = document.getElementById('pseudo-input').value.trim() || 'Joueur';
    const room = document.getElementById('room-input').value.trim().toUpperCase();

    if (room === '') socket.emit('createRoom', { pseudo });
    else socket.emit('joinRoom', { roomCode: room, pseudo });
}

function requestRole(action) {
    if (currentRoom) socket.emit('lobbyAction', { room: currentRoom, action: action });
}

function setTime(action) {
    if (isHost && currentRoom) socket.emit('lobbyAction', { room: currentRoom, action: action });
}

function changeMap(mapIndex) {
    if (isHost && currentRoom) {
        socket.emit('lobbyAction', { room: currentRoom, action: 'SET_MAP_' + mapIndex });
    }
}

function startGame() {
    if (isHost && currentRoom) socket.emit('startGame', currentRoom);
}

function goToFilmMode() {
    if (myRole === 'SPECTATOR') {
        alert("Choisis d'abord un rôle (Chasseur ou Traqué) avant d'entrer en Mode Film.");
        return;
    }
    const subtitle = document.getElementById('film-mode-subtitle');
    if (myRole === 'HUNTER') subtitle.innerText = 'MODE CHASSEUR';
    else if (myRole === 'HIDER') subtitle.innerText = 'MODE TRAQUÉ';
    showScreen('film-screen');
}

function startFilmGame() {
    if (currentRoom) socket.emit('startFilmMode', currentRoom);
}

function leaveRoom() {
    if (currentRoom) socket.emit('leaveRoom', currentRoom);
    currentRoom = '';
    isHost = false;
    myRole = 'SPECTATOR';
    isPlaying = false;
    showScreen('main-menu');
}

function returnToLobby() {
    if (currentRoom) socket.emit('returnToLobby', currentRoom);
}

function updateTimeButtons(duration) {
    document.getElementById('btn-time-120').classList.toggle('active', duration === 120000);
    document.getElementById('btn-time-180').classList.toggle('active', duration === 180000);
    document.getElementById('btn-time-240').classList.toggle('active', duration === 240000);
}


// ==========================================
// 3. ÉCOUTES DU SERVEUR (RÉSEAU)
// ==========================================

socket.on('errorMsg', (msg) => alert("Erreur : " + msg));

socket.on('lobbyJoined', (data) => {
    currentRoom = data.roomCode;
    isHost = data.isHost;
    gameSettings = data.settings;
    
    document.getElementById('room-code-display').innerText = currentRoom;
    showScreen('lobby-screen');

    const hostSettings = document.getElementById('host-settings');
    const startBtn = document.getElementById('start-btn');
    
    if (isHost) {
        hostSettings.classList.remove('disabled-for-client');
        startBtn.innerText = "LANCER LA PARTIE";
    } else {
        hostSettings.classList.add('disabled-for-client');
        startBtn.innerText = "En attente de l'hôte...";
    }
    updateTimeButtons(gameSettings.roundDuration);
    if (gameSettings.mapIndex !== undefined) {
        const mapSelect = document.getElementById('map-select');
        if (mapSelect) mapSelect.value = String(gameSettings.mapIndex);
    }
});

socket.on('playersUpdated', (players) => {
    const huntersList   = document.getElementById('hunters-list');
    const hidersList    = document.getElementById('hiders-list');
    const spectatorsList = document.getElementById('spectators-list');

    huntersList.innerHTML = '';
    hidersList.innerHTML  = '';
    spectatorsList.innerHTML = '';

    // Synchroniser playersState pendant le lobby ET en jeu (hôte uniquement).
    // Sans ça, playersState serait vide au lancement et la caméra planterait.
    if (isHost) {
        const knownIds = new Set(players.map(p => p.id));
        for (const id in playersState) {
            if (!knownIds.has(id)) delete playersState[id];
        }
        players.forEach(p => {
            if (!playersState[p.id]) {
                playersState[p.id] = {
                    id: p.id, pseudo: p.pseudo, role: p.role,
                    x: 36, y: 36, size: 24, speed: 120, alive: true, hidden: false
                };
            } else {
                playersState[p.id].role = p.role;
                playersState[p.id].pseudo = p.pseudo;
            }
        });
        console.log(`[Lobby] playersState : ${Object.keys(playersState).length} joueur(s)`);
    }

    players.forEach(p => {
        if (p.id === socket.id) myRole = p.role;

        const li = document.createElement('li');
        const crown = (p.id === players[0].id) ? ' \u{1F451}' : '';
        li.textContent = p.pseudo + crown;

        if (p.role === 'HUNTER') {
            huntersList.appendChild(li);
        } else if (p.role === 'HIDER') {
            hidersList.appendChild(li);
        } else {
            spectatorsList.appendChild(li);
        }
    });
});

socket.on('settingsUpdated', (settings) => {
    gameSettings = settings;
    updateTimeButtons(settings.roundDuration);
    if (settings.mapIndex !== undefined) {
        const mapSelect = document.getElementById('map-select');
        if (mapSelect) mapSelect.value = String(settings.mapIndex);
    }
});

socket.on('hostMigrated', () => {
    isHost = true;
    document.getElementById('host-settings').classList.remove('disabled-for-client');
    document.getElementById('start-btn').innerText = "LANCER LA PARTIE";
    alert("L'hôte a quitté, vous êtes le nouveau chef du salon !");
});

socket.on('gameStarted', () => {
    document.getElementById('game-message').style.display = 'none';
    showScreen('game-screen');
    initGameEngine();
});

socket.on('returnedToLobby', () => {
    isPlaying = false;
    hunterCountdown = 0;
    mapTiles = [];
    playersState = {};
    clientsInputs = {};
    document.getElementById('game-message').style.display = 'none';
    showScreen('lobby-screen');
});

// Réception des inputs (uniquement pour l'Hôte)
socket.on('clientInput', (data) => {
    if (isHost) clientsInputs[data.clientId] = data.input;
});

// Réception de l'état officiel (uniquement pour les invités)
socket.on('syncState', (state) => {
    if (!isHost) {
        playersState = state.players; 
        mapTiles = state.currentMapTiles;
        furnitures = state.furnitures; // <-- NOUVEAU !
        timeRemaining = state.timeRemaining; 
        hunterCountdown = state.hunterCountdown;
        updateHUD();
    }
});

function updateHUD() {
    const hud = document.getElementById('time-left');
    if (myRole === 'HUNTER' && hunterCountdown > 0) {
        hud.innerText = 'ATTENDS : ' + Math.ceil(hunterCountdown / 1000) + 's';
        hud.style.color = '#e63946';
    } else {
        hud.innerText = 'Temps : ' + Math.floor(timeRemaining / 1000);
        hud.style.color = '';
    }
}


// ==========================================
// 4. MOTEUR DE JEU (LOGIQUE & BOUCLE)
// ==========================================

function initGameEngine() {
    isPlaying = true;
    
    generateInitialState();

    // Envoi des inputs au serveur (30 fps)
    setInterval(() => {
        if (!isPlaying) return;
        socket.emit('playerInput', { room: currentRoom, input: { ...keys } });
    }, 1000 / 30);

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// --- NOUVELLE STRUCTURE DE CARTE ---

function generateInitialState() {
    // 1. Initialisation de la grille de murs (896x480px / 16px => 30 lignes x 56 colonnes)
    isWallGrid = [];
    for (let y = 0; y < 30; y++) {
        isWallGrid[y] = new Array(56).fill(false);
    }
    furnitures = []; 

    // Outils de traçage sur grille
    function addWallBlock(gx, gy, gWidth, gHeight) {
        for (let y = gy; y < gy + gHeight; y++) {
            for (let x = gx; x < gx + gWidth; x++) {
                if (y >= 0 && y < 30 && x >= 0 && x < 56) isWallGrid[y][x] = true;
            }
        }
    }
    function addDiagonalWall(idPrefix, startX, startY, endX, endY) {
        const steps = 60;
        const dx = (endX - startX) / steps;
        const dy = (endY - startY) / steps;
        for (let i = 0; i <= steps; i++) {
            const gx = Math.floor((startX + (dx * i)) / 16);
            const gy = Math.floor((startY + (dy * i)) / 16);
            if (gy >= 0 && gy < 30 && gx >= 0 && gx < 56) isWallGrid[gy][gx] = true;
        }
    }

    // MURS EXTÉRIEURS (communs à toutes les cartes)
    addWallBlock(0, 0, 56, 1);    addWallBlock(0, 29, 56, 1);
    addWallBlock(0, 0, 1, 30);    addWallBlock(55, 0, 1, 30);

    // ==========================================
    // SÉLECTION DE LA CARTE
    // ==========================================
    const mapIndex = (gameSettings && gameSettings.mapIndex) || 0;

    // On prépare les variables de spawn 
    let hunterSpawn = { x: 0, y: 0 };
    let hiderSpawns = [];

    // Maps :
    if (mapIndex === 0) {
        // ----- CARTE 1 : LA MAISON (carte complète) -----

        // PIÈCE GAUCHE
        addWallBlock(1, 4, 15, 1);    addWallBlock(15, 4, 1, 9);
        addWallBlock(1, 4, 1, 5);     addWallBlock(0, 9, 1, 1);
        addWallBlock(1, 9, 1, 12);
        addWallBlock(2, 8, 1, 1);

        // ALCÔVES BAS GAUCHE
        addWallBlock(1, 21, 2, 1);    addWallBlock(3, 21, 1, 8);
        addWallBlock(3, 28, 3, 1);    addWallBlock(5, 21, 1, 8);
        addWallBlock(6, 21, 2, 1);    addWallBlock(7, 21, 1, 8);
        addWallBlock(7, 28, 3, 1);    addWallBlock(10, 21, 1, 8);
        addWallBlock(10, 21, 2, 1);

        // DIAGONALE
        addDiagonalWall("diag_g", 192, 336, 240, 256);
        addWallBlock(16, 16, 1, 1);

        // COULOIR ET PIÈCE CENTRALE
        addWallBlock(16, 12, 8, 1);   addWallBlock(24, 12, 11, 1);
        addWallBlock(38, 12, 8, 1);   addWallBlock(16, 15, 19, 1); addWallBlock(37, 15, 18, 1);
        addWallBlock(34, 16, 1, 5); 
        addWallBlock(37, 16, 1, 6);

        // PIÈCE CENTRALE HAUTE
        addWallBlock(24, 2, 1, 11);   addWallBlock(24, 2, 16, 1);
        addWallBlock(40, 2, 1, 4);    addWallBlock(38, 6, 3, 1);
        addWallBlock(38, 6, 1, 7);

        // PIÈCE DROITE
        addWallBlock(45, 9, 10, 1);   addWallBlock(54, 9, 1, 7);
        addWallBlock(45, 10, 1, 2);

        // MOBILIER
        // Lampe chambre
        furnitures.push({ x: 610, y: 66, width: 24, height: 24, type: TILES.LAMP });
        // Chaise de bureau
        furnitures.push({ x: 435, y: 135, width: 26, height: 26, type: TILES.CHAIR_DESK });
        // Tables de chevet
        furnitures.push({ x: 90, y: 84, width: 24, height: 24, type: TILES.NIGHTSTAND });
        furnitures.push({ x: 181, y: 84, width: 24, height: 24, type: TILES.NIGHTSTAND });
        // Lit double
        furnitures.push({ x: 114, y: 85, width: 64, height: 64, rotation: 0, type: TILES.BED_DOUBLE });
        // Plante chambre
        furnitures.push({ x: 403, y: 104, width: 27, height: 27, type: TILES.PLANT });
        // Bureau chambre
        furnitures.push({ x: 456, y: 165, width: 51, height: 25, rotation: 180, type: TILES.DESK_MAC });
        // Lit horizontal (image native 36x72 pivotée → occupe 72x36)
        furnitures.push({ x: 404, y: 52, width: 72, height: 36, rotation: 270, type: TILES.BED });
        // Étagère verticale (image native 52x26 pivotée → occupe 26x52)
        furnitures.push({ x: 403, y: 131, width: 26, height: 52, rotation: 90, type: TILES.SHELF });
        
        // Spawns map 1
        hunterSpawn = { x: 830, y: 165 };
        hiderSpawns = [{x: 470, y: 135}, {x: 550, y: 210}, {x: 750, y: 210}];

    } else if (mapIndex === 1) {
        // ----- CARTE 2 : L'ENTREPÔT -----
        // mur entre x:20y:244 et x:196y:244
        addWallBlock(1, 15, 12, 1);

        // mur entre : x:192y:22 et x:192y:181 
        addWallBlock(12, 1, 1, 10);
        
        // mur entre : x:192y:302 et x:192y:468 
        addWallBlock(12, 19, 1, 11);
        
        // mur entre : x:615y:353 et x:615y:468
        addWallBlock(38, 22, 1, 8);
        
        // mur entre : x:409y:310 et x:428y:310
        addWallBlock(25, 19, 2, 1);
        
        // mur entre : x:487y:310 et x:617y:310
        addWallBlock(30, 19, 9, 1);
        
        // mur entre : x:409y:310 et x:409y:405
        addWallBlock(25, 19, 1, 7);
        
        // mur entre : x:692y:16 et x:692y:101
        addWallBlock(43, 1, 1, 6);
        
        // mur entre x:414y:403 et x:613y:403
        addWallBlock(26, 25, 13, 1);
        
        // mur entre x:611y:244 et x:883y:244
        addWallBlock(38, 15, 18, 1);
        
        // mur entre x:611y:308 et x:611y:355
        addWallBlock(38, 19, 1, 4);

        // Spawns map 2 (Ajustés pour ne pas apparaître dans les murs)
        hunterSpawn = { x: 50, y: 50 };
        hiderSpawns = [{x: 400, y: 150}, {x: 500, y: 150}, {x: 600, y: 150}];

    } else if (mapIndex === 2) {
        // ----- CARTE 3 : NOUVELLE CARTE SUR MESURE -----
        
        // mur entre x:21y:278 et x:214y:278
        addWallBlock(1, 17, 13, 1);
        
        // mur entre x:422y:278 et x:422y:473
        addWallBlock(26, 17, 1, 13);
        
        // mur entre x:599y:151 et x:599y:473
        addWallBlock(37, 9, 1, 21);
        
        // mur entre x:422y:151 et x:599y:151
        addWallBlock(26, 9, 12, 1);
        
        // mur entre x:422y:230 et x:599y:230
        addWallBlock(26, 14, 12, 1);
        
        // mur entre x:422y:73 et x:599y:73
        addWallBlock(26, 4, 12, 1);
        
        // mur entre x:697y:151 et x:697y:250
        addWallBlock(43, 9, 1, 7);
        
        // mur entre x:697y:373 et x:697y:473
        addWallBlock(43, 23, 1, 7);
        
        // mur entre x:697y:312 et x:890y:312
        addWallBlock(43, 19, 13, 1);
        
        // mur entre x:599y:7 et x:599y:73
        addWallBlock(37, 1, 1, 4);
        
        // mur entre x:697y:73 et x:757y:73
        addWallBlock(43, 4, 5, 1);
        
        // mur entre x:757y:7 et x:757y:88
        addWallBlock(47, 1, 1, 5);

        // mur entre x:314y:7 et x:314y:151
        addWallBlock(20, 1, 1, 9);

        // mur entre x:697y:151 et x:890y:151
        addWallBlock(43, 9, 13, 1);

        // Spawns par défaut (à ajuster au besoin)
        hunterSpawn = { x: 50, y: 50 };
        hiderSpawns = [{x: 200, y: 100}, {x: 750, y: 200}, {x: 800, y: 400}];

    }

    // ==========================================
    // INITIALISATION DES JOUEURS
    // ==========================================
    timeRemaining = gameSettings.roundDuration;
    hunterCountdown = 10000;
    
    let hiderIdx = 0;
    
    for (const id in playersState) {
        let p = playersState[id];
        
        if (p.role === 'HUNTER') {
            p.x = hunterSpawn.x;
            p.y = hunterSpawn.y;
        } else {
            // Sécurité au cas où il manquerait des points de spawn
            const spawn = hiderSpawns[hiderIdx % hiderSpawns.length] || {x: 100, y: 100};
            p.x = spawn.x; 
            p.y = spawn.y;
            hiderIdx++;
        }
        
        p.alive = true; p.hidden = false; p.dir = 'down'; p.moving = false; p.animTimer = 0;
    }
}

let lastTime = 0;

function gameLoop(time) {
    if (!isPlaying) return;
    
    const deltaMs = time - lastTime;
    lastTime = time;

    if (isHost) computeHostPhysics(deltaMs);
    drawGame();
    
    // NOUVEAU : On vérifie qui a gagné à chaque image !
    checkVictory(); 

    if (isPlaying) {
        requestAnimationFrame(gameLoop);
    }
}

function checkVictory() {
    if (!isPlaying || timeRemaining === undefined) return;

    let hasHider = false;
    let hidersAlive = false;

    for (const id in playersState) {
        if (playersState[id].role === 'HIDER') {
            hasHider = true;
            if (playersState[id].alive) hidersAlive = true;
        }
    }

    // 1. Si tous les traqués sont attrapés (et qu'il y en avait au moins un)
    if (hasHider && !hidersAlive) {
        triggerGameOver("VICTOIRE CHASSEUR", "#e63946");
    } 
    // 2. Si le temps est écoulé
    else if (timeRemaining <= 0) {
        if (hidersAlive) {
            triggerGameOver("VICTOIRE TRAQUÉS", "#2196f3");
        } else {
            triggerGameOver("VICTOIRE CHASSEUR", "#e63946");
        }
    }
}

function triggerGameOver(text, color) {
    isPlaying = false; // Gèle l'écran
    
    const msgDiv = document.getElementById('game-message');
    msgDiv.innerText = text;
    msgDiv.style.color = color;
    msgDiv.style.fontSize = '2rem';
    msgDiv.style.position = 'absolute';
    msgDiv.style.top = '50%';
    msgDiv.style.left = '50%';
    msgDiv.style.transform = 'translate(-50%, -50%)';
    msgDiv.style.padding = '30px 50px';
    msgDiv.style.background = 'rgba(0, 0, 0, 0.9)';
    msgDiv.style.border = `6px solid ${color}`;
    msgDiv.style.textShadow = '4px 4px #000';
    msgDiv.style.display = 'block';
    msgDiv.style.zIndex = '100';
    msgDiv.style.textAlign = 'center';
}

// --- LE CERVEAU DU JEU (Exécuté uniquement par l'Hôte) ---
function computeHostPhysics(deltaMs) {
    if (deltaMs > 100) deltaMs = 100;

    // 1. Décompte initial (le Chasseur attend)
    hunterCountdown = Math.max(0, hunterCountdown - deltaMs);

    // 2. Récupération des touches de l'Hôte
    clientsInputs[socket.id] = { ...keys };

    // 3. Boucle sur tous les joueurs
    for (const clientId in playersState) {
        const p = playersState[clientId];
        const input = clientsInputs[clientId] || { up: false, down: false, left: false, right: false, action1: false, action2: false };

        if (!p.alive || p.role === 'SPECTATOR') continue;

        // Le Chasseur est bloqué pendant les 10 premières secondes
        if (p.role === 'HUNTER' && hunterCountdown > 0) {
            p.moving = false;
            continue;
        }

        // --- GESTION DES ACTIONS (E / F) ---
        const justPressedAction1 = input.action1 && !p.lastAction1;
        p.lastAction1 = input.action1;
        const justPressedAction2 = input.action2 && !p.lastAction2;
        p.lastAction2 = input.action2;

        if (p.role === 'HIDER') {
            if (justPressedAction1) handleHiderAction(p);
            if (p.hidden) continue; 
        } else if (p.role === 'HUNTER') {
            if (justPressedAction1 || justPressedAction2) handleHunterSearch(p);
            
            // Kill au contact
            for (const targetId in playersState) {
                const target = playersState[targetId];
                if (target.role === 'HIDER' && target.alive && !target.hidden) {
                    const dx = (target.x + target.size/2) - (p.x + p.size/2);
                    const dy = (target.y + target.size/2) - (p.y + p.size/2);
                    if (Math.hypot(dx, dy) < p.size) {
                        target.alive = false;
                    }
                }
            }
        }

        // --- GESTION DU DÉPLACEMENT ET ANIMATION ---
        let vx = 0, vy = 0;
        if (input.up) vy -= 1;
        if (input.down) vy += 1;
        if (input.left) vx -= 1;
        if (input.right) vx += 1;

        if (vx !== 0 || vy !== 0) {
            p.moving = true;
            p.animTimer += deltaMs;
            
            // Déterminer la direction (priorité X puis Y)
            if (Math.abs(vx) > Math.abs(vy)) {
                p.dir = vx > 0 ? 'right' : 'left';
            } else {
                p.dir = vy > 0 ? 'down' : 'up';
            }
        } else {
            p.moving = false;
            p.animTimer = 0;
        }

        const len = Math.hypot(vx, vy);
        if (len > 0) { vx /= len; vy /= len; }
        
        const dist = p.speed * (deltaMs / 1000.0);
        let newX = p.x + vx * dist;
        let newY = p.y + vy * dist;
        
        if (!collides(newX, p.y, p.size)) p.x = newX;
        if (!collides(p.x, newY, p.size)) p.y = newY;
    }

    // 4. Envoi de l'état aux invités
    socket.emit('stateSnapshot', {
        room: currentRoom,
        state: {
            players: playersState,
            currentMapTiles: mapTiles,
            furnitures: furnitures, // <-- NOUVEAU !
            timeRemaining: timeRemaining,
            hunterCountdown: hunterCountdown
        }
    });

    updateHUD();
}

// ==========================================
// 5. MOTEUR GRAPHIQUE (CANVAS)
// ==========================================

const ZOOM_FACTOR = 3; // On multiplie la taille par 3 pour l'effet Pixel Art

// ==========================================
// MINIMAP
// ==========================================

// Renvoie la couleur d'une tuile pour la minimap.
// La furniture est toujours montrée fermée (pas de changement d'état visible).
function getMinimapColor(id) {
    if (id === TILES.FLOOR) return '#7e7e7e'; // Sol gris moyen
    if (id === TILES.WALL) return '#1a1a1a';  // Murs gris très foncé
    if (id >= 20 && id <= 26) return '#ec545b'; // Rouge (Meubles)
    if (id === TILES.DESK) return '#3d4b96'; // Bleu (Bureau)
    if (id === TILES.BATHTUB) return '#e1cc55'; // Jaune (Bain)
    if (id === TILES.TOILET) return '#533215'; // Marron (WC)
    if (id === TILES.STAIRS_UP || id === TILES.STAIRS_DOWN) return '#b9d9f5'; // Bleu clair (Escaliers)
    return '#000';
}

const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');



// Couleurs de secours par type de tuile (Pixel Art fallback)
function getTileFallbackColor(tileId) {
    if (tileId === TILES.FLOOR)      return '#4a4a3a';
    if (tileId === TILES.WALL)       return '#888888';
    if (tileId === TILES.ENTRY_DOOR) return '#c8a000';
    if (tileId === TILES.STAIRS_UP || tileId === TILES.STAIRS_DOWN) return '#aaaaaa';
    if (tileId >= TILES.BED_TOP && tileId <= TILES.BED_OPEN_BOTTOM) return '#8B4513';
    return '#5c3317'; // Armoires
}

function drawTile(tileId, worldX, worldY) {
    if (images[tileId] && images[tileId].complete && images[tileId].naturalWidth > 0) {
        ctx.drawImage(images[tileId], worldX, worldY, TILE_SIZE, TILE_SIZE);
    } else {
        ctx.fillStyle = getTileFallbackColor(tileId);
        ctx.fillRect(worldX, worldY, TILE_SIZE, TILE_SIZE);
    }
}

// ==========================================
// OUTIL DE LIGNE DE VUE (INSPIRÉ DU JAVA)
// ==========================================
function hasLineOfSight(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, distance / 8); 
    
    for (let i = 0; i <= steps; i++) {
        const checkX = x0 + (dx * (i / steps));
        const checkY = y0 + (dy * (i / steps));
        
        // On calcule la position dans la grille de 16px
        const gx = Math.floor(checkX / 16);
        const gy = Math.floor(checkY / 16);

        // Vérification de collision sur la grille
        if (gy >= 0 && gy < 30 && gx >= 0 && gx < 56) {
            if (isWallGrid[gy][gx]) {
                return false; // Ligne bloquée par la grille
            }
        }
    }
    return true; 
}

function drawGame() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    if (!isWallGrid || isWallGrid.length === 0) return;

    const me = playersState[socket.id];
    let camX = 0, camY = 0;
    if (me) {
        camX = (me.x + me.size / 2) * ZOOM_FACTOR - (canvas.width / 2);
        camY = (me.y + me.size / 2) * ZOOM_FACTOR - (canvas.height / 2);
    }

    ctx.save();
    ctx.translate(-camX, -camY);
    ctx.scale(ZOOM_FACTOR, ZOOM_FACTOR);

    // 1. DESSIN DU SOL (beige clair uniforme)
    ctx.fillStyle = 'hsl(28, 38%, 58%)';
    ctx.fillRect(0, 0, 896, 480);

    // 1bis. DESSIN DE L'ESCALIER (purement visuel)
    if (gameSettings && gameSettings.mapIndex === 0) {
        const sx1 = 35, sx2 = 36;       // colonnes (inclus)
        const sy1 = 15, sy2 = 21;       // lignes (inclus)
        const stepCount = sy2 - sy1 + 1;

        for (let gy = sy1; gy <= sy2; gy++) {
            // 0 en haut → 1 en bas : la marche s'assombrit à mesure qu'on descend
            const t = (gy - sy1) / (stepCount - 1);
            ctx.fillStyle = `hsl(28, 38%, ${58 - t * 28}%)`;  // marron clair → foncé
            for (let gx = sx1; gx <= sx2; gx++) {
                ctx.fillRect(gx * 16, gy * 16, 16, 16);
            }
            // Liseré sombre en bas de chaque marche pour souligner le bord
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(sx1 * 16, gy * 16 + 14, (sx2 - sx1 + 1) * 16, 2);
        }
    }

    // 2. DESSIN DES MURS (Sur la grille 16x16)
    ctx.fillStyle = '#1a1a1a'; // Couleur des murs
    for (let gy = 0; gy < 30; gy++) {
        for (let gx = 0; gx < 56; gx++) {
            if (isWallGrid[gy][gx]) {
                // Astuce anti-grille : on dessine 17x17 au lieu de 16x16 pour masquer les fissures !
                ctx.fillRect(gx * 16, gy * 16, 17, 17);
            }
        }
    }
    
    // 2bis. DESSIN DES MEUBLES (rotation gérée proprement pour 0/90/180/270°)
    for (const f of furnitures) {
        const img = images[f.type];
        if (img && img.complete && img.naturalWidth > 0) {
            if (f.rotation) {
                const cx = f.x + f.width / 2;
                const cy = f.y + f.height / 2;
                const nw = img.naturalWidth;   // taille NATIVE de l'image
                const nh = img.naturalHeight;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(f.rotation * Math.PI / 180);
                ctx.drawImage(img, -nw / 2, -nh / 2, nw, nh);
                ctx.restore();
            } else {
                ctx.drawImage(img, f.x, f.y, f.width, f.height);
            }
        } else {
            ctx.fillStyle = getTileFallbackColor(f.type);
            ctx.fillRect(f.x, f.y, f.width, f.height);
        }
    }

    // 3. JOUEURS
    for (const id in playersState) {
        const p = playersState[id];
        if (!p.alive || (p.role === 'HIDER' && p.hidden && id !== socket.id)) continue;

        const spriteSize = 32;
        const drawX = p.x - (spriteSize - p.size) / 2;
        const drawY = p.y - (spriteSize - p.size) / 2;
        const imgKey = p.role === 'HUNTER' ? (p.moving ? `hunter_walk${(Math.floor(p.animTimer / 200) % 2)+1}_${p.dir}` : `hunter_idle_${p.dir}`) : `hider_${p.dir}`;
        const img = images[imgKey] || images.hider_down;

        if (img && img.complete) ctx.drawImage(img, drawX, drawY, spriteSize, spriteSize);
        else { ctx.fillStyle = (p.role === 'HUNTER') ? '#e63946' : '#2196f3'; ctx.fillRect(p.x, p.y, p.size, p.size); }
    }

    // 4. BROUILLARD
    if (me && me.alive && me.role !== 'SPECTATOR') {
        const px = me.x + me.size / 2;
        const py = me.y + me.size / 2;
        const farRadius = (me.role === 'HUNTER') ? 250 : 150;
        const nearRadius = farRadius * 0.5; 
        
        for (let y = 0; y < 480; y += 16) {
            for (let x = 0; x < 896; x += 16) {
                const cx = x + 8;
                const cy = y + 8;
                const dist = Math.hypot(cx - px, cy - py);
                let alpha = 1.0; 
                
                if (dist < farRadius && hasLineOfSight(px, py, cx, cy)) {
                    alpha = (dist <= nearRadius) ? 0.0 : (dist - nearRadius) / (farRadius - nearRadius);
                }
                
                if (alpha > 0) {
                    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(alpha, 0.98)})`;
                    ctx.fillRect(x, y, 16, 16);
                }
            }
        }
    }
    ctx.restore(); 
    drawMinimap();

    if (myRole === 'HUNTER' && hunterCountdown > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = '60px "Press Start 2P"';
        ctx.fillText(Math.ceil(hunterCountdown / 1000), canvas.width/2, canvas.height/2 + 20);
        ctx.textAlign = 'left';
    }
}

function drawMinimap() {
    if (!isWallGrid || isWallGrid.length === 0) return;

    const rows = 30;
    const cols = 56;
    const miniTileSize = 4; // 4px par bloc pour que ça rentre bien
    const scale = miniTileSize / 16;

    if (minimapCanvas.width !== cols * miniTileSize || minimapCanvas.height !== rows * miniTileSize) {
        minimapCanvas.width  = cols * miniTileSize;
        minimapCanvas.height = rows * miniTileSize;
    }

    minimapCtx.imageSmoothingEnabled = false;

    // 1. SOL ET MURS
    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
            if (isWallGrid[gy][gx]) {
                minimapCtx.fillStyle = '#1a1a1a'; // Mur
            } else {
                minimapCtx.fillStyle = '#7e7e7e'; // Sol
            }
            minimapCtx.fillRect(gx * miniTileSize, gy * miniTileSize, miniTileSize, miniTileSize);
        }
    }

    // 2. MEUBLES (S'il y en a)
    if (typeof furnitures !== 'undefined') {
        for (const f of furnitures) {
            minimapCtx.fillStyle = getMinimapColor(f.type);
            minimapCtx.fillRect(f.x * scale, f.y * scale, f.width * scale, f.height * scale);
        }
    }

    // 3. JOUEURS
    for (const id in playersState) {
        const p = playersState[id];
        if (!p.alive || p.role === 'SPECTATOR') continue;
        if (p.role === 'HIDER' && p.hidden && id !== socket.id) continue;

        minimapCtx.fillStyle = (p.role === 'HUNTER') ? '#e63946' : '#2196f3';
        const miniCx = (p.x + p.size / 2) * scale;
        const miniCy = (p.y + p.size / 2) * scale;
        
        minimapCtx.beginPath();
        minimapCtx.arc(miniCx, miniCy, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }
}

// ==========================================
// 6. GESTION DES COLLISIONS (SYSTÈME AABB)
// ==========================================

function collides(x, y, size) {
    if (x < 0 || x + size > 896 || y < 0 || y + size > 480) return true;
    
    const points = [[x, y], [x + size, y], [x, y + size], [x + size, y + size]];
    for (const p of points) {
        const gx = Math.floor(p[0] / 16);
        const gy = Math.floor(p[1] / 16);
        if (gy >= 0 && gy < 30 && gx >= 0 && gx < 56) {
            if (isWallGrid[gy][gx]) return true;
        }
    }
    
    // On garde la vérification pour les futurs meubles
    for (const f of furnitures) {
        if (f.type === TILES.ENTRY_DOOR) continue;
        
        // On laisse passer le joueur à travers les cachettes si elles sont OUVERTES
        const openHideouts = [
            TILES.WARDROBE_OPEN, 
            TILES.BED_OPEN, 
            TILES.BED_DOUBLE_OPEN, 
            TILES.SHOWER_OPEN, 
            TILES.KANGOO_OPEN,
            TILES.RUG_OPEN, 
            TILES.RUG,
            TILES.BATHTUB_OPEN
        ];
        if (openHideouts.includes(f.type)) continue;

        // Collision basique
        if (x + size > f.x && x < f.x + f.width && y + size > f.y && y < f.y + f.height) {
            return true;
        }
    }
    return false;
}

// ==========================================
// 7. MÉCANIQUES DE CACHETTE (ENTITÉS)
// ==========================================

function isHidingSpot(type) {
    return [
        TILES.BED, TILES.BED_OPEN, TILES.BED_DOUBLE, TILES.BED_DOUBLE_OPEN,
        TILES.WARDROBE, TILES.WARDROBE_OPEN,
        TILES.SHOWER, TILES.SHOWER_OPEN,
        TILES.KANGOO, TILES.KANGOO_OPEN,
        TILES.RUG, TILES.RUG_OPEN,
        TILES.BATHTUB, TILES.BATHTUB_OPEN
    ].includes(type);
}

// Cherche le meuble interactif le plus proche du joueur (Rayon de 40px max)
function findInteractiveFurniture(cx, cy) {
    let closest = null;
    let minDist = 40; 

    for (const f of furnitures) {
        if (!isHidingSpot(f.type)) continue;

        // On calcule le centre du meuble
        let fCx = f.x + f.width / 2;
        let fCy = f.y + f.height / 2;
        let dist = Math.hypot(cx - fCx, cy - fCy);

        if (dist < minDist) {
            minDist = dist;
            closest = f;
        }
    }
    return closest;
}

function toggleFurniture(f, isHunter) {
    if (isHunter) {
        // Le chasseur OUVRE
        if (f.type === TILES.WARDROBE)           { f.type = TILES.WARDROBE_OPEN;    return true; }
        if (f.type === TILES.BED)                { f.type = TILES.BED_OPEN;         return true; }
        if (f.type === TILES.BED_DOUBLE)         { f.type = TILES.BED_DOUBLE_OPEN;  return true; }
        if (f.type === TILES.SHOWER)             { f.type = TILES.SHOWER_OPEN;      return true; } 
        if (f.type === TILES.KANGOO)             { f.type = TILES.KANGOO_OPEN;      return true; } 
        if (f.type === TILES.RUG)                { f.type = TILES.RUG_OPEN;         return true; }
        if (f.type === TILES.BATHTUB)            { f.type = TILES.BATHTUB_OPEN;     return true; }
    } else {
        // Le traqué FERME derrière lui
        if (f.type === TILES.WARDROBE_OPEN)      { f.type = TILES.WARDROBE;    return true; }
        if (f.type === TILES.BED_OPEN)           { f.type = TILES.BED;         return true; }
        if (f.type === TILES.BED_DOUBLE_OPEN)    { f.type = TILES.BED_DOUBLE;  return true; }
        if (f.type === TILES.SHOWER_OPEN)        { f.type = TILES.SHOWER;      return true; } 
        if (f.type === TILES.KANGOO_OPEN)        { f.type = TILES.KANGOO;      return true; } 
        if (f.type === TILES.RUG_OPEN)           { f.type = TILES.RUG;         return true; }
        if (f.type === TILES.BATHTUB_OPEN)       { f.type = TILES.BATHTUB;     return true; }
    }
    return false;
}

function handleHiderAction(p) {
    if (p.hidden) {
        p.hidden = false;
        p.x = p.entryX; 
        p.y = p.entryY;
    } else {
        const cx = p.x + p.size / 2;
        const cy = p.y + p.size / 2;
        const target = findInteractiveFurniture(cx, cy);

        if (target) {
            p.entryX = p.x;
            p.entryY = p.y;
            toggleFurniture(target, false);
            p.hidden = true;
            
            // On le téléporte pile au centre du meuble
            p.x = target.x + (target.width / 2) - (p.size / 2);
            p.y = target.y + (target.height / 2) - (p.size / 2);
        }
    }
}

function handleHunterSearch(p) {
    const cx = p.x + p.size / 2;
    const cy = p.y + p.size / 2;
    const target = findInteractiveFurniture(cx, cy);

    if (target) {
        const opened = toggleFurniture(target, true);
        if (opened) {
            for (const id in playersState) {
                const targetPlayer = playersState[id];
                if (targetPlayer.role === 'HIDER' && targetPlayer.alive && targetPlayer.hidden) {
                    const tCx = targetPlayer.x + targetPlayer.size / 2;
                    const tCy = targetPlayer.y + targetPlayer.size / 2;
                    const fCx = target.x + target.width / 2;
                    const fCy = target.y + target.height / 2;
                    
                    // Si le traqué est au centre de ce meuble précis
                    if (Math.hypot(tCx - fCx, tCy - fCy) < 10) {
                        targetPlayer.alive = false;
                        targetPlayer.hidden = false;
                        console.log(targetPlayer.pseudo + " a été attrapé dans sa cachette !");
                    }
                }
            }
        }
    }
}

socket.on('timerUpdate', (timeLeft) => {
    timeRemaining = timeLeft;
    document.getElementById('time-left').innerText = "Temps : " + Math.floor(timeRemaining / 1000);
});

// OUTIL DE DÉBUG : Affiche la position de la souris pour aider à placer les meubles
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    // On calcule la position en tenant compte du ZOOM et de la CAMÉRA
    const me = playersState[socket.id];
    let camX = me ? (me.x + me.size / 2) * ZOOM_FACTOR - (canvas.width / 2) : 0;
    let camY = me ? (me.y + me.size / 2) * ZOOM_FACTOR - (canvas.height / 2) : 0;

    const mouseX = Math.round((e.clientX - rect.left + camX) / ZOOM_FACTOR);
    const mouseY = Math.round((e.clientY - rect.top + camY) / ZOOM_FACTOR);

    // On affiche l'info dans le titre de la page ou dans la console
    document.title = `X: ${mouseX} | Y: ${mouseY}`;
});