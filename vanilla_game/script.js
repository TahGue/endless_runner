document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over');
    const restartBtn = document.getElementById('restart-btn');
    const scoreEl = document.getElementById('score');
    const distanceEl = document.getElementById('distance');
    const biomeEl = document.getElementById('biome');
    const loreEl = document.getElementById('lore-collected');
    const finalScoreEl = document.getElementById('final-score');
    const reviveStatusEl = document.getElementById('revive-status');

    // Sound Elements
    const jumpSound = document.getElementById('jump-sound');
    const collectSound = document.getElementById('collect-sound');
    const gameOverSound = document.getElementById('game-over-sound');

    // Game variables
    let player, obstacles, powerUps, loreFragments, score, distance, loreCount, gameSpeed, keys;
    let isPlaying = false;
    let animationFrameId;
    let currentBiomeIndex;

    const BIOME_CHANGE_DISTANCE = 5000; // Change biome every 5000 distance points

    let biomes = []; // Will be initialized later
    const playerWidth = 40;
    const playerHeight = 60;
    const playerJump = -15;
    const gravity = 0.8;

    class Player {
        constructor(x, y, width, height, color) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.color = color;

            this.dy = 0;
            this.jumpForce = playerJump;
            this.originalHeight = height;
            this.grounded = false;

            this.invincible = false;
            this.invincibilityTimer = 0;
            this.speedBoost = false;
            this.speedBoostTimer = 0;
            this.slowDown = false;
            this.slowDownTimer = 0;
            this.runFrame = 0;
            this.hasRevive = false;
        }

        jump() {
            if (this.grounded) {
                this.dy = this.jumpForce;
                this.grounded = false;
                jumpSound.currentTime = 0;
                jumpSound.play();
            }
        }

        update() {
            this.runFrame++;

            // Handle invincibility
            if (this.invincible) {
                this.invincibilityTimer -= 16; // roughly 1 frame at 60fps
                if (this.invincibilityTimer <= 0) {
                    this.invincible = false;
                    this.color = 'red'; // Reset color
                }
            }

            // Handle speed boost
            if (this.speedBoost) {
                this.speedBoostTimer -= 16;
                if (this.speedBoostTimer <= 0) {
                    this.speedBoost = false;
                    gameSpeed -= biomes[1].powerUpTypes[0].value; // Assumes Jaguar Spirit is the only one
                }
            }

            // Handle slow down
            if (this.slowDown) {
                this.slowDownTimer -= 16;
                if (this.slowDownTimer <= 0) {
                    this.slowDown = false;
                    gameSpeed += biomes[2].powerUpTypes[0].value; // Assumes Water Flask is the only one
                }
            }

            // Apply gravity
            this.dy += gravity;
            this.y += this.dy;

            // Prevent falling through the floor
            if (this.y + this.height > canvas.height) {
                this.y = canvas.height - this.height;
                this.dy = 0;
                this.grounded = true;
            }
        }

        draw() {
            if (this.hasRevive) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#ffab00';
            }

            ctx.fillStyle = this.color;
            let bobbingHeight = 0;
            // Add bobbing animation when grounded
            if (this.grounded) {
                bobbingHeight = Math.sin(this.runFrame * 0.4) * 3;
            }
            ctx.fillRect(this.x, this.y + bobbingHeight, this.width, this.height - bobbingHeight);

            // Reset shadow for other elements
            ctx.shadowBlur = 0;
        }
    }

    class PowerUp {
        constructor(x, y, width, height, color, type, effect, duration) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.color = color;
            this.type = type;
            this.effect = effect;
            this.duration = duration;
        }

        update() {
            this.x -= gameSpeed;
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    class LoreFragment {
        constructor(x, y, width, height, color) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.color = color;
        }

        update() {
            this.x -= gameSpeed;
        }

        draw() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Simple glowing effect
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.shadowBlur = 0;
        }
    }

    class Obstacle {
        constructor(x, y, width, height, color, type) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.color = color;
            this.type = type;
        }

        update() {
            this.x -= gameSpeed;
        }

        draw() {
            ctx.fillStyle = this.color;
            if (this.type === 'icicle') {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + this.width, this.y);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height);
                ctx.fill();
            } else {
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }
    }

    function initializeBiomes() {
        biomes = [
            {
                name: 'Frozen Wastelands',
                backgroundColor: '#a2d5f2',
                groundColor: '#e0f7fa',
                obstacleTypes: [
                    { type: 'ice_crack', color: '#ffffff', width: 100, height: 15, yPos: 'ground', yOffset: -15 },
                    { type: 'icicle', color: '#ffffff', width: 20, height: 40, yPos: 'air', yOffset: 0 }
                ],
                powerUpTypes: [
                    { type: 'torch', color: '#ff6d00', width: 20, height: 40, effect: 'invincibility', duration: 5000 }
                ]
            },
            {
                name: 'Deep Jungle',
                backgroundColor: '#2e7d32',
                groundColor: '#558b2f',
                obstacleTypes: [
                    { type: 'log', color: '#8d6e63', width: 50, height: 40, yPos: 'ground', yOffset: -40 },
                    { type: 'vine', color: '#1b5e20', width: 10, height: 100, yPos: 'air', yOffset: 0 }
                ],
                powerUpTypes: [
                    { type: 'jaguar_spirit', color: '#ffeb3b', width: 30, height: 30, effect: 'speed_boost', duration: 3000, value: 5 }
                ]
            },
            {
                name: 'Desert of Illusions',
                backgroundColor: '#ffca28',
                groundColor: '#ffd54f',
                obstacleTypes: [
                    { type: 'dune', color: '#d2691e', width: 80, height: 30, yPos: 'ground', yOffset: -30 },
                    { type: 'scorpion', color: '#3e2723', width: 30, height: 20, yPos: 'ground', yOffset: -20 }
                ],
                powerUpTypes: [
                    { type: 'water_flask', color: '#4fc3f7', width: 25, height: 25, effect: 'slow_down', duration: 4000, value: 2 }
                ]
            },
            {
                name: 'Sunken City of Atlantis',
                backgroundColor: '#0d47a1',
                groundColor: '#b2dfdb',
                obstacleTypes: [
                    { type: 'coral_reef', color: '#ff8a80', width: 60, height: 35, yPos: 'ground', yOffset: -35 },
                    { type: 'pillar', color: '#78909c', width: 40, height: 120, yPos: 'ground', yOffset: -120 }
                ],
                powerUpTypes: [
                    { type: 'trident', color: '#fdd835', width: 20, height: 50, effect: 'invincibility', duration: 5000 }
                ]
            },
            {
                name: 'Volcanic Peaks of Ash',
                backgroundColor: '#bf360c',
                groundColor: '#212121',
                obstacleTypes: [
                    { type: 'lava_pit', color: '#ff3d00', width: 70, height: 20, yPos: 'ground', yOffset: -20 },
                    { type: 'ember', color: '#ff9100', width: 15, height: 15, yPos: 'air', yOffset: 50 + Math.random() * 100 }
                ],
                powerUpTypes: [
                    { type: 'phoenix_feather', color: '#ffab00', width: 25, height: 40, effect: 'revive', duration: 0 }
                ]
            }
        ];
    }

    function init() {
        isPlaying = true;
        gameSpeed = 5;
        score = 0;
        distance = 0;
        obstacles = [];
        powerUps = [];
        loreFragments = [];
        loreCount = 0;
        reviveStatusEl.textContent = '';
        currentBiomeIndex = 0;

        player = new Player(50, canvas.height - playerHeight, playerWidth, playerHeight, 'red');

        keys = {};

        scoreEl.textContent = 'Score: 0';
        distanceEl.textContent = 'Distance: 0';
        loreEl.textContent = 'Lore: 0';
        gameOverScreen.style.display = 'none';
        startScreen.style.display = 'none';

        setBiome(currentBiomeIndex);
        loop();
    }

    function setBiome(biomeIndex) {
        const biome = biomes[biomeIndex];
        canvas.style.backgroundColor = biome.backgroundColor;
        biomeEl.textContent = `Biome: ${biome.name}`;
    }

    function spawnObstacle() {
        const biome = biomes[currentBiomeIndex];
        const obstacleDef = JSON.parse(JSON.stringify(biome.obstacleTypes[Math.floor(Math.random() * biome.obstacleTypes.length)]));

        let y;
        if (obstacleDef.type === 'ember') {
            // Recalculate yOffset for each ember to make them fall from random heights
            obstacleDef.yOffset = 50 + Math.random() * 100;
        }

        if (obstacleDef.yPos === 'ground') {
            y = canvas.height + obstacleDef.yOffset;
        } else { // air
            y = obstacleDef.yOffset;
        }

        const obstacle = new Obstacle(
            canvas.width,
            y,
            obstacleDef.width,
            obstacleDef.height,
            obstacleDef.color,
            obstacleDef.type
        );
        obstacles.push(obstacle);
    }

    function spawnLoreFragment() {
        const loreFragment = new LoreFragment(canvas.width, canvas.height - 100, 15, 25, '#f0f'); // Bright magenta
        loreFragments.push(loreFragment);
    }

    function spawnPowerUp() {
        const biome = biomes[currentBiomeIndex];
        if (!biome.powerUpTypes || biome.powerUpTypes.length === 0) return;

        const powerUpDef = biome.powerUpTypes[Math.floor(Math.random() * biome.powerUpTypes.length)];
        const powerUp = new PowerUp(
            canvas.width,
            canvas.height - powerUpDef.height - 20, // Spawn on ground, 20px is ground height
            powerUpDef.width,
            powerUpDef.height,
            powerUpDef.color,
            powerUpDef.type,
            powerUpDef.effect,
            powerUpDef.duration
        );
        powerUps.push(powerUp);
    }

    function loop() {
        if (!isPlaying) return;

        animationFrameId = requestAnimationFrame(loop);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw ground
        const currentBiome = biomes[currentBiomeIndex];
        ctx.fillStyle = currentBiome.groundColor;
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

        // Update and draw player
        player.update();
        player.draw();

        // Handle obstacles and power-ups spawning
        if (Math.random() < 0.02 && obstacles.length < 5) { // Control obstacle spawn rate
            spawnObstacle();
        }
        if (Math.random() < 0.005) { // Control power-up spawn rate
            spawnPowerUp();
        }
        if (Math.random() < 0.002) { // Control lore spawn rate
            spawnLoreFragment();
        }

        obstacles.forEach((obstacle, index) => {
            obstacle.update();
            obstacle.draw();

            // Collision detection
            if (
                player.x < obstacle.x + obstacle.width &&
                player.x + player.width > obstacle.x &&
                player.y < obstacle.y + obstacle.height &&
                player.y + player.height > obstacle.y
            ) {
                if (!player.invincible) {
                    endGame();
                }
            }

            // Remove off-screen obstacles
            if (obstacle.x + obstacle.width < 0) {
                obstacles.splice(index, 1);
                score++;
                scoreEl.textContent = `Score: ${score}`;
            }
        });

        // Update distance
        distance += gameSpeed;
        distanceEl.textContent = `Distance: ${Math.floor(distance / 100)}`;

        // Check for biome transition
        if (Math.floor(distance / BIOME_CHANGE_DISTANCE) > currentBiomeIndex) {
            currentBiomeIndex++;
            if (currentBiomeIndex >= biomes.length) {
                currentBiomeIndex = 0; // Loop back for now
            }
            setBiome(currentBiomeIndex);
        }
        
        // Handle PowerUps
        powerUps.forEach((powerUp, index) => {
            powerUp.update();
            powerUp.draw();

            // Collision with player
            if (
                player.x < powerUp.x + powerUp.width &&
                player.x + player.width > powerUp.x &&
                player.y < powerUp.y + powerUp.height &&
                player.y + player.height > powerUp.y
            ) {
                if (powerUp.effect === 'invincibility') {
                    player.invincible = true;
                    player.invincibilityTimer = powerUp.duration;
                    player.color = powerUp.color;
                } else if (powerUp.effect === 'speed_boost' && !player.speedBoost) {
                    player.speedBoost = true;
                    player.speedBoostTimer = powerUp.duration;
                    gameSpeed += powerUp.value;
                } else if (powerUp.effect === 'slow_down' && !player.slowDown) {
                    player.slowDown = true;
                    player.slowDownTimer = powerUp.duration;
                    gameSpeed = Math.max(1, gameSpeed - powerUp.value);
                } else if (powerUp.effect === 'revive') {
                    player.hasRevive = true;
                    reviveStatusEl.textContent = 'REVIVE ACTIVE';
                }
                collectSound.currentTime = 0;
                collectSound.play();
                powerUps.splice(index, 1); // Remove collected power-up
            }

            // Remove off-screen power-ups
            if (powerUp.x + powerUp.width < 0) {
                powerUps.splice(index, 1);
            }
        });

        // Handle Lore Fragments
        loreFragments.forEach((fragment, index) => {
            fragment.update();
            fragment.draw();

            // Collision with player
            if (
                player.x < fragment.x + fragment.width &&
                player.x + player.width > fragment.x &&
                player.y < fragment.y + fragment.height &&
                player.y + player.height > fragment.y
            ) {
                loreCount++;
                loreEl.textContent = `Lore: ${loreCount}`;
                collectSound.currentTime = 0;
                collectSound.play();
                loreFragments.splice(index, 1);
            }

            // Remove off-screen fragments
            if (fragment.x + fragment.width < 0) {
                loreFragments.splice(index, 1);
            }
        });

        // Increase speed over time
        gameSpeed += 0.001;
    }

    function endGame() {
        if (player.hasRevive) {
            player.hasRevive = false;
            reviveStatusEl.textContent = '';
            player.y = canvas.height - player.height; // Put player back on ground
            player.dy = 0;
            player.invincible = true; // Grant temporary invincibility after revive
            player.invincibilityTimer = 2000; // 2 seconds
            player.color = '#fdd835'; // Gold to show invincibility

            // Clear obstacles near the player
            obstacles = obstacles.filter(o => o.x > canvas.width / 2);
            return; // Don't end the game
        }

        isPlaying = false;
        gameOverSound.play();
        cancelAnimationFrame(animationFrameId);
        gameOverScreen.style.display = 'flex';
        finalScoreEl.textContent = `Final Score: ${score}`;
    }

    // Event Listeners
    document.addEventListener('keydown', (e) => {
        if ((e.code === 'Space' || e.code === 'ArrowUp')) {
            if (!isPlaying && startScreen.style.display !== 'none') {
                init();
            } else {
                player.jump();
            }
        }
    });

    canvas.addEventListener('click', () => {
        if (!isPlaying && startScreen.style.display !== 'none') {
            init();
        } else {
            player.jump();
        }
    });

    restartBtn.addEventListener('click', () => {
        init();
    });

    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        initializeBiomes(); // Re-initialize biomes with new canvas dimensions
        // If a game is in progress, you might need to reposition elements
        if (player) {
            player.y = canvas.height - player.height; // Keep player on the ground
        }
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Initial size
});
