// Simple Pong game
// Player controls left paddle with mouse and arrow keys. Right paddle is computer AI.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreboardPlayer = document.getElementById('playerScore');
const scoreboardComputer = document.getElementById('computerScore');

const W = canvas.width;
const H = canvas.height;

// Game objects
const paddleWidth = 12;
const paddleHeight = 110;
const paddleInset = 14;

const player = {
  x: paddleInset,
  y: (H - paddleHeight) / 2,
  w: paddleWidth,
  h: paddleHeight,
  speed: 7,
  dy: 0
};

const computer = {
  x: W - paddleInset - paddleWidth,
  y: (H - paddleHeight) / 2,
  w: paddleWidth,
  h: paddleHeight,
  speed: 5 // AI max speed
};

const ballRadius = 9;
const ball = {
  x: W / 2,
  y: H / 2,
  r: ballRadius,
  speed: 6,
  vx: 0,
  vy: 0
};

let score = { player: 0, computer: 0 };
let paused = false;
let lastTime = 0;

// Keyboard state
const keys = { ArrowUp:false, ArrowDown:false };

// Initialize ball velocity with random direction toward last scorer or random
function resetBall(direction = null) {
  ball.x = W / 2;
  ball.y = H / 2;
  ball.speed = 6; // reset speed
  // random angle between -30 and 30 degrees converted to radians
  const angle = (Math.random() * 60 - 30) * Math.PI / 180;
  const dir = direction === 'left' ? -1 : (direction === 'right' ? 1 : (Math.random() < 0.5 ? -1 : 1));
  ball.vx = dir * ball.speed * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);
}

// Utility: clamp
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// Input: mouse movement over canvas moves player paddle
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseY = e.clientY - rect.top;
  player.y = clamp(mouseY - player.h / 2, 0, H - player.h);
});

// Keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowUp') keys.ArrowUp = true;
  if (e.code === 'ArrowDown') keys.ArrowDown = true;
  if (e.code === 'Space') {
    paused = !paused;
    if (!paused) {
      // resume loop
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowUp') keys.ArrowUp = false;
  if (e.code === 'ArrowDown') keys.ArrowDown = false;
});

// Collision detection between ball and a paddle (rectangle)
function paddleCollision(ball, paddle) {
  // AABB vs circle test
  const closestX = clamp(ball.x, paddle.x, paddle.x + paddle.w);
  const closestY = clamp(ball.y, paddle.y, paddle.y + paddle.h);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return (dx * dx + dy * dy) <= (ball.r * ball.r);
}

// When ball hits a paddle, reflect and adjust angle based on where it hit
function handlePaddleBounce(paddle) {
  // Compute relative intersection: -1 (top) to 1 (bottom)
  const relativeIntersect = ((ball.y - (paddle.y + paddle.h / 2)) / (paddle.h / 2));
  const maxBounceAngle = 75 * Math.PI / 180; // in radians
  const bounceAngle = relativeIntersect * maxBounceAngle;

  // Maintain ball speed, possibly slightly increase
  ball.speed = Math.min(ball.speed * 1.03, 14);

  // Direction depends on which paddle
  const dir = (paddle === player) ? 1 : -1;
  ball.vx = dir * ball.speed * Math.cos(bounceAngle);
  ball.vy = ball.speed * Math.sin(bounceAngle);

  // Nudge ball out to avoid sticking
  if (paddle === player) ball.x = paddle.x + paddle.w + ball.r + 0.1;
  else ball.x = paddle.x - ball.r - 0.1;
}

// Simple AI for the computer paddle: try to follow the ball with a max speed.
// Includes small deadzone to avoid jitter and makes it beatable.
function updateComputer(dt) {
  // Only react if ball is moving toward computer or near center
  const center = computer.y + computer.h / 2;
  const target = ball.y;
  const diff = target - center;

  // small deadzone based on paddle height
  const deadzone = 6;

  if (Math.abs(diff) > deadzone) {
    const move = Math.sign(diff) * computer.speed;
    computer.y = clamp(computer.y + move, 0, H - computer.h);
  }
}

// Update function
function update(dt) {
  if (paused) return;

  // player keyboard movement
  if (keys.ArrowUp) player.y = clamp(player.y - player.speed, 0, H - player.h);
  if (keys.ArrowDown) player.y = clamp(player.y + player.speed, 0, H - player.h);

  // update ball position
  ball.x += ball.vx;
  ball.y += ball.vy;

  // wall collisions (top and bottom)
  if (ball.y - ball.r <= 0) {
    ball.y = ball.r;
    ball.vy *= -1;
  } else if (ball.y + ball.r >= H) {
    ball.y = H - ball.r;
    ball.vy *= -1;
  }

  // paddle collisions
  if (ball.vx < 0 && paddleCollision(ball, player)) {
    handlePaddleBounce(player);
  } else if (ball.vx > 0 && paddleCollision(ball, computer)) {
    handlePaddleBounce(computer);
  }

  // scoring
  if (ball.x + ball.r < 0) {
    // computer scores
    score.computer++;
    scoreboardComputer.textContent = score.computer;
    resetBall('right'); // send it toward the previous scorer (computer)
  } else if (ball.x - ball.r > W) {
    // player scores
    score.player++;
    scoreboardPlayer.textContent = score.player;
    resetBall('left');
  }

  // update computer paddle
  updateComputer(dt);
}

// Draw everything
function draw() {
  // clear
  ctx.clearRect(0, 0, W, H);

  // middle dashed line
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  const dashH = 18;
  const dashGap = 12;
  const midX = W / 2 - 1;
  for (let y = 10; y < H; y += dashH + dashGap) {
    ctx.fillRect(midX, y, 2, dashH);
  }

  // paddles
  ctx.fillStyle = '#dffcf0';
  roundRect(ctx, player.x, player.y, player.w, player.h, 6, true);
  roundRect(ctx, computer.x, computer.y, computer.w, computer.h, 6, true);

  // ball
  ctx.beginPath();
  ctx.fillStyle = '#4ee1a2';
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  // subtle HUD: small text for speeds (optional)
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(8, H - 28, 160, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '12px Inter, Arial';
  ctx.fillText(`Ball: ${ball.speed.toFixed(2)} px/frame`, 12, H - 14);
}

// Rounded rectangle helper
function roundRect(ctx, x, y, w, h, r, fill) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  else ctx.stroke();
}

// Main loop
function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  update(dt);
  draw();
  if (!paused) requestAnimationFrame(loop);
}

// Start
resetBall();
scoreboardPlayer.textContent = score.player;
scoreboardComputer.textContent = score.computer;
lastTime = performance.now();
requestAnimationFrame(loop);

// Optional: make canvas resize-aware by scaling internal resolution while preserving coordinates.
// (Not required — canvas set to fixed internal resolution for predictable gameplay.)