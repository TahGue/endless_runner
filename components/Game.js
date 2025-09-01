import React, { useRef, useEffect, useState, useCallback } from 'react';

// --- Constants ---
const BIOME_CHANGE_DISTANCE = 5000;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;
const PLAYER_JUMP = -15;
const GRAVITY = 0.8;

// --- Game Logic Classes (Pure) ---
class Player {
    constructor(x, y, width, height, color, canvas, gameRef, soundsRef) {
        this.x = x; this.y = y; this.width = width; this.height = height; this.color = color; this.canvas = canvas;
        this.gameRef = gameRef; this.soundsRef = soundsRef;

        this.dy = 0; this.jumpForce = PLAYER_JUMP; this.grounded = false; this.runFrame = 0;
        this.invincible = false; this.invincibilityTimer = 0; this.speedBoost = false; this.speedBoostTimer = 0;
        this.slowDown = false; this.slowDownTimer = 0; this.hasRevive = false;
    }

    jump() {
        if (this.grounded) {
            this.dy = this.jumpForce;
            this.grounded = false;
            this.soundsRef.current.jump?.play();
        }
    }

    update() {
        this.runFrame++;
        if (this.invincible) {
            this.invincibilityTimer -= 16;
            if (this.invincibilityTimer <= 0) { this.invincible = false; this.color = 'red'; }
        }
        if (this.speedBoost) {
            this.speedBoostTimer -= 16;
            if (this.speedBoostTimer <= 0) { this.speedBoost = false; this.gameRef.current.speed -= this.gameRef.current.biomes[1].powerUpTypes[0].value; }
        }
        if (this.slowDown) {
            this.slowDownTimer -= 16;
            if (this.slowDownTimer <= 0) { this.slowDown = false; this.gameRef.current.speed += this.gameRef.current.biomes[2].powerUpTypes[0].value; }
        }

        this.dy += GRAVITY;
        this.y += this.dy;

        if (this.y + this.height > this.canvas.height) {
            this.y = this.canvas.height - this.height;
            this.dy = 0;
            this.grounded = true;
        }
    }

    draw(ctx) {
        if (this.hasRevive) { ctx.shadowBlur = 20; ctx.shadowColor = '#ffab00'; }
        ctx.fillStyle = this.color;
        let bobbingHeight = this.grounded ? Math.sin(this.runFrame * 0.4) * 3 : 0;
        ctx.fillRect(this.x, this.y + bobbingHeight, this.width, this.height - bobbingHeight);
        ctx.shadowBlur = 0;
    }
}

class Obstacle {
    constructor(x, y, width, height, color, type, gameRef) {
        this.x = x; this.y = y; this.width = width; this.height = height; this.color = color; this.type = type;
        this.gameRef = gameRef;
    }
    update() { this.x -= this.gameRef.current.speed; }
    draw(ctx) {
        ctx.fillStyle = this.color;
        if (this.type === 'icicle') {
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + this.width, this.y); ctx.lineTo(this.x + this.width / 2, this.y + this.height); ctx.fill();
        } else {
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

class PowerUp {
    constructor(x, y, width, height, color, type, effect, duration, gameRef) {
        this.x = x; this.y = y; this.width = width; this.height = height; this.color = color; this.type = type; this.effect = effect; this.duration = duration;
        this.gameRef = gameRef;
    }
    update() { this.x -= this.gameRef.current.speed; }
    draw(ctx) { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.width, this.height); }
}

class LoreFragment {
    constructor(x, y, width, height, color, gameRef, title, content, biome) {
        this.x = x; this.y = y; this.width = width; this.height = height; this.color = color;
        this.gameRef = gameRef;
        this.title = title;
        this.content = content;
        this.biome = biome;
    }
    update() { this.x -= this.gameRef.current.speed; }
    draw(ctx) {
        ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

// --- Helper Components for UI ---
const UILayer = ({ score, distance, loreCount, biomeName, reviveActive }) => (
    <div id="ui">
        <div>
            <div id="score">Score: {score}</div>
            <div id="distance">Distance: {distance}</div>
            <div id="lore-collected">Lore: {loreCount}</div>
        </div>
        <div>
            <div id="biome">Biome: {biomeName}</div>
            {reviveActive && <div id="revive-status">REVIVE ACTIVE</div>}
        </div>
    </div>
);

const StartScreen = ({ onStart }) => (
    <div id="start-screen">
        <h1>Edge of the World</h1>
        <p>Press Space or Click to Begin</p>
    </div>
);

const Codex = ({ lore }) => (
    <div id="codex">
        <h2>Discovered Lore</h2>
        {lore.length > 0 ? (
            <ul>
                {lore.map((entry) => (
                    <li key={entry.id}>
                        <h3>{entry.title}</h3>
                        <p><em>({entry.biome})</em></p>
                        <p>{entry.content}</p>
                    </li>
                ))}
            </ul>
        ) : (
            <p>No lore discovered yet.</p>
        )}
    </div>
);

const GameOverScreen = ({ score, onRestart, lore }) => (
    <div id="game-over" style={{ display: 'flex' }}>
        <div>
            <h1>Game Over</h1>
            <p id="final-score">Final Score: {score}</p>
            <button id="restart-btn" onClick={onRestart}>Restart</button>
        </div>
        <Codex lore={lore} />
    </div>
);

const initializeBiomes = () => [
    { name: 'Frozen Wastelands', lore: [{ title: 'The Long Winter', content: 'A journal entry speaks of a winter that never ended, a sun that vanished.' }], backgroundColor: '#a2d5f2', groundColor: '#e0f7fa', obstacleTypes: [{ type: 'ice_crack', color: '#ffffff', width: 100, height: 15, yPos: 'ground', yOffset: -15 }, { type: 'icicle', color: '#ffffff', width: 20, height: 40, yPos: 'air', yOffset: 0 }], powerUpTypes: [{ type: 'torch', color: '#ff6d00', width: 20, height: 40, effect: 'invincibility', duration: 5000 }] },
    { name: 'Deep Jungle', lore: [{ title: 'Whispers of the Canopy', content: 'The trees here are said to hold the memories of the world.' }], backgroundColor: '#2e7d32', groundColor: '#558b2f', obstacleTypes: [{ type: 'log', color: '#8d6e63', width: 50, height: 40, yPos: 'ground', yOffset: -40 }, { type: 'vine', color: '#1b5e20', width: 10, height: 100, yPos: 'air', yOffset: 0 }], powerUpTypes: [{ type: 'jaguar_spirit', color: '#ffeb3b', width: 30, height: 30, effect: 'speed_boost', duration: 3000, value: 5 }] },
    { name: 'Desert of Illusions', lore: [{ title: 'Mirage of Time', content: 'Travelers speak of seeing cities in the sand that were never there.' }], backgroundColor: '#ffca28', groundColor: '#ffd54f', obstacleTypes: [{ type: 'dune', color: '#d2691e', width: 80, height: 30, yPos: 'ground', yOffset: -30 }, { type: 'scorpion', color: '#3e2723', width: 30, height: 20, yPos: 'ground', yOffset: -20 }], powerUpTypes: [{ type: 'water_flask', color: '#4fc3f7', width: 25, height: 25, effect: 'slow_down', duration: 4000, value: 2 }] },
    { name: 'Sunken City of Atlantis', lore: [{ title: 'The Silent Depths', content: 'A once-great city, now sleeping under the waves, waiting to be awoken.' }], backgroundColor: '#0d47a1', groundColor: '#b2dfdb', obstacleTypes: [{ type: 'coral_reef', color: '#ff8a80', width: 60, height: 35, yPos: 'ground', yOffset: -35 }, { type: 'pillar', color: '#78909c', width: 40, height: 120, yPos: 'ground', yOffset: -120 }], powerUpTypes: [{ type: 'trident', color: '#fdd835', width: 20, height: 50, effect: 'invincibility', duration: 5000 }] },
    { name: 'Volcanic Peaks of Ash', lore: [{ title: 'Heart of the Mountain', content: 'The world was forged in fire, and here, the fire still burns.' }], backgroundColor: '#bf360c', groundColor: '#212121', obstacleTypes: [{ type: 'lava_pit', color: '#ff3d00', width: 70, height: 20, yPos: 'ground', yOffset: -20 }, { type: 'ember', color: '#ff9100', width: 15, height: 15, yPos: 'air', yOffset: 50 + Math.random() * 100 }], powerUpTypes: [{ type: 'phoenix_feather', color: '#ffab00', width: 25, height: 40, effect: 'revive', duration: 0 }] }
];

// --- Main Game Component ---
const Game = () => {
    const canvasRef = useRef(null);
    const gameLoopId = useRef(null);
    const game = useRef({ initialized: false });
    const sounds = useRef({});

    const [isPlaying, setIsPlaying] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [distance, setDistance] = useState(0);
    const [loreCount, setLoreCount] = useState(0);
    const [currentBiomeName, setCurrentBiomeName] = useState('');
    const [reviveActive, setReviveActive] = useState(false);
    const [discoveredLore, setDiscoveredLore] = useState([]);

    const setBiome = useCallback((biomeIndex) => {
        const canvas = canvasRef.current;
        const biome = game.current.biomes[biomeIndex];
        if (canvas) canvas.style.backgroundColor = biome.backgroundColor;
        setCurrentBiomeName(biome.name);
    }, []);

    const endGame = useCallback(() => {
        const g = game.current;
        if (g.player.hasRevive) {
            g.player.hasRevive = false;
            setReviveActive(false);
            g.player.y = canvasRef.current.height - g.player.height;
            g.player.dy = 0;
            g.player.invincible = true;
            g.player.invincibilityTimer = 2000;
            g.player.color = '#fdd835';
            g.obstacles = g.obstacles.filter(o => o.x > canvasRef.current.width / 2);
            return;
        }

        sounds.current.gameOver?.play();
        setIsPlaying(false);
        setIsGameOver(true);
        cancelAnimationFrame(gameLoopId.current);
        game.current.initialized = false;
    }, []);

    const handleLoreCollected = useCallback(async (loreFragment) => {
        try {
            const response = await fetch('/api/lore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: loreFragment.title,
                    content: loreFragment.content,
                    biome: loreFragment.biome,
                }),
            });

            if (response.status === 201) {
                const newLore = await response.json();
                setDiscoveredLore(prev => [...prev, newLore].sort((a, b) => new Date(a.discoveredAt) - new Date(b.discoveredAt)));
                setLoreCount(c => c + 1);
            } else if (response.status !== 409) {
                console.error('Failed to save lore:', await response.json());
            }
        } catch (error) {
            console.error('Error saving lore:', error);
        }
    }, []);

    const gameLoop = useCallback(() => {
        if (!game.current.initialized) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const g = game.current;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        g.player.update();
        g.speed += 0.001;
        setDistance(d => d + g.speed);

        if (Math.floor((distance + g.speed) / BIOME_CHANGE_DISTANCE) > g.currentBiomeIndex) {
            g.currentBiomeIndex = (g.currentBiomeIndex + 1) % g.biomes.length;
            setBiome(g.currentBiomeIndex);
        }

        if (Math.random() < 0.02 && g.obstacles.length < 5) {
            const biome = g.biomes[g.currentBiomeIndex];
            const def = JSON.parse(JSON.stringify(biome.obstacleTypes[Math.floor(Math.random() * biome.obstacleTypes.length)]));
            let y = (def.type === 'ember') ? 50 + Math.random() * 100 : def.yOffset;
            if (def.yPos === 'ground') y = canvas.height + def.yOffset;
            g.obstacles.push(new Obstacle(canvas.width, y, def.width, def.height, def.color, def.type, game));
        }
        if (Math.random() < 0.005) {
            const biome = g.biomes[g.currentBiomeIndex];
            if (biome.powerUpTypes?.length > 0) {
                const def = biome.powerUpTypes[Math.floor(Math.random() * biome.powerUpTypes.length)];
                g.powerUps.push(new PowerUp(canvas.width, canvas.height - def.height - 20, def.width, def.height, def.color, def.type, def.effect, def.duration, game));
            }
        }
        if (Math.random() < 0.002) {
            const biome = g.biomes[g.currentBiomeIndex];
            const loreData = biome.lore[Math.floor(Math.random() * biome.lore.length)];
            g.loreFragments.push(new LoreFragment(canvas.width, canvas.height - 100, 15, 25, '#f0f', game, loreData.title, loreData.content, biome.name));
        }

        const currentBiome = g.biomes[g.currentBiomeIndex];
        ctx.fillStyle = currentBiome.groundColor;
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

        g.player.draw(ctx);

        g.obstacles.forEach((obs, i) => {
            obs.update();
            obs.draw(ctx);
            if (g.player.x < obs.x + obs.width && g.player.x + g.player.width > obs.x && g.player.y < obs.y + obs.height && g.player.y + g.player.height > obs.y) {
                if (!g.player.invincible) endGame();
            }
            if (obs.x + obs.width < 0) { g.obstacles.splice(i, 1); setScore(s => s + 1); }
        });

        g.powerUps.forEach((p, i) => {
            p.update();
            p.draw(ctx);
            if (g.player.x < p.x + p.width && g.player.x + g.player.width > p.x && g.player.y < p.y + p.height && g.player.y + g.player.height > p.y) {
                if (p.effect === 'invincibility') { g.player.invincible = true; g.player.invincibilityTimer = p.duration; g.player.color = p.color; }
                else if (p.effect === 'revive') { g.player.hasRevive = true; setReviveActive(true); }
                sounds.current.collect?.play();
                g.powerUps.splice(i, 1);
            }
            if (p.x + p.width < 0) g.powerUps.splice(i, 1);
        });

        g.loreFragments.forEach((l, i) => {
            l.update();
            l.draw(ctx);
            if (g.player.x < l.x + l.width && g.player.x + g.player.width > l.x && g.player.y < l.y + l.height && g.player.y + g.player.height > l.y) {
                handleLoreCollected(l);
                sounds.current.collect?.play();
                g.loreFragments.splice(i, 1);
            }
            if (l.x + l.width < 0) g.loreFragments.splice(i, 1);
        });

        gameLoopId.current = requestAnimationFrame(gameLoop);
    }, [distance, setBiome, endGame, handleLoreCollected]);

    const startGame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || game.current.initialized) return;

        game.current = {
            initialized: true,
            speed: 5,
            player: new Player(50, canvas.height - PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT, 'red', canvas, game, sounds),
            obstacles: [],
            powerUps: [],
            loreFragments: [],
            currentBiomeIndex: 0,
            biomes: initializeBiomes(),
        };

        setScore(0);
        setDistance(0);
        setLoreCount(0);
        setReviveActive(false);
        setIsGameOver(false);
        setIsPlaying(true);

        setBiome(0);

        gameLoopId.current = requestAnimationFrame(gameLoop);
    }, [gameLoop, setBiome]);


    useEffect(() => {
        sounds.current.jump = new Audio('/audio/jump.wav');
        sounds.current.collect = new Audio('/audio/collect.wav');
        sounds.current.gameOver = new Audio('/audio/game_over.wav');

        // Fetch initial lore
        const fetchLore = async () => {
            try {
                const response = await fetch('/api/lore');
                if (response.ok) {
                    const lore = await response.json();
                    setDiscoveredLore(lore);
                    setLoreCount(lore.length);
                }
            } catch (error) {
                console.error('Failed to fetch lore:', error);
            }
        };
        fetchLore();

        const handleKeyDown = (e) => {
            if ((e.code === 'Space' || e.code === 'ArrowUp')) {
                if (!isPlaying && !isGameOver) startGame();
                else if (game.current.player) game.current.player.jump();
            }
        };
        const handleClick = () => {
            if (!isPlaying && !isGameOver) startGame();
            else if (game.current.player) game.current.player.jump();
        };
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
                if (game.current.initialized) {
                    game.current.player.y = canvas.height - game.current.player.height;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('click', handleClick);
        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('click', handleClick);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(gameLoopId.current);
        };
    }, [isGameOver, isPlaying, startGame]);

    return (
        <>
            {isPlaying && <UILayer score={score} distance={Math.floor(distance / 100)} loreCount={loreCount} biomeName={currentBiomeName} reviveActive={reviveActive} />}
            {!isPlaying && !isGameOver && <StartScreen onStart={startGame} />}
            {isGameOver && <GameOverScreen score={score} onRestart={startGame} lore={discoveredLore} />}
            <canvas ref={canvasRef} id="game-canvas" />
        </>
    );
};

export default Game;

