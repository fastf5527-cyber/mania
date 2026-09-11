const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const hint = document.getElementById("hint");
const modeLabel = document.getElementById("mode-label");
const actionBars = document.getElementById("action-bars");
const controlsHelp = document.getElementById("controls-help");
const pleasureYouEl = document.getElementById("pleasure-you");
const pleasurePartnerEl = document.getElementById("pleasure-partner");
const rhythmBarEl = document.getElementById("rhythm-bar");
const videoPanel = document.getElementById("video-panel");
const videoFrame = document.getElementById("video-frame");
const videoList = document.getElementById("video-list");

const W = canvas.width;
const H = canvas.height;

const MODE = { EXPLORE: "explore", INTERACT: "interact", CLIMAX: "climax", END: "end" };

const VIDEO_OPTIONS = [
  { id: "2025-9-8-no.-36-dvd", label: "Playboy 2025" },
  { id: "playmate-video-calendar-1999_202609", label: "Playmate Calendar" },
  { id: "tiffany-fallon-compilation", label: "Tiffany Fallon" },
  { id: "5369y-480p", label: "Jennifer Walcott" },
  { id: "a-series-of-liz-ocean-adult-films", label: "Liz Ocean" },
  { id: "Jism22012", label: "Jism 2" },
  { id: "RaginiMMS2", label: "Ragini MMS 2" },
  { id: "kama-sutra-a-tale-of-love-1996_202605", label: "Kama Sutra" },
];

const SKIN_F = "#e8b090";
const SKIN_F_SHADOW = "#c9856a";
const SKIN_M = "#d4a574";
const SKIN_M_SHADOW = "#b8895a";
const HAIR = "#2a1810";
const NIPPLE = "#c06070";
const LIP = "#d05070";

const keys = {};
let mode = MODE.EXPLORE;
let lastTime = 0;
let animPhase = 0;
let thrustPhase = 0;
let climaxTimer = 0;
let zoom = 1;
let videoOpen = false;

const player = { x: 120, y: 380, r: 18, speed: 180, angle: 0 };
const partner = { x: 620, y: 300, r: 20, name: "Maya", idle: 0 };

const sim = {
  position: 0,
  pace: 0.5,
  rhythm: 0,
  pleasureYou: 0,
  pleasurePartner: 0,
  combo: 0,
  lastHit: 0,
  thrustPower: 0,
};

const POSITIONS = [
  { name: "Missionary", label: "Face to face" },
  { name: "From Behind", label: "From behind" },
  { name: "On Top", label: "Riding" },
  { name: "Spooning", label: "Side angle" },
];

// --- Video panel ---
function initVideoPanel() {
  VIDEO_OPTIONS.forEach((v, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "video-chip" + (i === 0 ? " active" : "");
    chip.textContent = v.label;
    chip.addEventListener("click", () => {
      document.querySelectorAll(".video-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      videoFrame.src = `https://archive.org/embed/${v.id}`;
    });
    videoList.appendChild(chip);
  });
  videoFrame.src = `https://archive.org/embed/${VIDEO_OPTIONS[0].id}`;

  document.getElementById("video-toggle").addEventListener("click", toggleVideo);
  document.getElementById("video-close").addEventListener("click", () => setVideoPanel(false));
}

function toggleVideo() {
  setVideoPanel(!videoOpen);
}

function setVideoPanel(open) {
  videoOpen = open;
  videoPanel.classList.toggle("hidden", !open);
}

// --- Age gate ---
document.getElementById("enter-btn").addEventListener("click", () => {
  document.getElementById("age-gate").classList.add("hidden");
});

// --- Input ---
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "KeyV") toggleVideo();
  if (e.code === "KeyE" && mode === MODE.EXPLORE) tryStartInteract();
  if (e.code === "Escape") {
    if (videoOpen) setVideoPanel(false);
    else if (mode === MODE.INTERACT || mode === MODE.CLIMAX) exitInteract();
  }
  if (mode === MODE.INTERACT) {
    if (e.code === "KeyQ") sim.position = (sim.position + POSITIONS.length - 1) % POSITIONS.length;
    if (e.code === "KeyE") sim.position = (sim.position + 1) % POSITIONS.length;
    if (e.code === "ArrowUp") sim.pace = Math.min(1, sim.pace + 0.08);
    if (e.code === "ArrowDown") sim.pace = Math.max(0.15, sim.pace - 0.08);
    if (e.code === "Equal" || e.code === "NumpadAdd") zoom = Math.min(1.8, zoom + 0.1);
    if (e.code === "Minus" || e.code === "NumpadSubtract") zoom = Math.max(0.7, zoom - 0.1);
    if (e.code === "Space") { e.preventDefault(); registerThrust(); }
  }
  if (mode === MODE.END && e.code === "KeyR") restart();
});

window.addEventListener("keyup", (e) => { keys[e.code] = false; });
canvas.addEventListener("mousedown", () => { if (mode === MODE.INTERACT) registerThrust(); });
canvas.addEventListener("wheel", (e) => {
  if (mode === MODE.INTERACT || mode === MODE.CLIMAX) {
    e.preventDefault();
    zoom = Math.max(0.7, Math.min(1.8, zoom - e.deltaY * 0.001));
  }
}, { passive: false });

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function tryStartInteract() {
  if (dist(player, partner) < 90) startInteract();
}

function startInteract() {
  mode = MODE.INTERACT;
  sim.position = 0;
  sim.pace = 0.5;
  sim.rhythm = 0;
  sim.pleasureYou = 10;
  sim.pleasurePartner = 10;
  sim.combo = 0;
  sim.thrustPower = 0;
  thrustPhase = 0;
  zoom = 1.15;
  updateUI();
}

function exitInteract() {
  mode = MODE.EXPLORE;
  zoom = 1;
  updateUI();
}

function restart() {
  mode = MODE.EXPLORE;
  player.x = 120;
  player.y = 380;
  sim.pleasureYou = 0;
  sim.pleasurePartner = 0;
  climaxTimer = 0;
  zoom = 1;
  updateUI();
}

function registerThrust() {
  const now = performance.now();
  const timing = now - sim.lastHit;
  sim.lastHit = now;

  let quality = 0.6;
  if (timing > 180 && timing < 520) quality = 1.0;
  else if (timing > 120 && timing < 650) quality = 0.75;

  sim.rhythm = Math.min(100, sim.rhythm + quality * 18);
  sim.thrustPower = 1;
  sim.combo = Math.min(20, sim.combo + 1);

  const gain = (0.4 + sim.pace * 0.6) * quality * (1 + sim.combo * 0.03);
  sim.pleasureYou = Math.min(100, sim.pleasureYou + gain * 1.1);
  sim.pleasurePartner = Math.min(100, sim.pleasurePartner + gain * 0.95);

  if (sim.pleasureYou >= 100 && sim.pleasurePartner >= 85) {
    mode = MODE.CLIMAX;
    climaxTimer = 0;
  }
}

function updateUI() {
  const labels = { [MODE.EXPLORE]: "Explore", [MODE.INTERACT]: "Intimate", [MODE.CLIMAX]: "Climax", [MODE.END]: "Finished" };
  modeLabel.textContent = labels[mode] || "Explore";

  const interacting = mode === MODE.INTERACT || mode === MODE.CLIMAX;
  actionBars.classList.toggle("hidden", !interacting);
  controlsHelp.classList.toggle("hidden", !interacting);

  if (mode === MODE.EXPLORE) {
    hint.textContent = dist(player, partner) < 90
      ? "Press E to start · V — open video panel"
      : "WASD — move · Walk to Maya · V — real videos";
  } else if (mode === MODE.INTERACT) {
    hint.textContent = `${POSITIONS[sim.position].name} · SPACE/Click thrust · Q/E position · +/- zoom · V video`;
  } else if (mode === MODE.CLIMAX) {
    hint.textContent = "Climax…";
  } else {
    hint.textContent = "R — replay · V — watch videos";
  }

  pleasureYouEl.style.width = sim.pleasureYou + "%";
  pleasurePartnerEl.style.width = sim.pleasurePartner + "%";
  rhythmBarEl.style.width = sim.rhythm + "%";
}

function updateExplore(dt) {
  let dx = 0, dy = 0;
  if (keys.ArrowUp || keys.KeyW) dy -= 1;
  if (keys.ArrowDown || keys.KeyS) dy += 1;
  if (keys.ArrowLeft || keys.KeyA) dx -= 1;
  if (keys.ArrowRight || keys.KeyD) dx += 1;

  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1;
    dx = (dx / len) * player.speed * dt;
    dy = (dy / len) * player.speed * dt;
    player.angle = Math.atan2(dy, dx);
  }

  player.x = Math.max(40, Math.min(W - 40, player.x + dx));
  player.y = Math.max(60, Math.min(H - 40, player.y + dy));
  partner.idle += dt * 2;
}

function updateInteract(dt) {
  animPhase += dt * (2 + sim.pace * 4);
  sim.rhythm = Math.max(0, sim.rhythm - dt * 22);
  sim.thrustPower = Math.max(0, sim.thrustPower - dt * 5);
  if (sim.thrustPower > 0.1) thrustPhase += dt * (8 + sim.pace * 12);
  sim.pleasureYou = Math.min(100, sim.pleasureYou + dt * sim.pace * 1.5);
  sim.pleasurePartner = Math.min(100, sim.pleasurePartner + dt * sim.pace * 1.2);
}

function updateClimax(dt) {
  climaxTimer += dt;
  animPhase += dt * 12;
  thrustPhase += dt * 20;
  if (climaxTimer > 4) { mode = MODE.END; updateUI(); }
}

function update(dt) {
  if (mode === MODE.EXPLORE) updateExplore(dt);
  else if (mode === MODE.INTERACT) updateInteract(dt);
  else if (mode === MODE.CLIMAX) updateClimax(dt);
  updateUI();
}

// ========== ANATOMY DRAWING ==========

function drawBreasts(cx, cy, size, bounce, angle, visible) {
  if (!visible) return;
  const sep = size * 0.55;
  const by = cy + bounce;
  [-1, 1].forEach((side) => {
    const bx = cx + side * sep;
    const grad = ctx.createRadialGradient(bx - size * 0.15, by - size * 0.2, 0, bx, by, size);
    grad.addColorStop(0, SKIN_F);
    grad.addColorStop(0.7, SKIN_F_SHADOW);
    grad.addColorStop(1, SKIN_F_SHADOW);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(bx, by, size * 0.85, size * (0.95 + bounce * 0.02), angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = NIPPLE;
    ctx.beginPath();
    ctx.arc(bx, by + size * 0.15, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFemaleTorso(x, y, scale, rot, bounce, breastVisible, showLower) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const s = scale;

  // Hips / lower body
  if (showLower) {
    const hipGrad = ctx.createLinearGradient(0, s * 10, 0, s * 80);
    hipGrad.addColorStop(0, SKIN_F);
    hipGrad.addColorStop(1, SKIN_F_SHADOW);
    ctx.fillStyle = hipGrad;
    ctx.beginPath();
    ctx.moveTo(-s * 38, s * 5);
    ctx.bezierCurveTo(-s * 55, s * 40, -s * 50, s * 90, -s * 30, s * 110);
    ctx.lineTo(s * 30, s * 110);
    ctx.bezierCurveTo(s * 50, s * 90, s * 55, s * 40, s * 38, s * 5);
    ctx.closePath();
    ctx.fill();

    // Thighs
    ctx.fillStyle = SKIN_F_SHADOW;
    ctx.beginPath();
    ctx.ellipse(-s * 22, s * 120, s * 18, s * 45, 0.1, 0, Math.PI * 2);
    ctx.ellipse(s * 22, s * 120, s * 18, s * 45, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Stylized lower anatomy
    ctx.fillStyle = "#b06070";
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(0, s * 55, s * 12, s * 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Waist / torso
  ctx.fillStyle = SKIN_F;
  ctx.beginPath();
  ctx.moveTo(-s * 32, -s * 20);
  ctx.quadraticCurveTo(-s * 36, s * 15, -s * 30, s * 10);
  ctx.lineTo(s * 30, s * 10);
  ctx.quadraticCurveTo(s * 36, s * 15, s * 32, -s * 20);
  ctx.closePath();
  ctx.fill();

  drawBreasts(0, -s * 18, s * 22, bounce, 0, breastVisible);
  ctx.restore();
}

function drawFemaleHead(x, y, scale, expression) {
  const s = scale;
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.ellipse(x, y - s * 8, s * 26, s * 30, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = SKIN_F;
  ctx.beginPath();
  ctx.arc(x, y, s * 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(x - s * 9, y - s * 2, s * 6, s * 8, 0, 0, Math.PI * 2);
  ctx.ellipse(x + s * 9, y - s * 2, s * 6, s * 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a2820";
  ctx.beginPath();
  ctx.arc(x - s * 9, y - s * 2, s * 4, 0, Math.PI * 2);
  ctx.arc(x + s * 9, y - s * 2, s * 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = LIP;
  ctx.beginPath();
  ctx.ellipse(x, y + s * 12, s * 8, s * (expression === "o" ? 6 : 3), 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMaleTorso(x, y, scale, rot, thrust) {
  ctx.save();
  ctx.translate(x + thrust, y);
  ctx.rotate(rot);
  const s = scale;

  ctx.fillStyle = SKIN_M;
  ctx.fillRect(-s * 40, -s * 30, s * 80, s * 55);

  ctx.fillStyle = SKIN_M_SHADOW;
  ctx.beginPath();
  ctx.ellipse(0, s * 30, s * 14, s * 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arms
  ctx.fillStyle = SKIN_M;
  ctx.fillRect(-s * 55, -s * 20, s * 18, s * 50);
  ctx.fillRect(s * 38, -s * 20, s * 18, s * 50);

  // Legs
  ctx.fillStyle = SKIN_M_SHADOW;
  ctx.fillRect(-s * 25, s * 25, s * 18, s * 60);
  ctx.fillRect(s * 8, s * 25, s * 18, s * 60);

  ctx.restore();
}

function drawMaleHead(x, y, scale, thrust) {
  const s = scale;
  ctx.fillStyle = SKIN_M;
  ctx.beginPath();
  ctx.arc(x + thrust, y, s * 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.arc(x + thrust, y - s * 5, s * 22, Math.PI, Math.PI * 2);
  ctx.fill();
}

function drawButt(x, y, scale, bounce) {
  const s = scale;
  ctx.fillStyle = SKIN_F_SHADOW;
  ctx.beginPath();
  ctx.ellipse(x - s * 16, y + bounce, s * 20, s * 26, -0.2, 0, Math.PI * 2);
  ctx.ellipse(x + s * 16, y + bounce, s * 20, s * 26, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a07060";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 10);
  ctx.lineTo(x, y + s * 20);
  ctx.stroke();
}

function drawExploreFemale(x, y, idle) {
  const bob = Math.sin(idle) * 3;
  ctx.save();
  ctx.translate(x, y + bob);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 28, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body silhouette top-down with curves
  ctx.fillStyle = "#e91e63";
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f48fb1";
  ctx.beginPath();
  ctx.ellipse(-8, -4, 7, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(8, -4, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = SKIN_F;
  ctx.beginPath();
  ctx.arc(0, -28, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.arc(0, -32, 14, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("Maya", 0, 42);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawExploreMale(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#42a5f5";
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = SKIN_M;
  ctx.beginPath();
  ctx.arc(0, -24, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(Math.cos(angle) * 16, Math.sin(angle) * 16);
  ctx.stroke();
  ctx.restore();
}

// ========== SCENES ==========

function drawBedroomBg() {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1a0a1e");
  bg.addColorStop(0.5, "#120818");
  bg.addColorStop(1, "#0a0510");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#2a1535";
  ctx.fillRect(0, H * 0.52, W, H * 0.48);
  ctx.fillStyle = "#4a2558";
  ctx.fillRect(30, H * 0.5, W - 60, 30);
  ctx.fillStyle = "#f5e8f5";
  ctx.fillRect(50, H * 0.56, W - 100, H * 0.34);

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(160, H * 0.6, 75, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Warm lamp
  const lamp = ctx.createRadialGradient(W * 0.8, H * 0.2, 0, W * 0.8, H * 0.2, 200);
  lamp.addColorStop(0, "rgba(255,160,100,0.12)");
  lamp.addColorStop(1, "rgba(255,160,100,0)");
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, W, H);
}

function drawExplore() {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, "#1a1520");
  grd.addColorStop(1, "#0d0a10");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#2a1830";
  ctx.beginPath();
  ctx.ellipse(480, 360, 280, 120, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3d2048";
  ctx.fillRect(520, 180, 220, 160);
  ctx.fillStyle = "#e8d0e8";
  ctx.fillRect(540, 220, 180, 100);

  drawExploreFemale(partner.x, partner.y, partner.idle);
  drawExploreMale(player.x, player.y, player.angle);

  if (dist(player, partner) < 90) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText("Press E — start simulation", (player.x + partner.x) / 2, Math.min(player.y, partner.y) - 40);
    ctx.textAlign = "left";
  }
}

function drawMissionary(thrust, bounce, breastBounce) {
  const expr = sim.thrustPower > 0.3 ? "o" : "normal";
  drawFemaleHead(-130, -80 + bounce, 1, expr);
  drawFemaleTorso(-70, -20 + bounce, 1, -0.15, breastBounce, true, true);
  drawMaleHead(90 + thrust, -90 + bounce, 1, thrust);
  drawMaleTorso(50 + thrust, -30 + bounce, 1, 0.2, 0);
}

function drawFromBehind(thrust, bounce, breastBounce) {
  drawFemaleHead(-140, -60 + bounce, 0.95, "normal");
  drawButt(-60, 30 + bounce, 1, breastBounce * 0.5);
  drawFemaleTorso(-75, 0 + bounce, 1, 0.05, 0, false, true);
  drawFemaleTorso(-70, -40 + bounce, 0.9, 0.1, breastBounce, true, false);
  drawMaleHead(100 + thrust, -70 + bounce, 1, thrust);
  drawMaleTorso(55 + thrust, -20 + bounce, 1, -0.25, 0);
}

function drawOnTop(thrust, bounce, breastBounce) {
  drawMaleHead(-80, 20 + bounce, 1, 0);
  drawMaleTorso(-30, 50 + bounce, 0.9, 0.05, 0);
  drawFemaleHead(40 - thrust, -100 + bounce, 1, sim.thrustPower > 0.3 ? "o" : "normal");
  drawFemaleTorso(10 - thrust, -30 + bounce, 1.05, 0.1, breastBounce, true, true);
}

function drawSpooning(thrust, bounce, breastBounce) {
  drawMaleHead(-120, 10 + bounce, 0.95, 0);
  drawMaleTorso(-70 + thrust * 0.5, 40 + bounce, 0.85, 0, 0);
  drawFemaleHead(-30, -30 + bounce, 1, "normal");
  drawFemaleTorso(20 + thrust, 10 + bounce, 1, 0.35, breastBounce, true, true);
}

function drawInteract() {
  drawBedroomBg();

  const thrust = Math.sin(thrustPhase) * sim.thrustPower * (14 + sim.pace * 20);
  const bounce = Math.sin(animPhase) * 3;
  const breastBounce = Math.sin(thrustPhase * 1.5) * sim.thrustPower * (4 + sim.pace * 6);

  ctx.save();
  ctx.translate(W / 2, H * 0.58);
  ctx.scale(zoom, zoom);

  const pos = sim.position;
  if (pos === 0) drawMissionary(thrust, bounce, breastBounce);
  else if (pos === 1) drawFromBehind(thrust, bounce, breastBounce);
  else if (pos === 2) drawOnTop(thrust, bounce, breastBounce);
  else drawSpooning(thrust, bounce, breastBounce);

  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "13px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(`${POSITIONS[pos].name} · Zoom ${Math.round(zoom * 100)}%`, W / 2, 28);
  ctx.textAlign = "left";

  if (sim.thrustPower > 0.2) {
    ctx.strokeStyle = `rgba(233,30,99,${sim.thrustPower * 0.5})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 100 + sim.thrustPower * 50, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Sweat / heat particles
  if (sim.pace > 0.5 && sim.thrustPower > 0.1) {
    ctx.fillStyle = `rgba(255,200,200,${sim.thrustPower * 0.3})`;
    for (let i = 0; i < 5; i++) {
      const px = W / 2 + Math.sin(animPhase * 3 + i) * 80;
      const py = H * 0.4 + Math.cos(animPhase * 2 + i) * 40;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawClimax() {
  drawInteract();
  const alpha = Math.min(1, climaxTimer * 0.8) * (0.4 + Math.sin(climaxTimer * 10) * 0.3);
  ctx.fillStyle = `rgba(233,30,99,${alpha * 0.3})`;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 32px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("Orgasm", W / 2, H / 2 - 10);
  ctx.font = "14px Segoe UI";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("Press V to watch video · R to replay", W / 2, H / 2 + 25);
  ctx.textAlign = "left";
}

function drawEnd() {
  ctx.fillStyle = "#0f0a14";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#e91e63";
  ctx.font = "bold 24px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText("Simulation Complete", W / 2, H / 2 - 40);
  ctx.fillStyle = "#aaa";
  ctx.font = "15px Segoe UI";
  ctx.fillText(`You: ${Math.round(sim.pleasureYou)}%  ·  Maya: ${Math.round(sim.pleasurePartner)}%`, W / 2, H / 2 - 5);
  ctx.fillStyle = "#666";
  ctx.font = "13px Segoe UI";
  ctx.fillText("R — play again  ·  V — watch real videos", W / 2, H / 2 + 30);
  ctx.textAlign = "left";
}

function render() {
  if (mode === MODE.EXPLORE) drawExplore();
  else if (mode === MODE.INTERACT) drawInteract();
  else if (mode === MODE.CLIMAX) drawClimax();
  else drawEnd();
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

initVideoPanel();
requestAnimationFrame(loop);
