(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initClock();
    initGoogleSearch();
    initMJSearch();
    initContactForm();
    initAccountMenu();
    initAccountState();
    syncWorldTime();
  });

  function initNavigation() {
    const nav = $('#navbar');
    const links = $$('.nav-links a');
    const sections = $$('header.page-section, section.page-section');

    const setActive = id => links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
    links.forEach(link => link.addEventListener('click', () => setActive(link.getAttribute('href').slice(1))));

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) setActive(entry.target.id);
      }), { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
      sections.forEach(section => observer.observe(section));
    }

    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 30), { passive: true });
  }

  function initClock() {
    const button = $('#clock-logo');
    const hour = $('#clock-hour');
    const minute = $('#clock-minute');
    const second = $('#clock-second');
    const heroAnchor = $('#hero-clock-anchor');
    const navSlot = $('.nav-brand-slot');
    if (!button || !hour || !minute || !second || !heroAnchor || !navSlot) return;

    let audioContext = null;
    let windGain = null;
    let windSource = null;
    let clockDocked = false;
    let wallpaperOn = localStorage.getItem('mj-radha-wallpaper') === '1';

    const wallpaperLayer = document.createElement('div');
    wallpaperLayer.className = 'radha-wallpaper-layer';
    wallpaperLayer.setAttribute('aria-hidden', 'true');
    wallpaperLayer.innerHTML = '<div class="radha-glow"></div>';
    document.body.appendChild(wallpaperLayer);

    const setWallpaper = enabled => {
      wallpaperOn = enabled;
      document.body.classList.toggle('radha-active', enabled);
      wallpaperLayer.classList.toggle('visible', enabled);
      button.setAttribute('aria-label', enabled ? 'MJ clock. Radha Krishna wallpaper is active.' : 'MJ clock. Click to show the Radha Krishna wallpaper.');
      if (enabled) localStorage.setItem('mj-radha-wallpaper', '1');
      else localStorage.removeItem('mj-radha-wallpaper');
    };
    setWallpaper(wallpaperOn);

    const updateHands = () => {
      const now = new Date(Date.now() + (window.__MJ_SERVER_OFFSET__ || 0));
      const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
      const minutes = now.getMinutes() + seconds / 60;
      const hours = (now.getHours() % 12) + minutes / 60;
      second.style.transform = `rotate(${seconds * 6}deg)`;
      minute.style.transform = `rotate(${minutes * 6}deg)`;
      hour.style.transform = `rotate(${hours * 30}deg)`;
    };
    updateHands(); setInterval(updateHands, 50);

    const getHeroPosition = () => {
      const r = heroAnchor.getBoundingClientRect();
      return { top: r.top + window.scrollY + (r.height - 10) / 2, left: r.left + (r.width - 10) / 2, width: 10, height: 10 };
    };
    const getNavPosition = () => {
      const r = navSlot.getBoundingClientRect();
      const size = parseFloat(getComputedStyle(button).getPropertyValue('--clock-nav-size')) || 46;
      return { top: r.top + (r.height - size) / 2, left: r.left + (r.width - size) / 2, width: size, height: size };
    };
    const applyPosition = pos => {
      button.style.top = `${pos.top}px`;
      button.style.left = `${pos.left}px`;
      button.style.width = `${pos.width}px`;
      button.style.height = `${pos.height}px`;
    };

    // First load: the clock is only a tiny dot. It becomes the full clock ONLY after scrolling/swiping.
    applyPosition(getHeroPosition());
    document.body.classList.remove('clock-is-docked');
    button.classList.remove('clock-visible');

    const dockClock = () => {
      if (clockDocked) return;
      clockDocked = true;
      button.classList.add('clock-visible', 'clock-docking');
      requestAnimationFrame(() => requestAnimationFrame(() => applyPosition(getNavPosition())));
      document.body.classList.add('clock-is-docked');
      setTimeout(() => button.classList.remove('clock-docking'), 1700);
    };
    const onScroll = () => { if (window.scrollY > 28) dockClock(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      if (clockDocked) applyPosition(getNavPosition());
      else applyPosition(getHeroPosition());
    });

    const startBreeze = async () => {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      if (!audioContext) {
        audioContext = new Ctx();
        const bufferSize = audioContext.sampleRate * 4;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0); let last = 0;
        for (let i = 0; i < bufferSize; i++) { const white = Math.random() * 2 - 1; last = last * .985 + white * .15; data[i] = last * .55; }
        windSource = audioContext.createBufferSource(); windSource.buffer = buffer; windSource.loop = true;
        const filter = audioContext.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1100; filter.Q.value = .35;
        windGain = audioContext.createGain(); windGain.gain.value = .0001;
        windSource.connect(filter).connect(windGain).connect(audioContext.destination); windSource.start();
      }
      if (audioContext.state === 'suspended') await audioContext.resume();
      if (windGain) { const t = audioContext.currentTime; windGain.gain.cancelScheduledValues(t); windGain.gain.setValueAtTime(.0001, t); windGain.gain.exponentialRampToValueAtTime(.010, t + .55); }
    };

    // Clock interaction:
    // - A click smoothly brings the clock to the exact center of the viewport.
    // - The movement/reveal uses a smooth 6-second cinematic motion.
    // - A real-time analog clock continues running while the animation plays.
    // - Tick audio starts from the user's click, so it is allowed by browser
    //   autoplay rules, and continues once per second while the clock is open.
    let clockCenterOpen = false;
    let tickTimer = null;
    let autoReturnTimer = null;
    let tickAudioContext = null;

    const centerClock = () => ({
      top: Math.max(70, (window.innerHeight - 92) / 2 - Math.min(90, window.innerHeight * 0.08)),
      left: (window.innerWidth - 92) / 2, width: 92, height: 92
    });

    // Gentle mechanical clock tick with a soft heartbeat-like pulse.
    let tickPhase = false;
    const playTick = () => {
      const Ctx=window.AudioContext||window.webkitAudioContext; if(!Ctx)return;
      if(!tickAudioContext) tickAudioContext=audioContext||new Ctx(); audioContext=tickAudioContext;
      if(audioContext.state==='suspended') audioContext.resume().catch(()=>{});
      const t=audioContext.currentTime;
      const buffer=audioContext.createBuffer(1,Math.floor(audioContext.sampleRate*.075),audioContext.sampleRate);
      const data=buffer.getChannelData(0); let last=0;
      for(let i=0;i<data.length;i++){last=last*.72+(Math.random()*2-1)*.28;data[i]=last*Math.exp(-i/(audioContext.sampleRate*.018));}
      const src=audioContext.createBufferSource();src.buffer=buffer;
      const filter=audioContext.createBiquadFilter();filter.type='bandpass';filter.frequency.value=tickPhase?1850:2150;filter.Q.value=1.15;
      const gain=audioContext.createGain();gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.38,t+.001);gain.gain.exponentialRampToValueAtTime(.0001,t+.065);
      src.connect(filter).connect(gain).connect(audioContext.destination);src.start(t);
      const bell=audioContext.createOscillator();bell.type='sine';bell.frequency.setValueAtTime(tickPhase?2050:2350,t);bell.frequency.exponentialRampToValueAtTime(tickPhase?1250:1450,t+.055);
      const bg=audioContext.createGain();bg.gain.setValueAtTime(.0001,t);bg.gain.exponentialRampToValueAtTime(.085,t+.001);bg.gain.exponentialRampToValueAtTime(.0001,t+.09);
      bell.connect(bg).connect(audioContext.destination);bell.start(t);bell.stop(t+.095);
      const heart=audioContext.createOscillator();heart.type='sine';heart.frequency.setValueAtTime(72,t);heart.frequency.exponentialRampToValueAtTime(48,t+.10);
      const hg=audioContext.createGain();hg.gain.setValueAtTime(.0001,t);hg.gain.exponentialRampToValueAtTime(.04,t+.012);hg.gain.exponentialRampToValueAtTime(.0001,t+.11);
      heart.connect(hg).connect(audioContext.destination);heart.start(t);heart.stop(t+.12);tickPhase=!tickPhase;
    };
    const startTicks=async()=>{
      if(tickTimer)clearInterval(tickTimer);
      const Ctx=window.AudioContext||window.webkitAudioContext;
      if(!Ctx)return;
      try{
        if(!audioContext) audioContext=new Ctx();
        if(audioContext.state==='suspended') await audioContext.resume();
        if(audioContext.state!=='running') return;
        tickAudioContext=audioContext;
        playTick();
        tickTimer=setInterval(playTick,1000);
      }catch(_){ /* Audio is optional; the clock itself keeps working. */ }
    };
    const stopClockAudio=()=>{
      if(tickTimer){clearInterval(tickTimer);tickTimer=null;}
      if(autoReturnTimer){clearTimeout(autoReturnTimer);autoReturnTimer=null;}
      if(windGain && audioContext && audioContext.state === 'running'){
        const t=audioContext.currentTime;
        windGain.gain.cancelScheduledValues(t);
        windGain.gain.setValueAtTime(Math.max(0.0001, windGain.gain.value || 0.0001), t);
        windGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      }
      // The clock owns this Web Audio context. Suspending it guarantees that both
      // the looping breeze and any scheduled tick/heartbeat sounds stop when the
      // clock returns to its normal position. It can be resumed on the next tap.
      if(audioContext && audioContext.state === 'running'){
        audioContext.suspend().catch(()=>{});
      }
    };
    const stopTicks=stopClockAudio;

    const closeClockFromCenter=()=>{
      if(!clockCenterOpen)return; clockCenterOpen=false;stopTicks();button.classList.remove('clock-center-open');button.setAttribute('aria-expanded','false');document.body.classList.remove('clock-center-active');
      button.style.transition='top 6s cubic-bezier(.16,1,.3,1), left 6s cubic-bezier(.16,1,.3,1), width 6s cubic-bezier(.16,1,.3,1), height 6s cubic-bezier(.16,1,.3,1), transform 700ms ease, filter 700ms ease';
      requestAnimationFrame(()=>requestAnimationFrame(()=>applyPosition(clockDocked?getNavPosition():getHeroPosition())));
      setTimeout(()=>{if(!clockCenterOpen)button.style.transition='';},6050);
    };
    const openClockInCenter=async()=>{
      clockCenterOpen=true;button.classList.add('clock-center-open','clock-bloom');button.setAttribute('aria-expanded','true');document.body.classList.add('clock-center-active');
      button.style.transition='top 6s cubic-bezier(.16,1,.3,1), left 6s cubic-bezier(.16,1,.3,1), width 6s cubic-bezier(.16,1,.3,1), height 6s cubic-bezier(.16,1,.3,1), transform 700ms ease, filter 700ms ease';
      requestAnimationFrame(()=>requestAnimationFrame(()=>applyPosition(centerClock())));
      await startBreeze().catch(()=>{});
      await startTicks();
      setWallpaper(true);setTimeout(()=>button.classList.remove('clock-bloom'),700);
      autoReturnTimer=setTimeout(closeClockFromCenter,6000);
    };
    button.addEventListener('click',async()=>{if(clockCenterOpen)closeClockFromCenter();else await openClockInCenter();});
    button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(clockCenterOpen)closeClockFromCenter();else openClockInCenter();}});
    window.addEventListener('resize',()=>{if(clockCenterOpen)applyPosition(centerClock());});
  }

  function initAccountMenu() {
    const trigger=$('#account-nav-trigger'), dropdown=$('#account-dropdown');
    const statusDot=$('#account-status-dot');
    if(!trigger||!dropdown) return;
    const isSignedIn=()=>!!statusDot?.classList.contains('connected');
    const close=()=>{trigger.setAttribute('aria-expanded','false'); dropdown.setAttribute('aria-hidden','true'); dropdown.classList.remove('open');};
    trigger.addEventListener('click',e=>{
      e.stopPropagation();
      if(isSignedIn()){ window.location.href='account-center.php'; return; }
      const open=trigger.getAttribute('aria-expanded')!=='true';
      if(open){trigger.setAttribute('aria-expanded','true');dropdown.setAttribute('aria-hidden','false');dropdown.classList.add('open');}else close();
    });
    trigger.addEventListener('mouseenter',()=>{
      if(isSignedIn()) return;
      trigger.setAttribute('aria-expanded','true');dropdown.setAttribute('aria-hidden','false');dropdown.classList.add('open');
    });
    document.addEventListener('click',e=>{if(!e.target.closest('.account-nav-item')) close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape') close();});
  }

  async function initAccountState() {
    const navLogin = $('#account-link-login');
    const navRegister = $('#account-link-register');
    const statusDot = $('#account-status-dot');

    // Nothing on this page needs the login state; skip the network call.
    if (!navLogin) return;

    const showSignedIn = (signedIn) => {
      navLogin.hidden = signedIn;
      if (navRegister) navRegister.hidden = signedIn;
      if (statusDot) statusDot.classList.toggle('connected', signedIn);
    };

    try {
      const response = await fetch('php/auth.php?mode=status', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store'
      });
      const data = await response.json();
      showSignedIn(!!data.authenticated);
    } catch {
      // Can't reach the PHP server: default to the signed-out view.
      showSignedIn(false);
    }
  }

  async function syncWorldTime() {
    const display = $('#world-time');

    // Ask the PHP time API for a trusted timestamp and remember the
    // difference from this device's clock. initClock() reads this same
    // offset to keep the hero clock hands in sync with the server.
    try {
      const response = await fetch('php/api.php?mode=time', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const data = await response.json();
      if (data.success && typeof data.timestamp_ms === 'number') {
        window.__MJ_SERVER_OFFSET__ = data.timestamp_ms - Date.now();
      }
    } catch {
      // Offline or the PHP server isn't reachable: fall back to local device time.
    }

    if (!display) return;

    const updateTime = () => {
      const now = new Date(Date.now() + (window.__MJ_SERVER_OFFSET__ || 0));
      const time = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const date = now.toLocaleDateString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      display.textContent = `${date} · ${time}`;
    };

    updateTime();
    window.setInterval(updateTime, 1000);
  }

  function initGoogleSearch() {
    const panel = $('#search-panel');
    const input = $('#google-search-input');
    $('#search-toggle')?.addEventListener('click', () => { panel.classList.add('open'); panel.setAttribute('aria-hidden', 'false'); setTimeout(() => input?.focus(), 100); });
    $$('[data-close-search]').forEach(el => el.addEventListener('click', () => { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { panel.classList.remove('open'); panel.setAttribute('aria-hidden', 'true'); } });
  }

  function initMJSearch() {
    const input = $('#google-search-input');
    const button = $('#mj-search-button');
    const results = $('#mj-search-results');
    if (!input || !button || !results) return;
    const searchable = $$('main .page-section');
    button.addEventListener('click', () => {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        results.innerHTML = '<p>Type something to search inside MJ.</p>';
        input.focus();
        return;
      }
      const matches = [];
      searchable.forEach(section => {
        const text = section.textContent.toLowerCase();
        if (text.includes(query)) {
          const title = $('h1, h2, h3', section)?.textContent.trim() || section.id;
          matches.push({ id: section.id, title });
        }
      });
      if (!matches.length) {
        results.innerHTML = '<p>No matching content found in MJ.</p>';
        return;
      }
      results.innerHTML = `<p>${matches.length} matching section${matches.length > 1 ? 's' : ''} in MJ:</p>` +
        matches.map(item => `<a href="#${item.id}" data-mj-result="${item.id}">${item.title}</a>`).join('');
      $$('[data-mj-result]', results).forEach(link => link.addEventListener('click', () => {
        $('#search-panel').classList.remove('open');
        $('#search-panel').setAttribute('aria-hidden', 'true');
      }));
    });
  }

  async function initContactForm() {
    const form = $('#contact-form');
    const status = $('#form-status');
    if (!form || !status) return;
    try {
      const tokenResponse = await fetch('php/contact.php?mode=token', { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        $('#csrf-token').value = tokenData.csrf_token || '';
      }
    } catch {}

    form.addEventListener('submit', async event => {
      event.preventDefault();
      status.className = 'form-status'; status.textContent = 'Sending…';
      try {
        const response = await fetch('php/contact.php', { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Message could not be sent.');
        status.className = 'form-status success'; status.textContent = data.message; form.reset();
        const tokenResponse = await fetch('php/contact.php?mode=token', { cache: 'no-store' });
        if (tokenResponse.ok) $('#csrf-token').value = (await tokenResponse.json()).csrf_token || '';
      } catch (error) {
        status.className = 'form-status error'; status.textContent = error.message || 'Could not reach the PHP server.';
      }
    });
  }

})();
