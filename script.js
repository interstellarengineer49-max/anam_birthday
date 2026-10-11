(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = [...document.querySelectorAll('.scene')];
  const dots = [...document.querySelectorAll('.nav-dot')];
  const progress = document.getElementById('progressBar');
  const starsCanvas = document.getElementById('stars');
  const starsContext = starsCanvas?.getContext('2d');
  const teddyStage = document.getElementById('teddyStage');
  let currentScene = Math.max(0, scenes.findIndex(scene => scene.classList.contains('active')));
  let stars = [];
  let starFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let photoSwitchTimer;
  let cakeResetTimer;
  let birthdayRevealTimer;
  let birthdayConfettiShown = false;
  let shootingStars = [];
  let greetingExperienceStarted = false;
  let greetingEnabled = true;
  let greetingAttempted = false;
  let greetingRequestPending = false;
  let greetingRequestToken = 0;
  let greetingTimer = 0;
  let greetingGlowTimer = 0;

  function activateScene(index) {
    const next = Math.max(0, Math.min(index, scenes.length - 1));
    if (next !== 2 && greetingTimer) {
      window.clearTimeout(greetingTimer);
      greetingTimer = 0;
    }
    currentScene = next;
    scenes.forEach((scene, i) => {
      const active = i === next;
      scene.classList.toggle('active', active);
      scene.setAttribute('aria-hidden', String(!active));
    });
    if (teddyStage) teddyStage.tabIndex = next === 1 ? 0 : -1;
    dots.forEach((dot, i) => {
      dot.classList.toggle('selected', i === next);
      if (i === next) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    document.body.dataset.scene = scenes[next]?.id || 'opening';
    if (progress) progress.style.width = `${(next / Math.max(1, scenes.length - 1)) * 100}%`;
    if (starsCanvas) starsCanvas.style.opacity = next === scenes.length - 1 ? '0.34' : '1';
    window.clearTimeout(birthdayRevealTimer);
    if (next === 2 && !birthdayConfettiShown && !reducedMotion.matches) {
      birthdayRevealTimer = window.setTimeout(() => {
        if (currentScene === 2) releaseConfetti(22);
        birthdayConfettiShown = true;
      }, 1150);
    }
    if (next === 2 && greetingExperienceStarted) scheduleBirthdayGreeting();
  }

  function resizeStars() {
    if (!starsCanvas || !starsContext) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    starsCanvas.width = Math.round(width * ratio);
    starsCanvas.height = Math.round(height * ratio);
    starsCanvas.style.width = `${width}px`;
    starsCanvas.style.height = `${height}px`;
    starsContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars = Array.from({ length: Math.min(250, Math.floor((width * height) / 4600)) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.25 + 0.2,
      opacity: Math.random() * 0.63 + 0.12,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.012 + 0.003,
      driftX: (Math.random() - 0.5) * 0.055,
      driftY: (Math.random() - 0.5) * 0.035,
      depth: Math.random() * 0.7 + 0.3
    }));
    drawStars(!reducedMotion.matches);
  }

  function drawStars(animate) {
    if (!starsContext || document.hidden) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    starsContext.clearRect(0, 0, width, height);
    for (const star of stars) {
      if (animate) {
        star.phase += star.speed;
        star.x = (star.x + star.driftX + width) % width;
        star.y = (star.y + star.driftY + height) % height;
      }
      const twinkle = reducedMotion.matches ? 0.82 : 0.72 + Math.sin(star.phase) * 0.28;
      const x = (star.x + pointerX * star.depth + width) % width;
      const y = (star.y + pointerY * star.depth + height) % height;
      starsContext.beginPath();
      starsContext.arc(x, y, star.radius, 0, Math.PI * 2);
      starsContext.fillStyle = `rgba(255,224,158,${star.opacity * twinkle})`;
      starsContext.fill();
      if (star.radius > 1.05) {
        starsContext.beginPath();
        starsContext.moveTo(x - 4, y);
        starsContext.lineTo(x + 4, y);
        starsContext.moveTo(x, y - 4);
        starsContext.lineTo(x, y + 4);
        starsContext.strokeStyle = `rgba(255,211,119,${star.opacity * twinkle * 0.42})`;
        starsContext.lineWidth = 0.6;
        starsContext.stroke();
      }
    }
    if (animate && Math.random() < 0.0018) {
      shootingStars.push({ x: Math.random() * width * 0.8, y: Math.random() * height * 0.46, age: 0 });
    }
    shootingStars = shootingStars.filter(star => star.age < 1);
    for (const shootingStar of shootingStars) {
      shootingStar.x += 9;
      shootingStar.y += 3.2;
      shootingStar.age += 0.035;
      const tail = starsContext.createLinearGradient(shootingStar.x - 48, shootingStar.y - 18, shootingStar.x, shootingStar.y);
      tail.addColorStop(0, 'rgba(237,173,69,0)');
      tail.addColorStop(1, `rgba(255,239,185,${1 - shootingStar.age})`);
      starsContext.beginPath();
      starsContext.moveTo(shootingStar.x - 48, shootingStar.y - 18);
      starsContext.lineTo(shootingStar.x, shootingStar.y);
      starsContext.strokeStyle = tail;
      starsContext.lineWidth = 1.2;
      starsContext.stroke();
    }
    if (animate && !reducedMotion.matches && !document.hidden) {
      starFrame = window.requestAnimationFrame(() => drawStars(true));
    }
  }

  function restartStars() {
    if (starFrame) window.cancelAnimationFrame(starFrame);
    starFrame = 0;
    if (!document.hidden) drawStars(!reducedMotion.matches);
  }
  resizeStars();
  window.addEventListener('resize', resizeStars, { passive: true });
  document.addEventListener('visibilitychange', restartStars);
  reducedMotion.addEventListener?.('change', restartStars);

  document.getElementById('begin')?.addEventListener('click', () => {
    greetingExperienceStarted = true;
    activateScene(1);
  });
  document.getElementById('nextScene')?.addEventListener('click', () => activateScene(currentScene + 1));
  document.getElementById('previousScene')?.addEventListener('click', () => activateScene(currentScene - 1));
  dots.forEach(dot => dot.addEventListener('click', () => activateScene(Number(dot.dataset.sceneIndex))));
  document.getElementById('replay')?.addEventListener('click', () => activateScene(0));

  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'BUTTON', 'LABEL'].includes(target.tagName))) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      activateScene(currentScene + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      activateScene(currentScene - 1);
    }
  });

  window.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    pointerX = (event.clientX / window.innerWidth - 0.5) * 12;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 8;
    document.body.style.setProperty('--parallax-x', `${pointerX.toFixed(1)}px`);
    document.body.style.setProperty('--parallax-y', `${pointerY.toFixed(1)}px`);
    if (!starFrame) drawStars(false);
  }, { passive: true });

  const teddyArt = teddyStage?.querySelector('.teddy-art');
  if (teddyStage && teddyArt && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion.matches) {
    teddyStage.addEventListener('pointermove', event => {
      const bounds = teddyStage.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      teddyArt.style.setProperty('--tilt-x', `${(x * 8).toFixed(2)}deg`);
      teddyArt.style.setProperty('--tilt-y', `${(-y * 6).toFixed(2)}deg`);
    });
    teddyStage.addEventListener('pointerleave', () => {
      teddyArt.style.setProperty('--tilt-x', '0deg');
      teddyArt.style.setProperty('--tilt-y', '0deg');
    });
  }

  teddyStage?.addEventListener('click', () => {
    teddyStage.classList.remove('heart-burst');
    void teddyStage.offsetWidth;
    teddyStage.classList.add('heart-burst');
    window.setTimeout(() => teddyStage.classList.remove('heart-burst'), 1000);
    if (reducedMotion.matches) return;
    const burst = document.createElement('span');
    burst.className = 'burst-heart';
    burst.textContent = '♡';
    burst.setAttribute('aria-hidden', 'true');
    teddyStage.append(burst);
    window.setTimeout(() => burst.remove(), 1300);
  });

  const cakeStage = document.getElementById('cakeStage');
  const birthdayScene = document.getElementById('birthday');
  document.getElementById('wish')?.addEventListener('click', () => {
    cakeStage?.classList.add('cake-wished');
    birthdayScene?.classList.add('wish-light');
    if (!reducedMotion.matches) releaseConfetti(34);
    window.clearTimeout(cakeResetTimer);
    cakeResetTimer = window.setTimeout(() => {
      cakeStage?.classList.remove('cake-wished');
      birthdayScene?.classList.remove('wish-light');
    }, 2400);
  });

  function releaseConfetti(count) {
    const palette = ['#d99b3d', '#f1d58b', '#fff0bf', '#b97828', '#fff8e4'];
    const batch = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const piece = document.createElement('i');
      piece.className = 'confetti';
      piece.style.left = `${50 + (Math.random() - 0.5) * 26}%`;
      piece.style.top = '49%';
      piece.style.background = palette[i % palette.length];
      piece.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 400}px`);
      piece.style.setProperty('--drift-y', `${-60 - Math.random() * 360}px`);
      piece.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
      piece.setAttribute('aria-hidden', 'true');
      batch.append(piece);
      window.setTimeout(() => piece.remove(), 1900);
    }
    document.body.append(batch);
  }

  // Add bundled photographs here. Keep files in assets/ and use relative paths.
  const bundledPhotos = [
    { src: 'assets/anam-photo.png', alt: 'Anam with someone special', caption: 'A memory to keep close' }
  ];
  const uploadedPhotos = [];
  let photoIndex = 0;
  const galleryView = document.getElementById('galleryView');
  const galleryImage = document.getElementById('galleryImage');
  const photoLabel = document.getElementById('photoLabel');
  const galleryDots = document.getElementById('galleryDots');
  let photos = [...bundledPhotos];

  function paintGalleryDots() {
    if (!galleryDots) return;
    galleryDots.replaceChildren();
    photos.forEach((photo, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `gallery-dot${index === photoIndex ? ' selected' : ''}`;
      dot.setAttribute('aria-label', `Show photo ${index + 1}: ${photo.caption}`);
      dot.addEventListener('click', () => showPhoto(index));
      galleryDots.append(dot);
    });
  }

  function showPhoto(index) {
    if (!photos.length || !galleryImage || !galleryView) return;
    photoIndex = (index + photos.length) % photos.length;
    const photo = photos[photoIndex];
    galleryView.classList.add('changing');
    paintGalleryDots();
    window.clearTimeout(photoSwitchTimer);
    photoSwitchTimer = window.setTimeout(() => {
      galleryImage.onload = () => galleryView.classList.remove('changing');
      galleryImage.onerror = () => {
        galleryView.classList.remove('changing');
        if (photoLabel) photoLabel.textContent = 'This photo could not be loaded';
      };
      galleryImage.alt = photo.alt;
      if (photoLabel) photoLabel.textContent = photo.caption;
      galleryImage.src = photo.src;
      if (galleryImage.complete) galleryView.classList.remove('changing');
    }, reducedMotion.matches ? 0 : 230);
  }

  document.getElementById('previousPhoto')?.addEventListener('click', () => showPhoto(photoIndex - 1));
  document.getElementById('nextPhoto')?.addEventListener('click', () => showPhoto(photoIndex + 1));
  document.getElementById('photoInput')?.addEventListener('change', event => {
    const files = [...event.target.files].filter(file => file.type.startsWith('image/'));
    if (!files.length) return;
    uploadedPhotos.push(...files.map(file => ({
      src: URL.createObjectURL(file),
      alt: 'A birthday memory',
      caption: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
    })));
    photos = [...bundledPhotos, ...uploadedPhotos];
    showPhoto(bundledPhotos.length);
    event.target.value = '';
  });
  paintGalleryDots();

  const greetingToggle = document.getElementById('greetingToggle');
  const greetingStatus = document.getElementById('greetingStatus');
  const speechEngine = window.speechSynthesis;
  const SpeechUtterance = window.SpeechSynthesisUtterance;
  const speechSupported = Boolean(speechEngine && typeof SpeechUtterance === 'function' && typeof speechEngine.speak === 'function');
  let activeGreeting = null;

  function announceGreetingStatus(message) {
    if (greetingStatus) greetingStatus.textContent = message;
  }

  function renderGreetingToggle() {
    if (!greetingToggle) return;
    greetingToggle.classList.toggle('on', greetingEnabled);
    greetingToggle.setAttribute('aria-pressed', String(greetingEnabled));
    greetingToggle.setAttribute('aria-label', greetingEnabled ? 'Mute birthday greeting' : 'Enable birthday greeting');
    greetingToggle.title = `Birthday greeting: ${greetingEnabled ? 'on' : 'muted'}`;
  }

  function selectEnglishVoice(availableVoices) {
    const englishVoices = availableVoices.filter(voice => /^en([_-]|$)/i.test(voice.lang || ''));
    if (!englishVoices.length) return null;
    return englishVoices.map(voice => {
      const name = (voice.name || '').toLowerCase();
      let score = /^en-us/i.test(voice.lang || '') ? 2 : 0;
      if (/natural|neural|premium|enhanced|google|samantha|jenny|aria|ava|zira|serena|tessa|karen|libby|sonia/.test(name)) score += 3;
      if (voice.default) score += 1;
      if (voice.localService) score += 0.25;
      return { voice, score };
    }).sort((a, b) => b.score - a.score)[0]?.voice || null;
  }

  function preferredEnglishVoice() {
    if (!speechEngine) return Promise.resolve(null);
    let availableVoices = [];
    try { availableVoices = speechEngine.getVoices?.() || []; } catch { return Promise.resolve(null); }
    if (availableVoices.length || typeof speechEngine.addEventListener !== 'function') {
      return Promise.resolve(selectEnglishVoice(availableVoices));
    }
    return new Promise(resolve => {
      let settled = false;
      let timeoutId = 0;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (timeoutId) window.clearTimeout(timeoutId);
        speechEngine.removeEventListener?.('voiceschanged', finish);
        try { resolve(selectEnglishVoice(speechEngine.getVoices?.() || [])); } catch { resolve(null); }
      };
      speechEngine.addEventListener('voiceschanged', finish, { once: true });
      timeoutId = window.setTimeout(finish, 900);
    });
  }

  function releaseGreetingParticles() {
    if (!birthdayScene || reducedMotion.matches) return;
    for (let i = 0; i < 12; i += 1) {
      const particle = document.createElement('span');
      particle.className = 'greeting-particle';
      particle.setAttribute('aria-hidden', 'true');
      particle.style.left = `${39 + Math.random() * 22}%`;
      particle.style.top = `${58 + Math.random() * 25}%`;
      particle.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 110}px`);
      particle.style.setProperty('--drift-y', `${-35 - Math.random() * 76}px`);
      birthdayScene.append(particle);
      window.setTimeout(() => particle.remove(), 2900);
    }
  }

  function fadeGreetingGlow() {
    window.clearTimeout(greetingGlowTimer);
    greetingGlowTimer = window.setTimeout(() => birthdayScene?.classList.remove('greeting-active'), 650);
  }

  async function speakBirthdayGreeting(requestToken) {
    if (!speechSupported) {
      greetingRequestPending = false;
      announceGreetingStatus('Birthday greeting is not supported in this browser.');
      birthdayScene?.classList.remove('greeting-active');
      return;
    }
    let voice = null;
    try { voice = await preferredEnglishVoice(); } catch {
      greetingRequestPending = false;
      announceGreetingStatus('This browser could not load a speech voice.');
      birthdayScene?.classList.remove('greeting-active');
      return;
    }
    if (requestToken !== greetingRequestToken) return;
    greetingRequestPending = false;
    if (!greetingEnabled || !greetingExperienceStarted || currentScene !== 2 || greetingAttempted) {
      birthdayScene?.classList.remove('greeting-active');
      return;
    }

    let utterance;
    try {
      utterance = new SpeechUtterance('Happy Birthday, Anam!');
      utterance.lang = voice?.lang || 'en-US';
      utterance.rate = 0.94;
      utterance.pitch = 1.08;
      utterance.volume = 1;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => announceGreetingStatus('Speaking: Happy Birthday, Anam!');
      utterance.onend = () => {
        activeGreeting = null;
        announceGreetingStatus('Birthday greeting finished.');
        fadeGreetingGlow();
      };
      utterance.onerror = event => {
        activeGreeting = null;
        if (!['canceled', 'interrupted'].includes(event.error)) {
          announceGreetingStatus('This browser could not play the birthday greeting.');
        }
        fadeGreetingGlow();
      };

      greetingAttempted = true;
      activeGreeting = utterance;
      announceGreetingStatus('Birthday greeting is starting.');
      speechEngine.speak(utterance);
    } catch {
      activeGreeting = null;
      announceGreetingStatus('This browser could not play the birthday greeting.');
      birthdayScene?.classList.remove('greeting-active');
    }
  }

  function scheduleBirthdayGreeting(delay = 880) {
    if (!speechSupported || !greetingExperienceStarted || !greetingEnabled || currentScene !== 2 || greetingAttempted || greetingRequestPending || greetingTimer) return;
    greetingTimer = window.setTimeout(() => {
      greetingTimer = 0;
      if (!greetingEnabled || !greetingExperienceStarted || currentScene !== 2 || greetingAttempted || greetingRequestPending) return;
      greetingRequestPending = true;
      const requestToken = ++greetingRequestToken;
      birthdayScene?.classList.add('greeting-active');
      releaseGreetingParticles();
      void speakBirthdayGreeting(requestToken);
    }, delay);
  }

  if (!speechSupported) {
    greetingEnabled = false;
    if (greetingToggle) {
      greetingToggle.disabled = true;
      greetingToggle.classList.remove('on');
      greetingToggle.setAttribute('aria-pressed', 'false');
      greetingToggle.setAttribute('aria-label', 'Birthday greeting unavailable in this browser');
      greetingToggle.title = 'Birthday greeting unavailable in this browser';
    }
    announceGreetingStatus('Birthday greeting is not supported in this browser.');
  } else {
    renderGreetingToggle();
    announceGreetingStatus('Birthday greeting is enabled and will play with the cake reveal.');
  }

  greetingToggle?.addEventListener('click', () => {
    if (!speechSupported) return;
    greetingEnabled = !greetingEnabled;
    renderGreetingToggle();
    if (!greetingEnabled) {
      if (greetingTimer) window.clearTimeout(greetingTimer);
      greetingTimer = 0;
      greetingRequestToken += 1;
      greetingRequestPending = false;
      if (activeGreeting) {
        try { speechEngine.cancel(); } catch { /* Some browsers may reject cancellation during startup. */ }
      }
      activeGreeting = null;
      window.clearTimeout(greetingGlowTimer);
      birthdayScene?.classList.remove('greeting-active');
      announceGreetingStatus('Birthday greeting muted.');
      return;
    }
    announceGreetingStatus(greetingAttempted ? 'Birthday greeting enabled. It will not repeat this visit.' : 'Birthday greeting enabled.');
    if (currentScene === 2 && greetingExperienceStarted) scheduleBirthdayGreeting(250);
  });

  activateScene(currentScene);
})();
