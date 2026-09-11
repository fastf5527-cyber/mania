const AGE_KEY = "nightlife-game-age-verified";

const PARTNERS = {
  maya: { name: "Maya", emoji: "💃", vibe: "bold and direct" },
  sofia: { name: "Sofia", emoji: "🌹", vibe: "slow and sensual" },
  riley: { name: "Riley", emoji: "🔥", vibe: "playful and teasing" },
  alex: { name: "Alex", emoji: "😈", vibe: "dominant and confident" },
};

const state = {
  partner: null,
  venue: null,
  charm: 30,
  chemistry: 20,
  arousal: 10,
  scene: "intro",
  flags: {},
};

const ageGate = document.getElementById("age-gate");
const enterBtn = document.getElementById("enter-btn");
const leaveBtn = document.getElementById("leave-btn");
const statsBar = document.getElementById("stats-bar");
const partnerDisplay = document.getElementById("partner-display");
const partnerAvatar = document.getElementById("partner-avatar");
const partnerNameEl = document.getElementById("partner-name");
const sceneImage = document.getElementById("scene-image");
const sceneText = document.getElementById("scene-text");
const choicesEl = document.getElementById("choices");

function clamp(n) {
  return Math.max(0, Math.min(100, n));
}

function modStats({ charm = 0, chemistry = 0, arousal = 0 }) {
  state.charm = clamp(state.charm + charm);
  state.chemistry = clamp(state.chemistry + chemistry);
  state.arousal = clamp(state.arousal + arousal);
}

function updateStatsUI() {
  document.getElementById("charm-fill").style.width = state.charm + "%";
  document.getElementById("chem-fill").style.width = state.chemistry + "%";
  document.getElementById("arousal-fill").style.width = state.arousal + "%";
}

function setPartner(id) {
  state.partner = PARTNERS[id];
  partnerDisplay.classList.remove("hidden");
  partnerAvatar.textContent = state.partner.emoji;
  partnerNameEl.textContent = state.partner.name;
}

function p() {
  return state.partner ? state.partner.name : "them";
}

function partnerKey() {
  return Object.keys(PARTNERS).find((k) => PARTNERS[k].name === state.partner?.name);
}

function venueBg() {
  return "venue-" + state.venue;
}

function getMeetLine() {
  const lines = {
    maya: "You look like trouble. I like that.",
    sofia: "I've been hoping someone interesting would walk in tonight.",
    riley: "Okay — are you always this hot or is it the lighting?",
    alex: "Don't play games with me unless you plan to finish.",
  };
  return lines[partnerKey()] || "Hey.";
}

function climaxText(tier) {
  const name = p();
  if (tier === "perfect") {
    return `<p class="explicit">Everything peaks at once — bodies locked together, crying out ${name}'s name as waves of pleasure crash through you both.</p>
            <p>You collapse together, breathless, laughing. ${name} kisses your forehead. "That was… wow."</p>
            <p class="highlight">★ Perfect Night — Maximum chemistry achieved!</p>`;
  }
  if (tier === "good") {
    return `<p class="explicit">The climax hits hard — shuddering, breathless, satisfied. ${name} holds you close as you both come down.</p>
            <p>"Not bad at all," they grin. "We could do better though…"</p>`;
  }
  return `<p>The moment passes awkwardly. ${name} pulls back. "Maybe we rushed it."</p>
          <p class="explicit">Tip: build more Chemistry and Arousal before the finale. Flirt longer and choose bolder options.</p>`;
}

const SCENES = {
  intro: {
    emoji: "🌃",
    text: `<p>Welcome to <span class="highlight">Nightlife Simulator</span> — an adult dating and hookup game.</p>
           <p>Pick a venue, meet someone, flirt, and see how far the night goes. Every choice affects your <span class="highlight">Charm</span>, <span class="highlight">Chemistry</span>, and <span class="highlight">Arousal</span>.</p>
           <p>All characters are fictional adults (18+). Ready?</p>`,
    choices: [{ label: "Start the night →", next: "venue", bold: true }],
  },

  venue: {
    emoji: "🍸",
    text: `<p>Where do you want to go tonight?</p>`,
    choices: [
      { label: "Neon Club — loud music, dark corners", effect: () => { state.venue = "club"; }, next: "pick_partner" },
      { label: "Velvet Lounge — cocktails and candlelight", effect: () => { state.venue = "bar"; }, next: "pick_partner" },
      { label: "Rooftop Hotel Bar — upscale and private", effect: () => { state.venue = "hotel"; }, next: "pick_partner" },
    ],
  },

  pick_partner: {
    emoji: () => (state.venue === "club" ? "🪩" : state.venue === "bar" ? "🥃" : "🏙️"),
    text: () => {
      const v =
        state.venue === "club"
          ? "The bass pulses through the crowd."
          : state.venue === "bar"
            ? "Jazz hums softly. Eyes meet across the bar."
            : "City lights glitter below. Someone catches your gaze.";
      return `<p>${v}</p><p>Who catches your eye?</p>`;
    },
    choices: [
      { label: "💃 Maya — confident, moves close fast", effect: () => setPartner("maya"), next: "meet" },
      { label: "🌹 Sofia — elegant, takes her time", effect: () => setPartner("sofia"), next: "meet" },
      { label: "🔥 Riley — flirty, full of banter", effect: () => setPartner("riley"), next: "meet" },
      { label: "😈 Alex — intense stare, says little", effect: () => setPartner("alex"), next: "meet" },
    ],
  },

  meet: {
    emoji: () => state.partner.emoji,
    bg: venueBg,
    text: () =>
      `<p><span class="highlight">${p()}</span> slides into your space. "${getMeetLine()}"</p>
       <p>The air between you feels charged. What do you do?</p>`,
    choices: [
      { label: "Buy them a drink and keep it smooth", effect: () => modStats({ charm: 12, chemistry: 8 }), next: "flirt_1" },
      { label: "Compliment their body directly", effect: () => modStats({ charm: 5, chemistry: 15, arousal: 10 }), next: "flirt_1" },
      { label: "Crack a joke to break the ice", effect: () => modStats({ charm: 15, chemistry: 5 }), next: "flirt_1" },
      { label: "Stay quiet and hold eye contact", effect: () => modStats({ charm: 8, chemistry: 12, arousal: 5 }), next: "flirt_1" },
    ],
  },

  flirt_1: {
    emoji: () => state.partner.emoji,
    bg: venueBg,
    text: () =>
      `<p>Conversation flows. ${p()} leans in — you feel their breath on your neck.</p>
       <p>"I've been watching you all night," they whisper. "Tell me what you want."</p>`,
    choices: [
      { label: "\"I want to take you somewhere private.\"", effect: () => modStats({ chemistry: 15, arousal: 12 }), next: "flirt_2" },
      { label: "\"Kiss me right here.\"", effect: () => modStats({ chemistry: 10, arousal: 18 }), next: "flirt_2" },
      { label: "\"Let's dance first.\"", effect: () => modStats({ charm: 10, chemistry: 8, arousal: 8 }), next: "flirt_2" },
      { label: "\"I'm not sure yet…\"", effect: () => modStats({ chemistry: -5 }), next: "slow_burn" },
    ],
  },

  slow_burn: {
    emoji: "💬",
    bg: venueBg,
    text: () =>
      state.chemistry >= 25
        ? `<p>${p()} smiles patiently. "No rush. I like someone who knows what they want."</p>
           <p>They trace a finger along your arm. The tension rebuilds.</p>`
        : `<p>${p()} looks away, losing interest. "Maybe another time."</p>
           <p class="explicit">The night fizzles out before it starts.</p>`,
    choices: () =>
      state.chemistry >= 25
        ? [{ label: "Re-engage — pull them close", effect: () => modStats({ chemistry: 12, arousal: 10 }), next: "flirt_2", bold: true }]
        : [{ label: "Play again", restart: true }],
  },

  flirt_2: {
    emoji: "💋",
    bg: venueBg,
    text: () =>
      `<p>You and ${p()} find a darker corner. Lips meet — slow at first, then hungry.</p>
       <p class="explicit">Their hands roam your waist and thighs. You pull them closer, bodies grinding to the rhythm.</p>
       <p>"My place is five minutes away," ${p()} breathes. "Unless you want to stay here…"</p>`,
    choices: [
      { label: "Go to their place", effect: () => { state.flags.private = true; modStats({ arousal: 15, chemistry: 10 }); }, next: "private_1" },
      { label: "Find a secluded spot here", effect: () => { state.flags.public = true; modStats({ arousal: 20, chemistry: 5 }); }, next: "public_1" },
      { label: "Tease more — make them wait", effect: () => modStats({ charm: 10, arousal: 12 }), next: "tease" },
    ],
  },

  tease: {
    emoji: "😏",
    bg: venueBg,
    text: () =>
      `<p>You pull back just enough to drive ${p()} wild. They bite their lip, pupils dilated.</p>
       <p>"You're evil," they laugh. "Fine — my place. Now."</p>`,
    choices: [
      { label: "Follow them out", effect: () => { state.flags.private = true; modStats({ arousal: 18 }); }, next: "private_1", bold: true },
    ],
  },

  public_1: {
    emoji: "🌙",
    bg: "venue-intimate",
    text: () =>
      `<p>You slip into a shadowed alcove. ${p()} presses you against the wall.</p>
       <p class="explicit">Clothes loosen. Hands explore everywhere — chest, hips, between your legs. Moans are muffled against skin.</p>
       <p>The risk of being caught only makes it hotter.</p>`,
    choices: [
      { label: "Keep going — don't stop", effect: () => modStats({ arousal: 25 }), next: "climax_check" },
      { label: "Move somewhere more private", effect: () => modStats({ chemistry: 8 }), next: "private_1" },
    ],
  },

  private_1: {
    emoji: "🛏️",
    bg: "venue-intimate",
    text: () =>
      `<p>The door shuts. ${p()} pushes you onto the bed without hesitation.</p>
       <p class="explicit">Clothes hit the floor. Skin on skin. ${p()} kisses down your body — neck, chest, stomach — taking their time.</p>
       <p>"Tell me what feels good," they murmur against your skin.</p>`,
    choices: [
      { label: "Guide their hands — show them exactly", effect: () => modStats({ arousal: 20, chemistry: 12 }), next: "private_2" },
      { label: "Take control — flip them over", effect: () => modStats({ arousal: 22, charm: 8 }), next: "private_2" },
      { label: "Let them lead completely", effect: () => modStats({ arousal: 18, chemistry: 15 }), next: "private_2" },
      { label: "Oral first — go down on them", effect: () => modStats({ arousal: 25, chemistry: 10 }), next: "private_2", bold: true },
    ],
  },

  private_2: {
    emoji: "🔥",
    bg: "venue-intimate",
    text: () =>
      `<p>The room fills with gasps and whispered names. ${p()} is fully lost in the moment.</p>
       <p class="explicit">Positions shift — on top, from behind, tangled together. Sweat, heat, rhythm building faster and faster.</p>
       <p>You're both on the edge. One more move and it's over.</p>`,
    choices: [
      { label: "Slow and deep — make it last", effect: () => modStats({ arousal: 15, chemistry: 10 }), next: "climax_check" },
      { label: "Hard and fast — finish strong", effect: () => modStats({ arousal: 30 }), next: "climax_check", bold: true },
      { label: "Switch — try something new together", effect: () => modStats({ arousal: 20, charm: 10 }), next: "climax_check" },
    ],
  },

  climax_check: {
    emoji: "💥",
    bg: "venue-intimate",
    text: () => {
      if (state.arousal >= 70 && state.chemistry >= 50) return climaxText("perfect");
      if (state.arousal >= 50) return climaxText("good");
      return climaxText("weak");
    },
    choices: () => {
      if (state.arousal >= 70 && state.chemistry >= 50) {
        return [{ label: "Play again — new night, new partner", restart: true, bold: true }];
      }
      if (state.arousal >= 50) {
        return [
          { label: "Stay the night together", next: "ending_good" },
          { label: "Play again", restart: true },
        ];
      }
      return [{ label: "Try again", restart: true, bold: true }];
    },
  },

  ending_good: {
    emoji: "☀️",
    bg: "venue-hotel",
    text: () =>
      `<p>Morning light filters through the curtains. ${p()} is still beside you, smiling sleepily.</p>
       <p>"Last night was incredible," they say, tracing circles on your chest. "Same time next week?"</p>
       <p class="highlight">Great ending — Chemistry ${state.chemistry}% · Arousal ${state.arousal}%</p>`,
    choices: [{ label: "Start a new game", restart: true, bold: true }],
  },
};

function resolve(val) {
  return typeof val === "function" ? val() : val;
}

function renderScene(id) {
  const scene = SCENES[id];
  if (!scene) return;

  state.scene = id;
  const hideStats = ["intro", "venue", "pick_partner"].includes(id);
  statsBar.classList.toggle("hidden", hideStats);

  const bg = resolve(scene.bg) || "";
  sceneImage.className = "scene-image " + bg;
  sceneImage.textContent = resolve(scene.emoji) || "🌙";
  sceneText.innerHTML = resolve(scene.text);

  choicesEl.innerHTML = "";
  resolve(scene.choices).forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn" + (choice.bold ? " bold" : "") + (choice.restart ? " restart" : "");
    btn.textContent = choice.label;
    btn.addEventListener("click", () => {
      if (choice.effect) choice.effect();
      if (choice.restart) restart();
      else if (choice.next) renderScene(choice.next);
    });
    choicesEl.appendChild(btn);
  });

  updateStatsUI();
}

function restart() {
  state.partner = null;
  state.venue = null;
  state.charm = 30;
  state.chemistry = 20;
  state.arousal = 10;
  state.flags = {};
  partnerDisplay.classList.add("hidden");
  renderScene("intro");
}

function initAgeGate() {
  if (localStorage.getItem(AGE_KEY) === "true") {
    ageGate.classList.add("hidden");
    return;
  }
  enterBtn.addEventListener("click", () => {
    localStorage.setItem(AGE_KEY, "true");
    ageGate.classList.add("hidden");
  });
  leaveBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

initAgeGate();
renderScene("intro");
