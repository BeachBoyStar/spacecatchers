"use strict";

class StellarHarmonyGame {
    constructor() {
        console.log('StellarHarmonyGame constructor called');
        
        // Initialize game state
        this.initializeGameState();
        
        // Start the game initialization
        this.init().catch(error => {
            console.error('Failed to initialize game:', error);
        });
    }

    initializeGameState() {
        console.log('Initializing game state...');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.gameContainer = document.getElementById('gameContainer');
        
        // Game state
        this.gameState = 'menu'; // menu, playing, instructions, gameOver, settings
        this.score = 0;
        this.health = 100;
        this.level = 1;
        this.gameSpeed = 2;
        
        // Settings
        this.settings = {
            theme: 'cosmic',
            particleDensity: 50,
            musicVolume: 70,
            difficulty: 'normal',
            effects: {
                trails: true,
                glow: true,
                shake: true
            }
        };
        
        // Power-ups
        this.powerUps = {
            shield: { active: false, duration: 0 },
            speed: { active: false, duration: 0 },
            multiplier: { active: false, duration: 0, value: 2 }
        };
        
        // Player
        this.player = {
            x: 0,
            y: 0,
            size: 20,
            speed: 5,
            color: '#64ffda',
            trail: []
        };
        
        // Game objects
        this.notes = [];
        this.obstacles = [];
        this.particles = [];
        this.stars = [];
        
        // Input handling
        this.keys = {};
        this.mousePos = { x: 0, y: 0 };
        
        // Audio context for procedural music
        this.audioContext = null;
        this.musicNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
        this.currentMelody = [];
        
        // Timing
        this.lastTime = 0;
        this.noteSpawnTimer = 0;
        this.obstacleSpawnTimer = 0;
        this.particleTimer = 0;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('Starting async initialization...');
            
            // Wait for DOM to be fully loaded
            if (document.readyState !== 'complete') {
                console.log('Waiting for DOM to load...');
                await new Promise(resolve => {
                    window.addEventListener('load', resolve);
                });
            }

            console.log('DOM loaded, initializing game components...');
            
            // Validate essential elements exist
            if (!this.canvas) {
                throw new Error('Game canvas not found!');
            }
            
            if (!this.ctx) {
                throw new Error('Canvas context not available!');
            }
            
            // Initialize game components
            this.resizeCanvas();
            await this.initUI();
            this.setupEventListeners();
            this.createStarField();
            this.initAudio();
            
            // Show menu screen initially
            this.showMenu();
            
            // Start game loop
            console.log('Starting game loop...');
            this.gameLoop();
            
            console.log('Game initialized successfully');
        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }
    
    async initUI() {
        // Initialize all UI elements with validation
        const requiredElements = {
            // Buttons
            startBtn: 'Start button',
            instructionsBtn: 'Instructions button',
            settingsBtn: 'Settings button',
            backBtn: 'Back button',
            settingsBackBtn: 'Settings back button',
            restartBtn: 'Restart button',
            menuBtn: 'Menu button',
            
            // Screens
            menuScreen: 'Menu screen',
            instructionsScreen: 'Instructions screen',
            settingsScreen: 'Settings screen',
            gameOverScreen: 'Game over screen',
            
            // Game UI
            score: 'Score display',
            healthFill: 'Health bar',
            gameCanvas: 'Game canvas',
            
            // Settings controls
            themeSelect: 'Theme selector',
            particleDensity: 'Particle density slider',
            musicVolume: 'Music volume slider',
            difficultySelect: 'Difficulty selector',
            trailsToggle: 'Trails toggle',
            glowToggle: 'Glow effects toggle',
            shakeToggle: 'Screen shake toggle'
        };

        const missingElements = [];
        
        // Check for all required elements
        Object.entries(requiredElements).forEach(([id, description]) => {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`Missing UI element: ${description} (${id})`);
                missingElements.push(description);
            }
        });

        // If any required elements are missing, throw an error
        if (missingElements.length > 0) {
            throw new Error(`Missing required UI elements: ${missingElements.join(', ')}`);
        }

        console.log('All UI elements initialized successfully');
        
        // Initialize settings values
        this.applyCurrentSettings();
    }
    
    applyCurrentSettings() {
        const elements = {
            themeSelect: document.getElementById('themeSelect'),
            particleDensity: document.getElementById('particleDensity'),
            musicVolume: document.getElementById('musicVolume'),
            difficultySelect: document.getElementById('difficultySelect'),
            trailsToggle: document.getElementById('trailsToggle'),
            glowToggle: document.getElementById('glowToggle'),
            shakeToggle: document.getElementById('shakeToggle')
        };

        // Apply settings to UI elements
        if (elements.themeSelect) elements.themeSelect.value = this.settings.theme;
        if (elements.particleDensity) elements.particleDensity.value = this.settings.particleDensity;
        if (elements.musicVolume) elements.musicVolume.value = this.settings.musicVolume;
        if (elements.difficultySelect) elements.difficultySelect.value = this.settings.difficulty;
        if (elements.trailsToggle) elements.trailsToggle.checked = this.settings.effects.trails;
        if (elements.glowToggle) elements.glowToggle.checked = this.settings.effects.glow;
        if (elements.shakeToggle) elements.shakeToggle.checked = this.settings.effects.shake;

        // Apply theme
        document.body.className = `theme-${this.settings.theme}`;
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.player.x = this.canvas.width * 0.1;
        this.player.y = this.canvas.height / 2;
    }
    
    setupEventListeners() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Pause game with Escape key
            if (e.key === 'Escape' && this.gameState === 'playing') {
                this.showSettings();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse controls
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });
        
        // UI controls - Add error handling and logging
        const addSafeEventListener = (elementId, event, handler) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.error(`Element not found: ${elementId}`);
            }
        };

        // Menu buttons
        addSafeEventListener('startBtn', 'click', () => {
            console.log('Start button clicked');
            try {
                this.startGame();
            } catch (error) {
                console.error('Error starting game:', error);
            }
        });

        addSafeEventListener('instructionsBtn', 'click', () => {
            console.log('Instructions button clicked');
            try {
                this.showInstructions();
            } catch (error) {
                console.error('Error showing instructions:', error);
            }
        });

        addSafeEventListener('settingsBtn', 'click', () => {
            console.log('Settings button clicked');
            try {
                this.showSettings();
            } catch (error) {
                console.error('Error showing settings:', error);
            }
        });

        addSafeEventListener('backBtn', 'click', () => {
            console.log('Back button clicked');
            try {
                this.showMenu();
            } catch (error) {
                console.error('Error showing menu:', error);
            }
        });

        addSafeEventListener('settingsBackBtn', 'click', () => {
            console.log('Settings back button clicked');
            try {
                this.showMenu();
            } catch (error) {
                console.error('Error showing menu:', error);
            }
        });

        addSafeEventListener('restartBtn', 'click', () => {
            console.log('Restart button clicked');
            try {
                this.startGame();
            } catch (error) {
                console.error('Error restarting game:', error);
            }
        });

        addSafeEventListener('menuBtn', 'click', () => {
            console.log('Menu button clicked');
            try {
                this.showMenu();
            } catch (error) {
                console.error('Error showing menu:', error);
            }
        });
        
        // Settings controls
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            document.body.className = `theme-${e.target.value}`;
        });
        
        document.getElementById('particleDensity').addEventListener('input', (e) => {
            this.settings.particleDensity = parseInt(e.target.value);
        });
        
        document.getElementById('musicVolume').addEventListener('input', (e) => {
            this.settings.musicVolume = parseInt(e.target.value);
            if (this.audioContext) {
                this.audioContext.gain.value = this.settings.musicVolume / 100;
            }
        });
        
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            this.settings.difficulty = e.target.value;
            this.updateDifficultySettings();
        });
        
        document.getElementById('trailsToggle').addEventListener('change', (e) => {
            this.settings.effects.trails = e.target.checked;
        });
        
        document.getElementById('glowToggle').addEventListener('change', (e) => {
            this.settings.effects.glow = e.target.checked;
        });
        
        document.getElementById('shakeToggle').addEventListener('change', (e) => {
            this.settings.effects.shake = e.target.checked;
        });
        
        // Resize handling
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    playNote(frequency, duration = 0.2) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    createStarField() {
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2,
                speed: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.8 + 0.2
            });
        }
    }
    
    startGame() {
        console.log('Starting new game...');
        this.gameState = 'playing';
        this.score = 0;
        this.health = 100;
        this.level = 1;
        this.gameSpeed = 2;
        
        // Reset game objects
        this.notes = [];
        this.obstacles = [];
        this.particles = [];
        this.currentMelody = [];
        
        // Reset power-ups
        Object.keys(this.powerUps).forEach(type => {
            this.powerUps[type].active = false;
            this.powerUps[type].duration = 0;
            this.powerUps[type].object = null;
        });
        
        // Reset player position
        this.player.x = this.canvas.width * 0.1;
        this.player.y = this.canvas.height / 2;
        this.player.trail = [];
        
        // Apply difficulty settings
        this.updateDifficultySettings();
        
        // Update UI and hide screens
        this.updateUI();
        this.hideAllScreens();
        
        console.log('Game started successfully');
    }
    
    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
    }
    
    showScreen(screenId) {
        this.hideAllScreens();
        const screen = document.getElementById(screenId);
        if (screen) {
            screen.classList.add('active');
        } else {
            console.error(`Screen not found: ${screenId}`);
        }
    }
    
    showMenu() {
        console.log('Showing menu screen');
        this.gameState = 'menu';
        this.showScreen('menuScreen');
    }
    
    showInstructions() {
        console.log('Showing instructions screen');
        this.gameState = 'instructions';
        this.showScreen('instructionsScreen');
    }
    
    showSettings() {
        console.log('Showing settings screen');
        this.gameState = 'settings';
        this.showScreen('settingsScreen');
        
        // Initialize settings values
        const themeSelect = document.getElementById('themeSelect');
        const particleDensity = document.getElementById('particleDensity');
        const musicVolume = document.getElementById('musicVolume');
        const difficultySelect = document.getElementById('difficultySelect');
        const trailsToggle = document.getElementById('trailsToggle');
        const glowToggle = document.getElementById('glowToggle');
        const shakeToggle = document.getElementById('shakeToggle');
        
        if (themeSelect) themeSelect.value = this.settings.theme;
        if (particleDensity) particleDensity.value = this.settings.particleDensity;
        if (musicVolume) musicVolume.value = this.settings.musicVolume;
        if (difficultySelect) difficultySelect.value = this.settings.difficulty;
        if (trailsToggle) trailsToggle.checked = this.settings.effects.trails;
        if (glowToggle) glowToggle.checked = this.settings.effects.glow;
        if (shakeToggle) shakeToggle.checked = this.settings.effects.shake;
    }
    
    showGameOver() {
        console.log('Showing game over screen');
        this.gameState = 'gameOver';
        const finalScoreValue = document.getElementById('finalScoreValue');
        if (finalScoreValue) {
            finalScoreValue.textContent = this.score;
        }
        this.generateAchievements();
        this.showScreen('gameOverScreen');
    }
    
    generateAchievements() {
        const achievementsDiv = document.getElementById('achievements');
        if (!achievementsDiv) {
            console.error('Achievements div not found');
            return;
        }
        
        achievementsDiv.innerHTML = '';
        
        const achievements = [];
        if (this.score > 1000) achievements.push('Harmony Master - Score over 1000!');
        if (this.currentMelody.length > 10) achievements.push('Melodic Genius - Created a 10+ note melody!');
        if (this.level > 3) achievements.push('Cosmic Explorer - Reached level ' + this.level + '!');
        
        achievements.forEach(achievement => {
            const achievementEl = document.createElement('div');
            achievementEl.className = 'achievement';
            achievementEl.textContent = achievement;
            achievementsDiv.appendChild(achievementEl);
        });
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        const healthFill = document.getElementById('healthFill');
        healthFill.style.width = this.health + '%';
        
        if (this.health < 30) {
            healthFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ff8a95 100%)';
        } else if (this.health < 60) {
            healthFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ffd93d 100%)';
        } else {
            healthFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ffd93d 50%, #6bcf7f 100%)';
        }
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.updatePlayer();
        this.updateStars();
        this.spawnObjects(deltaTime);
        this.updateNotes();
        this.updateObstacles();
        this.updateParticles();
        this.updatePowerUps(deltaTime);
        this.checkCollisions();
        this.updateDifficulty();
        this.updateUI();
        
        if (this.health <= 0) {
            this.showGameOver();
        }
    }
    
    updatePlayer() {
        // Keyboard movement
        if (this.keys['w'] || this.keys['arrowup']) {
            this.player.y -= this.player.speed;
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            this.player.y += this.player.speed;
        }
        if (this.keys['a'] || this.keys['arrowleft']) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            this.player.x += this.player.speed;
        }
        
        // Boundary checking
        this.player.x = Math.max(this.player.size, Math.min(this.canvas.width - this.player.size, this.player.x));
        this.player.y = Math.max(this.player.size, Math.min(this.canvas.height - this.player.size, this.player.y));
        
        // Add trail effect
        this.player.trail.push({ x: this.player.x, y: this.player.y, life: 1 });
        if (this.player.trail.length > 20) {
            this.player.trail.shift();
        }
        
        this.player.trail.forEach(point => {
            point.life -= 0.05;
        });
        this.player.trail = this.player.trail.filter(point => point.life > 0);
    }
    
    updateStars() {
        this.stars.forEach(star => {
            star.x -= star.speed * this.gameSpeed;
            if (star.x < 0) {
                star.x = this.canvas.width;
                star.y = Math.random() * this.canvas.height;
            }
        });
    }
    
    spawnObjects(deltaTime) {
        this.noteSpawnTimer += deltaTime;
        this.obstacleSpawnTimer += deltaTime;
        this.particleTimer += deltaTime;
        
        // Spawn musical notes
        if (this.noteSpawnTimer > 1000 / this.gameSpeed) {
            this.spawnNote();
            this.noteSpawnTimer = 0;
        }
        
        // Spawn obstacles
        if (this.obstacleSpawnTimer > 2000 / this.gameSpeed) {
            this.spawnObstacle();
            this.obstacleSpawnTimer = 0;
        }
        
        // Spawn power-ups
        if (Math.random() < 0.001) { // 0.1% chance each frame
            this.spawnPowerUp();
        }
        
        // Spawn background particles
        if (this.particleTimer > 100) {
            this.spawnParticle();
            this.particleTimer = 0;
        }
    }
    
    spawnNote() {
        const note = {
            x: this.canvas.width,
            y: Math.random() * (this.canvas.height - 100) + 50,
            size: 15,
            color: this.getRandomNoteColor(),
            frequency: this.getRandomFrequency(),
            collected: false,
            pulse: 0
        };
        this.notes.push(note);
    }
    
    spawnObstacle() {
        const obstacle = {
            x: this.canvas.width,
            y: Math.random() * (this.canvas.height - 60) + 30,
            width: 30,
            height: 60,
            speed: this.gameSpeed + Math.random() * 2,
            color: '#ff6b6b',
            rotation: 0
        };
        this.obstacles.push(obstacle);
    }
    
    spawnParticle() {
        const particle = {
            x: this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * 3 + 1,
            speed: Math.random() * 3 + 1,
            color: this.getRandomColor(),
            life: 1,
            opacity: Math.random() * 0.5 + 0.2
        };
        this.particles.push(particle);
    }
    
    updateNotes() {
        this.notes.forEach((note, index) => {
            note.x -= this.gameSpeed * 2;
            note.pulse += 0.1;
            
            if (note.x < -note.size) {
                this.notes.splice(index, 1);
            }
        });
    }
    
    updateObstacles() {
        this.obstacles.forEach((obstacle, index) => {
            obstacle.x -= obstacle.speed;
            obstacle.rotation += 0.05;
            
            if (obstacle.x < -obstacle.width) {
                this.obstacles.splice(index, 1);
            }
        });
    }
    
    updateParticles() {
        this.particles.forEach((particle, index) => {
            particle.x -= particle.speed;
            particle.life -= 0.01;
            
            if (particle.x < 0 || particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
    }
    
    checkCollisions() {
        // Note collections
        this.notes.forEach((note, index) => {
            const dist = Math.hypot(this.player.x - note.x, this.player.y - note.y);
            if (dist < this.player.size + note.size && !note.collected) {
                this.collectNote(note, index);
            }
        });
        
        // Obstacle collisions
        this.obstacles.forEach(obstacle => {
            if (this.player.x + this.player.size > obstacle.x &&
                this.player.x - this.player.size < obstacle.x + obstacle.width &&
                this.player.y + this.player.size > obstacle.y &&
                this.player.y - this.player.size < obstacle.y + obstacle.height) {
                this.hitObstacle();
            }
        });
    }
    
    collectNote(note, index) {
        note.collected = true;
        this.score += 100;
        this.health = Math.min(100, this.health + 5);
        this.currentMelody.push(note.frequency);
        
        // Play the note
        this.playNote(note.frequency);
        
        // Create collection effect
        this.createCollectionEffect(note.x, note.y);
        
        // Remove note
        this.notes.splice(index, 1);
        
        // Chain bonus
        if (this.currentMelody.length > 5) {
            this.score += this.currentMelody.length * 10;
        }
    }
    
    hitObstacle() {
        this.health -= 20;
        this.currentMelody = []; // Reset melody
        this.createDamageEffect();
        
        // Screen shake effect
        this.gameContainer.classList.add('shake');
        setTimeout(() => {
            this.gameContainer.classList.remove('shake');
        }, 500);
    }
    
    createCollectionEffect(x, y) {
        for (let i = 0; i < 10; i++) {
            const effect = {
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                size: Math.random() * 5 + 2,
                color: '#64ffda',
                life: 1
            };
            this.particles.push(effect);
        }
    }
    
    createDamageEffect() {
        for (let i = 0; i < 15; i++) {
            const effect = {
                x: this.player.x,
                y: this.player.y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                size: Math.random() * 3 + 1,
                color: '#ff6b6b',
                life: 1
            };
            this.particles.push(effect);
        }
    }
    
    updateDifficulty() {
        const newLevel = Math.floor(this.score / 1000) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.gameSpeed += 0.5;
        }
    }
    
    updateDifficultySettings() {
        switch (this.settings.difficulty) {
            case 'easy':
                this.gameSpeed = 1.5;
                this.player.speed = 6;
                break;
            case 'normal':
                this.gameSpeed = 2;
                this.player.speed = 5;
                break;
            case 'hard':
                this.gameSpeed = 3;
                this.player.speed = 4;
                break;
        }
    }
    
    showSettings() {
        this.gameState = 'settings';
        this.showScreen('settingsScreen');
    }
    
    spawnPowerUp() {
        const types = ['shield', 'speed', 'multiplier'];
        const type = types[Math.floor(Math.random() * types.length)];
        const powerUp = {
            x: this.canvas.width,
            y: Math.random() * (this.canvas.height - 60) + 30,
            size: 20,
            type: type,
            collected: false
        };
        this.powerUps[type].object = powerUp;
    }
    
    updatePowerUps(deltaTime) {
        Object.keys(this.powerUps).forEach(type => {
            const powerUp = this.powerUps[type];
            
            // Update active power-ups
            if (powerUp.active) {
                powerUp.duration -= deltaTime;
                if (powerUp.duration <= 0) {
                    this.deactivatePowerUp(type);
                }
            }
            
            // Update power-up objects
            if (powerUp.object) {
                powerUp.object.x -= this.gameSpeed * 2;
                
                // Check collection
                const dist = Math.hypot(
                    this.player.x - powerUp.object.x,
                    this.player.y - powerUp.object.y
                );
                
                if (dist < this.player.size + powerUp.object.size) {
                    this.activatePowerUp(type);
                    powerUp.object = null;
                }
                
                // Remove if off screen
                if (powerUp.object && powerUp.object.x < -powerUp.object.size) {
                    powerUp.object = null;
                }
            }
        });
    }
    
    activatePowerUp(type) {
        const powerUp = this.powerUps[type];
        powerUp.active = true;
        powerUp.duration = 10000; // 10 seconds
        
        switch (type) {
            case 'shield':
                this.player.isShielded = true;
                break;
            case 'speed':
                this.player.speed *= 1.5;
                break;
            case 'multiplier':
                this.powerUps.multiplier.value = 2;
                break;
        }
        
        // Visual feedback
        this.createPowerUpEffect(type);
    }
    
    deactivatePowerUp(type) {
        const powerUp = this.powerUps[type];
        powerUp.active = false;
        
        switch (type) {
            case 'shield':
                this.player.isShielded = false;
                break;
            case 'speed':
                this.player.speed = this.settings.difficulty === 'easy' ? 6 : 
                                  this.settings.difficulty === 'normal' ? 5 : 4;
                break;
            case 'multiplier':
                this.powerUps.multiplier.value = 1;
                break;
        }
    }
    
    createPowerUpEffect(type) {
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const effect = {
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(angle) * 5,
                vy: Math.sin(angle) * 5,
                size: Math.random() * 3 + 2,
                color: type === 'shield' ? '#4a9eff' :
                       type === 'speed' ? '#ff4a4a' : '#ffcc00',
                life: 1
            };
            this.particles.push(effect);
        }
    }
    
    render() {
        // Clear canvas with theme-based gradient
        const theme = this.settings.theme;
        let gradientColors;
        
        switch (theme) {
            case 'neon':
                gradientColors = {
                    start: 'rgba(255, 0, 255, 0.1)',
                    end: 'rgba(0, 0, 0, 0.3)'
                };
                break;
            case 'sunset':
                gradientColors = {
                    start: 'rgba(255, 107, 107, 0.1)',
                    end: 'rgba(45, 27, 78, 0.3)'
                };
                break;
            case 'ocean':
                gradientColors = {
                    start: 'rgba(0, 78, 146, 0.1)',
                    end: 'rgba(0, 4, 40, 0.3)'
                };
                break;
            default: // cosmic
                gradientColors = {
                    start: 'rgba(29, 39, 125, 0.1)',
                    end: 'rgba(2, 1, 26, 0.3)'
                };
        }
        
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width
        );
        gradient.addColorStop(0, gradientColors.start);
        gradient.addColorStop(1, gradientColors.end);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.gameState === 'playing') {
            this.renderStars();
            this.renderParticles();
            this.renderPlayerTrail();
            this.renderPlayer();
            this.renderNotes();
            this.renderObstacles();
            this.renderPowerUps();
            
            // Render active power-up indicators
            this.renderPowerUpStatus();
        } else {
            this.renderStars();
            this.renderMenuParticles();
        }
        
        // Apply visual effects based on settings
        if (this.settings.effects.glow) {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = this.getThemeColor();
        } else {
            this.ctx.shadowBlur = 0;
        }
    }
    
    renderStars() {
        this.ctx.save();
        this.stars.forEach(star => {
            this.ctx.globalAlpha = star.opacity;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();
    }
    
    renderPlayer() {
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        
        // Glow effect
        this.ctx.shadowColor = this.player.color;
        this.ctx.shadowBlur = 20;
        
        // Main body
        this.ctx.fillStyle = this.player.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.player.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner core
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.player.size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    renderPlayerTrail() {
        this.ctx.save();
        this.player.trail.forEach((point, index) => {
            this.ctx.globalAlpha = point.life * 0.5;
            this.ctx.fillStyle = this.player.color;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, this.player.size * point.life * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();
    }
    
    renderNotes() {
        this.ctx.save();
        this.notes.forEach(note => {
            this.ctx.translate(note.x, note.y);
            
            // Pulsing glow
            const glowSize = note.size + Math.sin(note.pulse) * 5;
            this.ctx.shadowColor = note.color;
            this.ctx.shadowBlur = 15;
            
            // Note body
            this.ctx.fillStyle = note.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Musical note symbol
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('♪', 0, 0);
            
            this.ctx.resetTransform();
        });
        this.ctx.restore();
    }
    
    renderObstacles() {
        this.ctx.save();
        this.obstacles.forEach(obstacle => {
            this.ctx.translate(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2);
            this.ctx.rotate(obstacle.rotation);
            
            // Glow effect
            this.ctx.shadowColor = obstacle.color;
            this.ctx.shadowBlur = 10;
            
            // Obstacle body
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(-obstacle.width/2, -obstacle.height/2, obstacle.width, obstacle.height);
            
            // Energy lines
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(-obstacle.width/2, 0);
            this.ctx.lineTo(obstacle.width/2, 0);
            this.ctx.stroke();
            
            this.ctx.resetTransform();
        });
        this.ctx.restore();
    }
    
    renderParticles() {
        this.ctx.save();
        this.particles.forEach(particle => {
            this.ctx.globalAlpha = particle.life * particle.opacity;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();
    }
    
    renderMenuParticles() {
        // Add some floating particles for menu ambiance
        if (Math.random() < 0.1) {
            this.spawnParticle();
        }
        this.updateParticles();
        this.renderParticles();
    }
    
    getRandomNoteColor() {
        const colors = ['#64ffda', '#ffd93d', '#ff8a95', '#a8e6cf', '#dda0dd'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    getRandomColor() {
        const colors = ['#64ffda', '#ffd93d', '#ff8a95', '#a8e6cf', '#dda0dd', '#87ceeb'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    getRandomFrequency() {
        const frequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C4 to C5
        return frequencies[Math.floor(Math.random() * frequencies.length)];
    }
    
    getThemeColor() {
        switch (this.settings.theme) {
            case 'neon':
                return '#ff00ff';
            case 'sunset':
                return '#ffd93d';
            case 'ocean':
                return '#00ffff';
            default: // cosmic
                return '#64ffda';
        }
    }
    
    renderPowerUps() {
        Object.keys(this.powerUps).forEach(type => {
            const powerUp = this.powerUps[type].object;
            if (!powerUp) return;
            
            this.ctx.save();
            
            let color;
            let icon;
            switch (type) {
                case 'shield':
                    color = '#4a9eff';
                    icon = '🛡️';
                    break;
                case 'speed':
                    color = '#ff4a4a';
                    icon = '⚡';
                    break;
                case 'multiplier':
                    color = '#ffcc00';
                    icon = '×2';
                    break;
            }
            
            // Draw power-up background
            const gradient = this.ctx.createRadialGradient(
                powerUp.x, powerUp.y, 0,
                powerUp.x, powerUp.y, powerUp.size
            );
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(powerUp.x, powerUp.y, powerUp.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw icon
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(icon, powerUp.x, powerUp.y);
            
            this.ctx.restore();
        });
    }
    
    renderPowerUpStatus() {
        const statusSize = 30;
        const padding = 10;
        let offsetX = padding;
        
        Object.keys(this.powerUps).forEach(type => {
            const powerUp = this.powerUps[type];
            if (!powerUp.active) return;
            
            this.ctx.save();
            
            // Draw status indicator
            const x = this.canvas.width - offsetX - statusSize;
            const y = padding;
            
            let color;
            let icon;
            switch (type) {
                case 'shield':
                    color = '#4a9eff';
                    icon = '🛡️';
                    break;
                case 'speed':
                    color = '#ff4a4a';
                    icon = '⚡';
                    break;
                case 'multiplier':
                    color = '#ffcc00';
                    icon = '×2';
                    break;
            }
            
            // Background
            this.ctx.fillStyle = color;
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.arc(x + statusSize/2, y + statusSize/2, statusSize/2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Icon
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(icon, x + statusSize/2, y + statusSize/2);
            
            // Duration bar
            const barWidth = 40;
            const barHeight = 4;
            const progress = powerUp.duration / 10000; // 10 seconds max
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillRect(x, y + statusSize + 5, barWidth, barHeight);
            
            this.ctx.globalAlpha = 1;
            this.ctx.fillRect(x, y + statusSize + 5, barWidth * progress, barHeight);
            
            offsetX += statusSize + padding;
            this.ctx.restore();
        });
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // Add missing methods for completeness
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.player.x = this.canvas.width * 0.1;
        this.player.y = this.canvas.height / 2;
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }

    playNote(frequency, duration = 0.2) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    createStarField() {
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2,
                speed: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.8 + 0.2
            });
        }
    }

    updateUI() {
        const scoreElement = document.getElementById('score');
        const healthFill = document.getElementById('healthFill');
        
        if (scoreElement) scoreElement.textContent = this.score;
        
        if (healthFill) {
            healthFill.style.width = this.health + '%';
            
            if (this.health < 30) {
                healthFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ff8a95 100%)';
            } else if (this.health < 60) {
                healthFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ffd93d 100%)';
            } else {
                healthFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ffd93d 50%, #6bcf7f 100%)';
            }
        }
    }

    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.updatePlayer();
        this.updateStars();
        this.spawnObjects(deltaTime);
        this.updateNotes();
        this.updateObstacles();
        this.updateParticles();
        this.updatePowerUps(deltaTime);
        this.checkCollisions();
        this.updateDifficulty();
        this.updateUI();
        
        if (this.health <= 0) {
            this.showGameOver();
        }
    }

    updatePlayer() {
        // Keyboard movement
        if (this.keys['w'] || this.keys['arrowup']) {
            this.player.y -= this.player.speed;
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            this.player.y += this.player.speed;
        }
        if (this.keys['a'] || this.keys['arrowleft']) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            this.player.x += this.player.speed;
        }
        
        // Boundary checking
        this.player.x = Math.max(this.player.size, Math.min(this.canvas.width - this.player.size, this.player.x));
        this.player.y = Math.max(this.player.size, Math.min(this.canvas.height - this.player.size, this.player.y));
        
        // Add trail effect
        if (this.settings.effects.trails) {
            this.player.trail.push({ x: this.player.x, y: this.player.y, life: 1 });
            if (this.player.trail.length > 20) {
                this.player.trail.shift();
            }
            
            this.player.trail.forEach(point => {
                point.life -= 0.05;
            });
            this.player.trail = this.player.trail.filter(point => point.life > 0);
        }
    }

    updateStars() {
        this.stars.forEach(star => {
            star.x -= star.speed * this.gameSpeed;
            if (star.x < 0) {
                star.x = this.canvas.width;
                star.y = Math.random() * this.canvas.height;
            }
        });
    }

    updateDifficulty() {
        const newLevel = Math.floor(this.score / 1000) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.gameSpeed += 0.5;
        }
    }

    updateDifficultySettings() {
        switch (this.settings.difficulty) {
            case 'easy':
                this.gameSpeed = Math.max(1.5, this.gameSpeed * 0.8);
                this.player.speed = 6;
                break;
            case 'normal':
                this.gameSpeed = Math.max(2, this.gameSpeed);
                this.player.speed = 5;
                break;
            case 'hard':
                this.gameSpeed = Math.max(3, this.gameSpeed * 1.2);
                this.player.speed = 4;
                break;
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new StellarHarmonyGame();
});
