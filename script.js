const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let canvasWidth, canvasHeight;

function resizeCanvas() {
    const container = document.querySelector('.screen-container');
    canvasWidth = container.clientWidth;
    canvasHeight = container.clientHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Adjust game elements based on new canvas size
    player.width = canvasWidth * 0.075;
    player.height = canvasHeight * 0.02;
    player.y = canvasHeight - player.height - 10;
    player.speed = canvasWidth * 0.01;
    
    alienWidth = canvasWidth * 0.05;
    alienHeight = canvasHeight * 0.03;
    
    if (gameStarted) {
        initAliens();
    }
}

// Game state
let gameStarted = false;
let gameOver = false;
let score = 0;
let lives = 3;
let wave = 1;
let gameMode = 'slow';
let gameTime = 0;
let gameTimer;

// Player setup
const player = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    color: '#0f0',
    speed: 0,
};

// Aliens setup
let aliens = [];
const alienRows = 4;
const alienCols = 8;
let alienWidth, alienHeight;
let alienDirection = 1;
let alienMoveCounter = 0;

// Bullets setup
let bullets = [];
const bulletCooldown = 500; // ms
let lastBulletTime = 0;

// Powerups
let powerups = [];
const powerupTypes = ['speed', 'multishot', 'shield'];

// Audio setup
let audioContext;
let sounds = {};

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    sounds.shoot = createBeepSound(600, 0.1);
    sounds.alienHit = createBeepSound(300, 0.1);
    sounds.playerHit = createBeepSound(150, 0.3);
    sounds.gameOver = createBeepSound(100, 1);
    sounds.split = createBeepSound(800, 0.1);
    sounds.powerup = createBeepSound(1000, 0.2);
}

function createBeepSound(frequency, duration) {
    return () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    };
}

function playSound(sound) {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    sound();
}

function initAliens() {
    aliens = [];
    for (let row = 0; row < alienRows; row++) {
        for (let col = 0; col < alienCols; col++) {
            aliens.push({
                x: col * (alienWidth * 1.5) + canvasWidth * 0.1,
                y: row * (alienHeight * 1.5) + canvasHeight * 0.1,
                width: alienWidth,
                height: alienHeight,
                color: row % 2 === 0 ? '#f00' : '#ff0',
                health: 2 + Math.floor(wave / 3),
                speed: getAlienSpeed(),
            });
        }
    }
}

function getAlienSpeed() {
    let baseSpeed = 1 + (wave * 0.1);
    switch (gameMode) {
        case 'slow':
            return baseSpeed * 0.5;
        case 'fast':
            return baseSpeed * 1.5;
        case 'frenzy':
            return baseSpeed * 2.5;
        default:
            return baseSpeed;
    }
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    if (player.shield) {
        ctx.strokeStyle = '#00f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function drawAliens() {
    aliens.forEach(alien => {
        ctx.fillStyle = alien.color;
        ctx.fillRect(alien.x, alien.y, alien.width, alien.height);
    });
}

function moveAliens() {
    alienMoveCounter++;
    if (alienMoveCounter >= 30 - wave) {
        let changeDirection = false;
        aliens.forEach(alien => {
            alien.x += canvasWidth * 0.01 * alienDirection * alien.speed;
            if (alien.x <= 0 || alien.x + alien.width >= canvasWidth) {
                changeDirection = true;
            }
        });
        
        if (changeDirection) {
            alienDirection *= -1;
            aliens.forEach(alien => alien.y += canvasHeight * 0.02);
        }
        
        alienMoveCounter = 0;
    }
}

function shootBullet() {
    const currentTime = Date.now();
    if (currentTime - lastBulletTime > bulletCooldown) {
        const bulletWidth = canvasWidth * 0.01;
        const bulletHeight = canvasHeight * 0.02;
        const bulletSpeed = canvasHeight * 0.01;

        if (player.multishot) {
            for (let i = -1; i <= 1; i++) {
                bullets.push({
                    x: player.x + player.width / 2 - bulletWidth / 2 + (i * player.width / 3),
                    y: player.y,
                    width: bulletWidth,
                    height: bulletHeight,
                    color: '#0f0',
                    speed: bulletSpeed,
                });
            }
        } else {
            bullets.push({
                x: player.x + player.width / 2 - bulletWidth / 2,
                y: player.y,
                width: bulletWidth,
                height: bulletHeight,
                color: '#0f0',
                speed: bulletSpeed,
            });
        }
        lastBulletTime = currentTime;
        playSound(sounds.shoot);
    }
}

function drawBullets() {
    bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

        if (bullet.y < 0) bullets.splice(index, 1);
    });
}

function splitAlien(alien) {
    const smallAlienSize = alien.width / 2;
    return [
        {
            x: alien.x - smallAlienSize / 2,
            y: alien.y,
            width: smallAlienSize,
            height: smallAlienSize,
            color: '#f0f',
            health: 1,
            speed: alien.speed * 1.5,
            direction: -1
        },
        {
            x: alien.x + alien.width - smallAlienSize / 2,
            y: alien.y,
            width: smallAlienSize,
            height: smallAlienSize,
            color: '#f0f',
            health: 1,
            speed: alien.speed * 1.5,
            direction: 1
        }
    ];
}

function createPowerup(x, y) {
    const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
    powerups.push({
        x,
        y,
        width: alienWidth,
        height: alienHeight,
        type,
        speed: canvasHeight * 0.003,
    });
}

function drawPowerups() {
    powerups.forEach(powerup => {
        ctx.fillStyle = powerup.type === 'speed' ? '#ff0' : powerup.type === 'multishot' ? '#0ff' : '#f0f';
        ctx.fillRect(powerup.x, powerup.y, powerup.width, powerup.height);
    });
}

function movePowerups() {
    powerups.forEach((powerup, index) => {
        powerup.y += powerup.speed;
        if (powerup.y > canvasHeight) {
            powerups.splice(index, 1);
        }
    });
}

function checkCollisions() {
    bullets.forEach((bullet, bIndex) => {
        aliens.forEach((alien, aIndex) => {
            if (
                bullet.x < alien.x + alien.width &&
                bullet.x + bullet.width > alien.x &&
                bullet.y < alien.y + alien.height &&
                bullet.y + bullet.height > alien.y
            ) {
                bullets.splice(bIndex, 1);
                alien.health--;
                
                if (alien.health <= 0) {
                    if (alien.width > alienWidth / 2) {
                        const smallAliens = splitAlien(alien);
                        aliens.splice(aIndex, 1, ...smallAliens);
                        playSound(sounds.split);
                    } else {
                        aliens.splice(aIndex, 1);
                        if (Math.random() < 0.1) {
                            createPowerup(alien.x, alien.y);
                        }
                    }
                    score += 10;
                    updateScore();
                }
                
                playSound(sounds.alienHit);
            }
        });
    });

    aliens.forEach(alien => {
        if (
            player.x < alien.x + alien.width &&
            player.x + player.width > alien.x &&
            player.y < alien.y + alien.height &&
            player.y + player.height > alien.y
        ) {
            if (!player.shield) {
                lives--;
                updateLives();
                playSound(sounds.playerHit);
                if (lives <= 0) {
                    gameOver = true;
                    playSound(sounds.gameOver);
                } else {
                    resetPlayerPosition();
                }
            } else {
                player.shield = false;
            }
        }
    });

    aliens.forEach(alien => {
        if (alien.y + alien.height > player.y) {
            gameOver = true;
            playSound(sounds.gameOver);
        }
    });

    powerups.forEach((powerup, index) => {
        if (
            player.x < powerup.x + powerup.width &&
            player.x + player.width > powerup.x &&
            player.y < powerup.y + powerup.height &&
            player.y + player.height > powerup.y
        ) {
            powerups.splice(index, 1);
            applyPowerup(powerup.type);
            playSound(sounds.powerup);
        }
    });
}

function resetPlayerPosition() {
    player.x = canvasWidth / 2 - player.width / 2;
    player.y = canvasHeight - player.height - 10;
}

function applyPowerup(type) {
    switch (type) {
        case 'speed':
            player.speed *= 1.5;
            setTimeout(() => player.speed /= 1.5, 5000);
            break;
        case 'multishot':
            player.multishot = true;
            setTimeout(() => player.multishot = false, 5000);
            break;
        case 'shield':
            player.shield = true;
            setTimeout(() => player.shield = false, 5000);
            break;
    }
}

function updateScore() {
    document.getElementById('scoreValue').textContent = score;
}

function updateLives() {
    document.getElementById('livesValue').textContent = lives;
}

function updateTimer() {
    const minutes = Math.floor(gameTime / 60);
    const seconds = gameTime % 60;
    document.getElementById('timerValue').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

let keys = {};

window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === ' ') {
        if (gameStarted && !gameOver) {
            shootBullet();
        } else if (gameOver) {
            restartGame();
        }
    }
    e.preventDefault();
});

window.addEventListener('keyup', e => {
    keys[e.key] = false;
});

function movePlayer() {
    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < canvasWidth - player.width) player.x += player.speed;
}

function startGame(mode) {
    gameMode = mode;
    gameStarted = true;
    gameOver = false;
    score = 0;
    lives = 3;
    wave = 1;
    gameTime = 0;
    updateScore();
    updateLives();
    updateTimer();
    initAliens();
    resetPlayerPosition();
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    gameTimer = setInterval(() => {
        gameTime++;
        updateTimer();
    }, 1000);
    gameLoop();
}

function restartGame() {
    aliens = [];
    bullets = [];
    powerups = [];
    clearInterval(gameTimer);
    startGame(gameMode);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (!gameOver) {
        movePlayer();
        moveAliens();
        movePowerups();
        drawPlayer();
        drawAliens();
        drawBullets();
        drawPowerups();
        checkCollisions();

        if (aliens.length === 0) {
            wave++;
            initAliens();
            lives++;
            updateLives();
        }

        requestAnimationFrame(gameLoop);
    } else {
        clearInterval(gameTimer);
        document.getElementById('gameOverScreen').style.display = 'block';
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalTime').textContent = document.getElementById('timerValue').textContent;
    }
}

function init() {
    initAudio();
    resizeCanvas();
    document.getElementById('startScreen').style.display = 'block';
    document.getElementById('slowMode').addEventListener('click', () => startGame('slow'));
    document.getElementById('fastMode').addEventListener('click', () => startGame('fast'));
    document.getElementById('frenzyMode').addEventListener('click', () => startGame('frenzy'));
}

window.addEventListener('resize', resizeCanvas);
init();

