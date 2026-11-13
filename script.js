/* ============================================================
   SWARA'S BIRTHDAY CARD — script.js
   Vanilla JS only. No frameworks, no external libraries.
   
   Sections:
   1. Underline draw animation (SVG path)
   2. Gift envelopes — tap to open / close
   3. Candles — tap to blow out + blow-all button
   4. Paper confetti burst (after all candles out)
   5. Notebook — scroll-triggered line-by-line reveal
   6. Memories scrapbook — polaroid flip cards
   7. Interactive floating balloons & pop bursts
   8. Reduced-motion guard
   ============================================================ */

'use strict';

/* ============================================================
   UTILITY — reduced motion check
   ============================================================ */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   1. DOODLE UNDERLINE — draws itself on load
   ============================================================ */
function initUnderline() {
  const path = document.getElementById('underline-path');
  if (!path) return;

  if (prefersReducedMotion) {
    // Skip animation — just show it
    path.style.strokeDashoffset = '0';
    return;
  }

  // Measure the path length in case viewBox changes
  const len = path.getTotalLength ? path.getTotalLength() : 400;
  path.style.strokeDasharray  = len;
  path.style.strokeDashoffset = len;

  // Trigger draw animation
  // Using requestAnimationFrame to ensure the browser has painted the initial state
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      path.classList.add('draw');
    });
  });
}

/* ============================================================
   2. GIFT ENVELOPES
   ============================================================ */
function initGifts() {
  const cards = document.querySelectorAll('.envelope-card');

  cards.forEach(card => {
    const closedEl = card.querySelector('.env-closed');
    const noteEl   = card.querySelector('.env-note');
    const closeBtn = card.querySelector('.note-close');

    if (!closedEl || !noteEl) return;

    function openCard() {
      card.dataset.open = 'true';
      noteEl.classList.add('is-open');
      noteEl.removeAttribute('aria-hidden');
      closedEl.setAttribute('aria-hidden', 'true');
      // Focus close button for accessibility
      if (closeBtn) closeBtn.focus();
    }

    function closeCard() {
      card.dataset.open = 'false';
      noteEl.classList.remove('is-open');
      noteEl.setAttribute('aria-hidden', 'true');
      closedEl.removeAttribute('aria-hidden');
      card.focus();
    }

    // Tap / click on the closed envelope
    closedEl.addEventListener('click', () => {
      if (card.dataset.open !== 'true') openCard();
    });

    // Keyboard: Enter / Space on closed envelope
    closedEl.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && card.dataset.open !== 'true') {
        e.preventDefault();
        openCard();
      }
    });

    // Make closed part focusable
    closedEl.setAttribute('tabindex', '0');
    closedEl.setAttribute('role', 'button');
    closedEl.setAttribute('aria-label', `Open gift ${card.querySelector('.env-num')?.textContent || ''}`);

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        closeCard();
      });
    }

    // Escape key closes note
    card.addEventListener('keydown', e => {
      if (e.key === 'Escape' && card.dataset.open === 'true') {
        closeCard();
      }
    });
  });
}

/* ============================================================
   3. CANDLES
   ============================================================ */
let allBlownOut = false;

function initCandles() {
  const candles     = document.querySelectorAll('.candle');
  const blowAllBtn  = document.getElementById('blow-all-btn');
  const relightBtn  = document.getElementById('relight-btn');
  const wishCard    = document.getElementById('wish-card');

  if (!candles.length) return;

  /* Blow out a single candle */
  function blowCandle(candle) {
    if (candle.dataset.lit === 'false') return; // already out
    candle.dataset.lit = 'false';
    candle.setAttribute('aria-label', candle.getAttribute('aria-label').replace('tap to blow out', 'blown out'));

    // Check if ALL are out
    checkAllOut();
  }

  /* Check if every candle is blown out */
  function checkAllOut() {
    const remaining = [...candles].filter(c => c.dataset.lit === 'true');
    if (remaining.length === 0 && !allBlownOut) {
      allBlownOut = true;
      onAllBlownOut();
    }
  }

  /* Called once all candles are out */
  function onAllBlownOut() {
    if (blowAllBtn) blowAllBtn.style.display = 'none';
    if (relightBtn) relightBtn.style.display = 'inline-block';

    // Show wish card
    if (wishCard) {
      wishCard.removeAttribute('hidden');
    }

    // Launch confetti (unless reduced motion)
    if (!prefersReducedMotion) {
      launchConfetti();
    }

    // Start birthday song when all candles are blown out
    const song = document.getElementById('birthday-song');
    if (song) {
      song.currentTime = 0;
      const playPromise = song.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked by browser — will play after next user interaction
        });
      }
    }

    // Start cinematic projector experience (video + projector animation)
    startCinematicExperience();
  }

  /* Relight all candles */
  function relightAll() {
    // Stop birthday song immediately when candles are relit
    const song = document.getElementById('birthday-song');
    if (song) {
      song.pause();
      song.currentTime = 0;
    }

    // Stop cinematic experience and reset video
    stopCinematicExperience();

    allBlownOut = false;
    candles.forEach(c => {
      c.dataset.lit = 'true';
      c.setAttribute('aria-label', c.getAttribute('aria-label').replace('blown out', 'tap to blow out'));
    });

    if (blowAllBtn) blowAllBtn.style.display = 'inline-block';
    if (relightBtn) relightBtn.style.display = 'none';

    if (wishCard) wishCard.setAttribute('hidden', '');
  }

  /* Attach events to individual candles */
  candles.forEach(candle => {
    candle.addEventListener('click',   () => blowCandle(candle));
    candle.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        blowCandle(candle);
      }
    });
  });

  /* Blow-all button */
  if (blowAllBtn) {
    blowAllBtn.addEventListener('click', () => {
      candles.forEach(c => blowCandle(c));
    });
  }

  /* Relight button */
  if (relightBtn) {
    relightBtn.addEventListener('click', relightAll);
  }
}

/* ============================================================
   4. PAPER CONFETTI
   Creates small coloured rectangles that fall from the top.
   No canvas — DOM-based so it degrades gracefully.
   ============================================================ */
const CONFETTI_COLORS = [
  '#e8a020', // marigold
  '#c0392b', // tomato
  '#3d7a5c', // teal
  '#f6efe3', // cream
  '#d4a830', // deeper gold
  '#a02820', // deeper red
];

function launchConfetti() {
  const wrap = document.getElementById('confetti-wrap');
  if (!wrap) return;

  const count = 60; // number of pieces

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';

    // Random properties
    const color    = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const left     = Math.random() * 100;        // vw
    const delay    = Math.random() * 1.4;        // seconds
    const duration = 2.5 + Math.random() * 2;   // seconds
    const size     = 7 + Math.random() * 8;      // px
    const rot      = Math.random() * 360;        // initial rotation

    piece.style.cssText = `
      left: ${left}%;
      background: ${color};
      width: ${size}px;
      height: ${size * 1.4}px;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
      transform: rotate(${rot}deg);
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;

    wrap.appendChild(piece);

    // Remove piece after animation ends
    piece.addEventListener('animationend', () => piece.remove());
  }
}

/* ============================================================
   5. NOTEBOOK — scroll-triggered line-by-line reveal
      Uses IntersectionObserver so lines appear as they enter
      the viewport. Each line gets a small staggered delay
      relative to the first visible line in each batch.
   ============================================================ */
function initNotebook() {
  const lines = document.querySelectorAll('[data-nb-line]');
  if (!lines.length) return;

  /* If user prefers reduced motion, reveal everything immediately */
  if (prefersReducedMotion) {
    lines.forEach(l => l.classList.add('nb-line--visible'));
    return;
  }

  /* Track how many consecutive lines have been queued in one
     intersection batch so we can stagger their delays */
  let batchDelay = 0;
  let batchTimer  = null;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const line = entry.target;

        /* Clear any pending batch-reset so delays accumulate
           for lines that arrive close together */
        clearTimeout(batchTimer);

        /* Assign a stagger delay via CSS custom property */
        line.style.setProperty('--nb-delay', `${batchDelay}ms`);
        batchDelay += 90;   /* 90 ms between each line */

        /* Reveal the line */
        line.classList.add('nb-line--visible');

        /* Stop observing once shown */
        observer.unobserve(line);

        /* Reset batch counter a short time after the last
           observed line, so a fresh scroll later restarts cleanly */
        batchTimer = setTimeout(() => { batchDelay = 0; }, 600);
      });
    },
    {
      /* Trigger when at least 20% of the line is visible */
      threshold: 0.2,
      /* Pull the trigger a little before the line fully enters */
      rootMargin: '0px 0px -40px 0px',
    }
  );

  lines.forEach(line => observer.observe(line));
}

/* ============================================================
   6. MEMORIES SCRAPBOOK — polaroid flip cards
   ============================================================

   HOW TO ADD YOUR PHOTOS:
   1. Drop image files into the memories/ folder.
   2. Edit the MEMORIES array below — one object per photo.
   3. Each object has:
        src     — path relative to index.html, e.g. "memories/photo1.jpg"
        alt     — screen-reader description of the photo
        caption — short label shown on the front of the polaroid
        note    — the message shown on the back when flipped
        rot     — tilt in degrees, positive = clockwise (-8 to +8)
        tapeColor       — washi-tape colour (use a hex or CSS variable value)
        tapeRot         — tape tilt offset (optional, default -1)
        placeholderColor — background colour shown while photo loads / if missing
   ============================================================ */

/* ---- ✏️  EDIT THIS ARRAY — one entry per photo ---- */
const MEMORIES = [
  {
    src:              'memories/photo1.jpg',
    alt:              'First memory photo',
    caption:          'remember this day?',
    note:             'Our first hand old from this day the spark started',
    rot:              -4,
    tapeColor:        '#e8a020',
    tapeRot:          -2,
    placeholderColor: '#f0dfc0',
  },
  {
    src:              'memories/photo2.jpg',
    alt:              'Second memory photo',
    caption:          'this was so good',
    note:             'The memories from our one of the movie date these movie dates a great role in shapping our relationship and strenthen our bond',
    rot:              2.5,
    tapeColor:        '#c0392b',
    tapeRot:          1,
    placeholderColor: '#fce8e6',
  },
  {
    src:              'memories/photo3.jpg',
    alt:              'Third memory photo',
    caption:          'one of my favourites',
    note:             'Our First actual one day trip this is the date in which we have enjoyed a lot and also this is my favoraite one ',
    rot:              -1.5,
    tapeColor:        '#3d7a5c',
    tapeRot:          -1,
    placeholderColor: '#eef5ef',
  },
  {
    src:              'memories/photo4.jpg',
    alt:              'Fourth memory photo',
    caption:          'honestly iconic',
    note:             'This is the cultural day in our collage the day we have clicked some stunning photos',
    rot:              5,
    tapeColor:        '#e8a020',
    tapeRot:          2,
    placeholderColor: '#f5f0e0',
  },
  {
    src:              'memories/photo5.jpg',
    alt:              'Fifth memory photo',
    caption:          'we need a sequel',
    note:             'The most recent one day trip to national park this memory is the one whitch i want to relive this date is sooo peaceful and calm that i have fallen in love with rara again',
    rot:              -3,
    tapeColor:        '#c0392b',
    tapeRot:          -2,
    placeholderColor: '#f0dfc0',
  },
  {
    src:              'memories/photo6.jpg',
    alt:              'Sixth memory photo',
    caption:          'grateful for this one',
    note:             'The most waited day of uss , The whole 24 hour is such magical and its gone too fast i still think about that and got big smile on my face THANK YOUUUUUU BABYYYYYY FOR EVERYTHINGGGGGG',
    rot:              1,
    tapeColor:        '#3d7a5c',
    tapeRot:          1,
    placeholderColor: '#eef5ef',
  },
];

/* ---- Camera SVG for missing-photo placeholder ---- */
const CAMERA_SVG = `<svg class="placeholder-icon" viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
  <rect x="4" y="14" width="40" height="28" rx="4" ry="4"
    stroke="#8a6248" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="24" cy="28" r="8"
    stroke="#8a6248" stroke-width="2" fill="none"/>
  <path d="M16,14 L20,8 L28,8 L32,14"
    stroke="#8a6248" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="36" cy="20" r="2" fill="#8a6248"/>
</svg>`;

/* ---- Build a single polaroid card element ---- */
function buildPolaroid(memory, index) {

  /* Outer wrapper — holds rotation + perspective */
  const wrap = document.createElement('div');
  wrap.className = 'polaroid-wrap';
  wrap.style.setProperty('--rot',          `${memory.rot}deg`);
  wrap.style.setProperty('--tape-color',   memory.tapeColor);
  wrap.style.setProperty('--tape-rot',     `${memory.tapeRot || -1}deg`);
  /* Slight vertical stagger: alternate cards drop down a bit */
  wrap.style.setProperty('--mt', `${(index % 2 === 0) ? 0 : 20}px`);

  /* The flip card */
  const card = document.createElement('div');
  card.className = 'polaroid-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label',
    `Memory photo ${index + 1}: "${memory.caption}". Press Enter to flip and read the note.`);
  card.setAttribute('aria-pressed', 'false');

  /* ===== FRONT ===== */
  const front = document.createElement('div');
  front.className = 'polaroid-face polaroid-front';

  /* Tape */
  const tape = document.createElement('div');
  tape.className = 'polaroid-tape';
  tape.setAttribute('aria-hidden', 'true');
  front.appendChild(tape);

  /* Image wrapper */
  const imgWrap = document.createElement('div');
  imgWrap.className = 'polaroid-img-wrap';
  imgWrap.style.setProperty('--placeholder-color', memory.placeholderColor || '#e8dfc8');

  /* Image */
  const img = document.createElement('img');
  img.className = 'polaroid-img';
  img.src = memory.src;
  img.alt = memory.alt || '';
  img.loading = 'lazy';
  img.addEventListener('error', () => {
    imgWrap.classList.add('img-missing');
  });
  imgWrap.appendChild(img);

  /* Placeholder (shown on error) */
  const placeholder = document.createElement('div');
  placeholder.className = 'polaroid-placeholder';
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.innerHTML = `${CAMERA_SVG}
    <span class="placeholder-label">drop your photo<br>into memories/</span>`;
  imgWrap.appendChild(placeholder);

  front.appendChild(imgWrap);

  /* Caption */
  const caption = document.createElement('p');
  caption.className = 'polaroid-caption';
  caption.textContent = memory.caption;
  front.appendChild(caption);

  /* Flip hint (fades after first flip) */
  const hint = document.createElement('span');
  hint.className = 'polaroid-flip-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = 'tap to flip ↺';
  front.appendChild(hint);

  /* ===== BACK ===== */
  const back = document.createElement('div');
  back.className = 'polaroid-face polaroid-back';

  /* Stamp number */
  const stamp = document.createElement('span');
  stamp.className = 'back-stamp';
  stamp.setAttribute('aria-hidden', 'true');
  stamp.textContent = `#${String(index + 1).padStart(2, '0')}`;
  back.appendChild(stamp);

  /* Note text */
  const note = document.createElement('p');
  note.className = 'polaroid-note';
  note.textContent = memory.note;
  back.appendChild(note);

  /* Flip-back button */
  const flipBackBtn = document.createElement('button');
  flipBackBtn.className = 'flip-back-btn';
  flipBackBtn.textContent = '← flip back';
  flipBackBtn.setAttribute('aria-label', 'Flip back to the photo');
  /* Stop the click from bubbling up to the card flip handler */
  flipBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    flipCard(card, wrap, false);
  });
  back.appendChild(flipBackBtn);

  /* Assemble */
  card.appendChild(front);
  card.appendChild(back);
  wrap.appendChild(card);

  /* ---- Flip interactions ---- */
  card.addEventListener('click', () => {
    const flipped = card.classList.contains('is-flipped');
    flipCard(card, wrap, !flipped);
  });

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const flipped = card.classList.contains('is-flipped');
      flipCard(card, wrap, !flipped);
    }
    if (e.key === 'Escape') {
      flipCard(card, wrap, false);
    }
  });

  return wrap;
}

/* ---- Toggle flip state ---- */
function flipCard(card, wrap, shouldFlip) {
  if (shouldFlip) {
    card.classList.add('is-flipped');
    card.setAttribute('aria-pressed', 'true');
    card.setAttribute('aria-label',
      card.getAttribute('aria-label').replace('Press Enter to flip and read the note.', 'Press Enter to flip back.'));
    /* Mark as flipped so the hint fades */
    wrap.classList.add('has-flipped');
    /* Move focus into the back so screen readers announce the note */
    const noteEl = card.querySelector('.polaroid-note');
    if (noteEl) {
      noteEl.setAttribute('tabindex', '-1');
      setTimeout(() => noteEl.focus(), 350); /* after flip animation */
    }
  } else {
    card.classList.remove('is-flipped');
    card.setAttribute('aria-pressed', 'false');
    /* Return focus to the card */
    card.focus();
  }
}

/* ---- Main init function ---- */
function initMemories() {
  const board    = document.getElementById('scrap-board');
  const emptyMsg = document.getElementById('scrap-empty');
  if (!board) return;

  if (!MEMORIES.length) {
    if (emptyMsg) emptyMsg.removeAttribute('hidden');
    return;
  }

  MEMORIES.forEach((memory, i) => {
    const polaroid = buildPolaroid(memory, i);
    board.appendChild(polaroid);
  });
}

/* ============================================================
   7. INTERACTIVE FLOATING BALLOONS & POP BURSTS
   - Flat paper SVG balloons with wavy strings and paper-cut highlights
   - Uses palette: marigold, tomato red, teal, cream
   - Tap/click pops with a soft synthesized sound
   - Bursts out 4-7 flat SVG flowers & candies + paper scraps
   - Hardware-accelerated rAF falling physics with max-item cap (60)
   - Respawns fresh balloons after pop so the sky never empties
   ============================================================ */

const BALLOON_PALETTE = ['#e8a020', '#c0392b', '#3d7a5c', '#ede4d2'];
let poppedCount = 0;
let hasPoppedAny = false;
let isSoundMuted = false;
let audioContext = null;

// Cap active falling items at 60 for smooth 60fps performance
const MAX_FALLING_ITEMS = 60;
const activeFallingItems = [];
let physicsRafId = null;
let lastPhysicsTime = 0;

/* Synthesize a soft paper-balloon pop sound (Web Audio API) */
function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playPopSound() {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // 1. Warm pop pitch drop (triangle oscillator)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startFreq = 360 + Math.random() * 80;
    const endFreq = 65 + Math.random() * 25;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);

    // 2. Paper snap click (tiny square puff)
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'square';
    snapOsc.frequency.setValueAtTime(850, now);
    snapOsc.frequency.exponentialRampToValueAtTime(110, now + 0.025);

    snapGain.gain.setValueAtTime(0.06, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.03);
  } catch (err) {
    // Graceful fallback if audio is blocked
  }
}

/* Inline flat hand-drawn SVG for a balloon */
function createBalloonSvg(color) {
  return `<svg viewBox="0 0 74 135" width="100%" height="100%" overflow="visible" aria-hidden="true">
    <!-- Wavy hand-drawn paper string -->
    <path d="M 37 83 Q 32 94, 40 105 Q 33 116, 38 127 Q 34 133, 37 138"
          fill="none" stroke="#5a3826" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="0.5 0.5" />
    
    <!-- Balloon body: organic wobbly hand-drawn outline with flat color fill -->
    <path class="balloon-body" d="M 37 10
             C 57 10, 68 25, 67 44
             C 66 63, 50 77, 41 82
             L 43 86 L 31 86 L 33 82
             C 24 77, 8 63, 7 44
             C 6 25, 17 10, 37 10 Z"
          fill="${color}" stroke="#3d241a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    
    <!-- Little paper knot at bottom -->
    <path class="balloon-knot" d="M 32 82 L 42 82 L 44 87 L 30 87 Z"
          fill="${color}" stroke="#3d241a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          
    <!-- Paper-cut flat highlight shape (NOT glossy, flat lighter paper cutout) -->
    <path class="balloon-highlight" d="M 21 24 C 27 18, 33 18, 38 19 C 34 23, 27 26, 24 35 C 22 31, 21 27, 21 24 Z"
          fill="#fffdf4" opacity="0.65" />
          
    <!-- Hand-drawn tiny speckle -->
    <circle cx="22" cy="44" r="1.5" fill="#3d241a" opacity="0.2" />
  </svg>`;
}

/* Flat SVG flower templates in card palette */
function getFlowerSvg(type, color) {
  if (type === 'daisy') {
    return `<svg viewBox="0 0 34 34" width="30" height="30" aria-hidden="true">
      <g stroke="#3d241a" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="#fffdf4">
        <ellipse cx="17" cy="7" rx="3.5" ry="6" />
        <ellipse cx="17" cy="27" rx="3.5" ry="6" />
        <ellipse cx="7" cy="17" rx="6" ry="3.5" />
        <ellipse cx="27" cy="17" rx="6" ry="3.5" />
        <ellipse cx="10" cy="10" rx="3.5" ry="5.5" transform="rotate(-45 10 10)" />
        <ellipse cx="24" cy="24" rx="3.5" ry="5.5" transform="rotate(-45 24 24)" />
        <ellipse cx="24" cy="10" rx="3.5" ry="5.5" transform="rotate(45 24 10)" />
        <ellipse cx="10" cy="24" rx="3.5" ry="5.5" transform="rotate(45 10 24)" />
      </g>
      <circle cx="17" cy="17" r="5" fill="#e8a020" stroke="#3d241a" stroke-width="1.4"/>
    </svg>`;
  } else if (type === 'tulip') {
    return `<svg viewBox="0 0 28 32" width="26" height="30" aria-hidden="true">
      <path d="M14,19 L14,30" stroke="#3d7a5c" stroke-width="2" stroke-linecap="round"/>
      <path d="M14,24 Q18,22 20,20" stroke="#3d7a5c" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M6,17 C5,10 8,5 14,7 C20,5 23,10 22,17 C20,20 16,21 14,21 C12,21 8,20 6,17 Z"
            fill="${color}" stroke="#3d241a" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M10,7 L14,13 L18,7" fill="none" stroke="#3d241a" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`;
  } else {
    // 5-petal flower
    return `<svg viewBox="0 0 30 30" width="28" height="28" aria-hidden="true">
      <g fill="${color}" stroke="#3d241a" stroke-width="1.3" stroke-linejoin="round">
        <circle cx="15" cy="8" r="4.5" />
        <circle cx="22" cy="13" r="4.5" />
        <circle cx="19" cy="21" r="4.5" />
        <circle cx="11" cy="21" r="4.5" />
        <circle cx="8" cy="13" r="4.5" />
      </g>
      <circle cx="15" cy="15" r="3.5" fill="#fffdf4" stroke="#3d241a" stroke-width="1.3"/>
    </svg>`;
  }
}

/* Flat SVG candy templates in card palette */
function getCandySvg(type, color) {
  if (type === 'candy-wrapped') {
    return `<svg viewBox="0 0 38 22" width="36" height="20" aria-hidden="true">
      <polygon points="12,11 2,4 4,18" fill="#fffdf4" stroke="#3d241a" stroke-width="1.3" stroke-linejoin="round"/>
      <polygon points="26,11 36,4 34,18" fill="#fffdf4" stroke="#3d241a" stroke-width="1.3" stroke-linejoin="round"/>
      <rect x="10" y="4" width="18" height="14" rx="3" fill="${color}" stroke="#3d241a" stroke-width="1.4"/>
      <line x1="16" y1="4" x2="22" y2="18" stroke="#3d241a" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`;
  } else if (type === 'lollipop') {
    return `<svg viewBox="0 0 26 36" width="24" height="34" aria-hidden="true">
      <line x1="13" y1="18" x2="13" y2="34" stroke="#8a6248" stroke-width="2" stroke-linecap="round"/>
      <circle cx="13" cy="13" r="9" fill="${color}" stroke="#3d241a" stroke-width="1.4"/>
      <path d="M13,13 Q16,11 15,8 Q12,6 9,10 Q7,15 12,18" fill="none" stroke="#3d241a" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`;
  } else {
    // round wrapped candy
    return `<svg viewBox="0 0 26 26" width="24" height="24" aria-hidden="true">
      <circle cx="13" cy="13" r="10" fill="${color}" stroke="#3d241a" stroke-width="1.4"/>
      <path d="M13,5 L13,21 M5,13 L21,13 M8,8 L18,18 M18,8 L8,18" stroke="#3d241a" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
    </svg>`;
  }
}

/* Physics animation loop for falling items */
function updateBurstPhysics(now) {
  const dt = Math.min((now - lastPhysicsTime) / 1000, 0.05);
  lastPhysicsTime = now;

  for (let i = activeFallingItems.length - 1; i >= 0; i--) {
    const item = activeFallingItems[i];
    item.life += dt;

    if (item.life >= item.maxLife) {
      item.el.remove();
      activeFallingItems.splice(i, 1);
      continue;
    }

    // Gravity
    item.vy += item.gravity * dt;

    // Air drift & gentle sway
    const sway = Math.sin(item.life * item.swaySpeed + item.swayOffset) * 22 * dt;
    item.x += (item.vx + sway) * dt;
    item.y += item.vy * dt;
    item.rot += item.vrot * dt;

    // Fade out over last 1.2s
    const remainingLife = item.maxLife - item.life;
    const opacity = remainingLife < 1.2 ? Math.max(0, remainingLife / 1.2) : 1;

    item.el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0) rotate(${item.rot}deg) scale(${item.scale})`;
    item.el.style.opacity = opacity.toFixed(2);
  }

  if (activeFallingItems.length > 0) {
    physicsRafId = requestAnimationFrame(updateBurstPhysics);
  } else {
    physicsRafId = null;
  }
}

/* Spawn burst items (flowers, candies, paper scraps) on pop */
function triggerBalloonBurst(centerX, centerY, balloonColor) {
  if (prefersReducedMotion) return;

  const burstContainer = document.getElementById('burst-container');
  if (!burstContainer) return;

  // 4 to 7 items: mix of flowers and candies
  const itemCount = 4 + Math.floor(Math.random() * 4);
  const flowerTypes = ['daisy', 'tulip', 'five-petal'];
  const candyTypes = ['candy-wrapped', 'lollipop', 'candy-round'];

  for (let i = 0; i < itemCount; i++) {
    if (activeFallingItems.length >= MAX_FALLING_ITEMS) break;

    const isFlower = Math.random() > 0.45;
    const type = isFlower
      ? flowerTypes[Math.floor(Math.random() * flowerTypes.length)]
      : candyTypes[Math.floor(Math.random() * candyTypes.length)];
    const color = BALLOON_PALETTE[Math.floor(Math.random() * BALLOON_PALETTE.length)];

    const itemEl = document.createElement('div');
    itemEl.className = 'burst-item';
    itemEl.innerHTML = isFlower ? getFlowerSvg(type, color) : getCandySvg(type, color);

    burstContainer.appendChild(itemEl);

    // Initial velocity: pop upward and outward
    const angle = (Math.PI * 2 * i) / itemCount + (Math.random() - 0.5) * 0.4;
    const speed = 100 + Math.random() * 100;
    const vx = Math.cos(angle) * speed * 0.85;
    const vy = -150 - Math.random() * 120;

    activeFallingItems.push({
      el: itemEl,
      x: centerX,
      y: centerY,
      vx: vx,
      vy: vy,
      gravity: 330 + Math.random() * 60,
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 200,
      swayOffset: Math.random() * 8,
      swaySpeed: 2.2 + Math.random() * 1.8,
      scale: 0.85 + Math.random() * 0.3,
      life: 0,
      maxLife: 3.2 + Math.random() * 1.2,
    });
  }

  // 8 to 12 tiny paper scrap confetti
  const scrapCount = 8 + Math.floor(Math.random() * 5);
  for (let s = 0; s < scrapCount; s++) {
    if (activeFallingItems.length >= MAX_FALLING_ITEMS) break;

    const scrapColor = Math.random() > 0.3
      ? balloonColor
      : BALLOON_PALETTE[Math.floor(Math.random() * BALLOON_PALETTE.length)];
    const scrapW = 6 + Math.random() * 6;
    const scrapH = 8 + Math.random() * 7;

    const scrapEl = document.createElement('div');
    scrapEl.className = 'burst-scrap';
    scrapEl.style.width = `${scrapW}px`;
    scrapEl.style.height = `${scrapH}px`;
    scrapEl.style.backgroundColor = scrapColor;
    burstContainer.appendChild(scrapEl);

    const scrapAngle = Math.random() * Math.PI * 2;
    const scrapSpeed = 80 + Math.random() * 130;

    activeFallingItems.push({
      el: scrapEl,
      x: centerX,
      y: centerY,
      vx: Math.cos(scrapAngle) * scrapSpeed,
      vy: -140 - Math.random() * 130,
      gravity: 360,
      rot: Math.random() * 360,
      vrot: (Math.random() - 0.5) * 360,
      swayOffset: Math.random() * 8,
      swaySpeed: 3,
      scale: 1,
      life: 0,
      maxLife: 2.6 + Math.random() * 1.0,
    });
  }

  // Start physics loop if idle
  if (!physicsRafId) {
    lastPhysicsTime = performance.now();
    physicsRafId = requestAnimationFrame(updateBurstPhysics);
  }
}

/* Popping event handler */
function popBalloon(balloon) {
  if (balloon.dataset.popped === 'true') return;
  balloon.dataset.popped = 'true';

  // Play soft paper-balloon pop
  playPopSound();

  // Hide the tutorial hint on first pop
  if (!hasPoppedAny) {
    hasPoppedAny = true;
    const hintEl = document.getElementById('balloon-hint');
    if (hintEl) {
      hintEl.classList.add('is-hidden');
      setTimeout(() => hintEl.remove(), 550);
    }
  }

  // Increment counter in HUD
  poppedCount++;
  const countEl = document.getElementById('hud-count');
  if (countEl) {
    countEl.textContent = `popped: ${poppedCount}`;
  }

  // Milestone sticky note at 20 pops
  if (poppedCount === 10) {
    const winNote = document.getElementById('balloon-win-note');
    if (winNote) {
      winNote.removeAttribute('hidden');
    }
  }

  // Measure center position for the burst
  const rect = balloon.getBoundingClientRect();
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.42;
  const balloonColor = balloon.dataset.color || '#e8a020';

  // Trigger quick scale-up animation
  balloon.classList.add('is-popping');

  // Trigger burst items and remove balloon
  setTimeout(() => {
    triggerBalloonBurst(centerX, centerY, balloonColor);
    balloon.remove();
  }, 110);

  // Replenish balloon after 2.5 - 4.5 seconds so sky stays populated
  setTimeout(() => {
    spawnBalloon(false);
  }, 2500 + Math.random() * 2000);
}

/* Spawn a single paper balloon */
function spawnBalloon(initialStagger = false) {
  const container = document.getElementById('balloon-container');
  if (!container) return;

  const color = BALLOON_PALETTE[Math.floor(Math.random() * BALLOON_PALETTE.length)];
  const width = Math.round(62 + Math.random() * 38); // 62px to 100px
  const height = Math.round(width * 1.82);

  // Random X coordinate across full viewport
  const maxX = Math.max(window.innerWidth - width - 20, 30);
  const startX = Math.round(10 + Math.random() * maxX);

  // Random sway distance and direction
  const swayX = Math.round((Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 22));

  // Small random rotations (-3.5deg to 3.5deg)
  const rotStart = (Math.random() * 5 - 2.5).toFixed(1);
  const rotMid1 = (Math.random() * 5 - 2.5).toFixed(1);
  const rotMid2 = (Math.random() * 5 - 2.5).toFixed(1);
  const rotEnd = (Math.random() * 5 - 2.5).toFixed(1);

  // Float duration
  const baseDuration = prefersReducedMotion ? 40 : (16 + Math.random() * 9);

  const balloon = document.createElement('div');
  balloon.className = 'paper-balloon';
  balloon.dataset.color = color;
  balloon.dataset.popped = 'false';
  balloon.setAttribute('role', 'button');
  balloon.setAttribute('tabindex', '0');
  balloon.setAttribute('aria-label', 'Floating birthday balloon. Tap or click to pop!');

  balloon.style.setProperty('--b-width', `${width}px`);
  balloon.style.setProperty('--b-height', `${height}px`);
  balloon.style.setProperty('--start-x', `${startX}px`);
  balloon.style.setProperty('--sway-x', `${swayX}px`);
  balloon.style.setProperty('--rot-start', `${rotStart}deg`);
  balloon.style.setProperty('--rot-mid1', `${rotMid1}deg`);
  balloon.style.setProperty('--rot-mid2', `${rotMid2}deg`);
  balloon.style.setProperty('--rot-end', `${rotEnd}deg`);
  balloon.style.setProperty('--float-duration', `${baseDuration.toFixed(1)}s`);

  if (initialStagger) {
    // Stagger vertically across screen on page load
    const negativeDelay = -(Math.random() * (baseDuration * 0.9)).toFixed(1);
    balloon.style.animationDelay = `${negativeDelay}s`;
  }

  balloon.innerHTML = createBalloonSvg(color);

  // Pointerdown for rapid mobile response (no 300ms delay)
  balloon.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    popBalloon(balloon);
  });

  // Keyboard accessibility
  balloon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      popBalloon(balloon);
    }
  });

  // Loop back when reaching top
  balloon.addEventListener('animationend', () => {
    if (balloon.dataset.popped !== 'true') {
      balloon.remove();
      spawnBalloon(false);
    }
  });

  container.appendChild(balloon);
}

/* Sound toggle and modal close controls */
function initBalloonControls() {
  const soundBtn = document.getElementById('sound-toggle-btn');
  const soundIcon = document.getElementById('sound-icon');

  try {
    const saved = localStorage.getItem('swara_card_sound_muted');
    if (saved === 'true') {
      isSoundMuted = true;
      if (soundIcon) soundIcon.textContent = '🔇';
      if (soundBtn) soundBtn.title = 'Sound: Off';
    }
  } catch (e) {}

  if (soundBtn) {
    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isSoundMuted = !isSoundMuted;
      if (soundIcon) {
        soundIcon.textContent = isSoundMuted ? '🔇' : '🔊';
      }
      soundBtn.title = isSoundMuted ? 'Sound: Off' : 'Sound: On';
      try {
        localStorage.setItem('swara_card_sound_muted', isSoundMuted ? 'true' : 'false');
      } catch (err) {}
    });
  }

  const closeWinBtn = document.getElementById('sticky-close-btn');
  const winNote = document.getElementById('balloon-win-note');
  if (closeWinBtn && winNote) {
    closeWinBtn.addEventListener('click', () => {
      winNote.setAttribute('hidden', '');
    });
  }
}

/* Main balloon feature initialization */
function initBalloons() {
  const container = document.getElementById('balloon-container');
  if (!container) return;

  initBalloonControls();

  // Screen-responsive count: 5-7 on mobile, 9-11 on desktop
  const isMobile = window.innerWidth <= 600;
  let targetCount = isMobile ? (5 + Math.floor(Math.random() * 3)) : (9 + Math.floor(Math.random() * 3));
  if (prefersReducedMotion) {
    targetCount = isMobile ? 3 : 5;
  }

  for (let i = 0; i < targetCount; i++) {
    spawnBalloon(true);
  }
}

/* ============================================================
   8. CINEMATIC PROJECTOR EXPERIENCE
   Plays birthday edit video on a projected vintage screen
   after all 5 candles are blown out.
   ============================================================ */
let cinematicTimer = null;

function startCinematicExperience() {
  const overlay = document.getElementById('cinematic-overlay');
  const video   = document.getElementById('projector-video');
  if (!overlay || !video) return;

  // Reveal overlay and dark room atmosphere
  overlay.removeAttribute('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cinematic-active');

  // Trigger CSS animations smoothly
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('is-active');
    });
  });

  // Ensure video is muted and plays inline
  video.muted = true;
  video.currentTime = 0;

  // Start video playback after beam and screen are established
  const delay = prefersReducedMotion ? 100 : 2000;
  clearTimeout(cinematicTimer);
  cinematicTimer = setTimeout(() => {
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Safe catch for autoplay constraints
      });
    }
  }, delay);
}

function stopCinematicExperience() {
  clearTimeout(cinematicTimer);
  const overlay = document.getElementById('cinematic-overlay');
  const video   = document.getElementById('projector-video');

  // Pause and reset video
  if (video) {
    video.pause();
    video.currentTime = 0;
  }

  // Fade out cinematic atmosphere
  if (overlay) {
    overlay.classList.remove('is-active');
    overlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      overlay.setAttribute('hidden', '');
    }, 500);
  }

  document.body.classList.remove('cinematic-active');
}

function initCinematic() {
  const video = document.getElementById('projector-video');
  if (video) {
    // Prevent unprompted autoplay on page load while candles are lit
    video.pause();
    video.currentTime = 0;
    video.muted = true;

    // Hold final frame when video finishes (no looping)
    video.addEventListener('ended', () => {
      // Retains final frame until Relight is clicked
    });
  }
}

/* ============================================================
   INIT — run after DOM is ready
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initUnderline();
  initGifts();
  initCandles();
  initNotebook();
  initMemories();
  initBalloons();
  initCinematic();
});
