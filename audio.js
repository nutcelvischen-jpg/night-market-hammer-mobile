    class SoundFX {
      constructor() {
        this.ctx = null;
        this.muted = false;
      }
      init() {
        try {
          if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return false;
            this.ctx = new AudioContext();
            this.master = this.ctx.createGain(); this.effects = this.ctx.createGain(); this.voice = this.ctx.createGain();
            this.master.gain.value = this.muted ? 0 : .85;
            this.effects.gain.value = .38; this.voice.gain.value = 1;
            this.effects.connect(this.master); this.voice.connect(this.master); this.master.connect(this.ctx.destination);
          }
          if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
          return true;
        } catch (_) { return false; }
      }
      setMuted(muted) {
        this.muted = muted;
        if (this.init()) this.master.gain.setTargetAtTime(muted ? 0 : .85, this.ctx.currentTime, .015);
      }

      // 拉起鐵鎚肌肉緊繃音 (Muscle strain / leather creak)
      playStrain() {
        if (!this.init()) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, t);
        osc.frequency.linearRampToValueAtTime(110, t + 0.3);
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.2);
        gain.gain.linearRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.effects);
        osc.start(t);
        osc.stop(t + 0.3);
      }

      // 鐵鎚向下猛砸呼嘯聲 (Heavy wind whoosh)
      playSwingWhoosh(duration = 0.6) {
        if (!this.init()) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + duration * 0.7);
        osc.frequency.exponentialRampToValueAtTime(70, t + duration);
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.5, t + duration * 0.7);
        gain.gain.linearRampToValueAtTime(0.01, t + duration);
        osc.connect(gain);
        gain.connect(this.effects);
        osc.start(t);
        osc.stop(t + duration);
      }

      // 命中清脆金屬聲
      playMetalClang(intensity = 1.0, isSharp = false) {
        if (!this.init()) return;
        const t = this.ctx.currentTime;
        
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = isSharp ? 'triangle' : 'sine';
        osc1.frequency.setValueAtTime(isSharp ? 1800 : 1100, t);
        osc1.frequency.exponentialRampToValueAtTime(isSharp ? 3200 : 620, t + 0.35);
        gain1.gain.setValueAtTime(0.8 * intensity, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc1.connect(gain1);
        gain1.connect(this.effects);
        osc1.start(t);
        osc1.stop(t + 0.5);

        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(280, t);
        osc2.frequency.exponentialRampToValueAtTime(65, t + 0.35);
        gain2.gain.setValueAtTime(0.9 * intensity, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc2.connect(gain2);
        gain2.connect(this.effects);
        osc2.start(t);
        osc2.stop(t + 0.45);
      }

      // 木頭被擠壓沉入音效
      playWoodCreak(duration = 0.6) {
        if (!this.init()) return;
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.08) * (1 - i / bufferSize);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, t);
        filter.Q.setValueAtTime(3.5, t);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.linearRampToValueAtTime(0.001, t + duration);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.effects);
        noise.start(t);
      }

      playCheer() {
        if (!this.init()) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const t = this.ctx.currentTime + idx * 0.08;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.4, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          osc.connect(gain);
          gain.connect(this.effects);
          osc.start(t);
          osc.stop(t + 0.4);
        });
      }

      playCrack() {
        if (!this.init()) return;
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.05) * Math.exp(-i / (bufferSize * 0.3));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.9, t);
        noise.connect(gain);
        gain.connect(this.effects);
        noise.start(t);
      }
    }
    const sfx = new SoundFX();

    const BOSS_LINES = {"intro": {"subtitle": "叮叮當！敲壞不用賠！", "tailo": "Ting-ting-tang! Kòng-pháinn bián puê!"}, "miss_air": {"subtitle": "你咧拍空氣喔？", "tailo": "Lí teh phah khong-khì--oo?"}, "miss_love": {"subtitle": "哎喲，你咧疼伊喔？", "tailo": "Ai-io, lí teh thiànn i--oo?"}, "bent_dance": {"subtitle": "釘仔咧跳舞喔？", "tailo": "Ting-á teh thiàu-bú--oo?"}, "bent_heart": {"subtitle": "免賠啦！我心疼爾爾。", "tailo": "Bián puê--lah! Guá sim-thiànn niā-niā."}, "success": {"subtitle": "保利達 B！！", "tailo": "Pó-li̍k-ta̍t B!"}};
    // BEGIN BOSS AUDIO — local clips only; no browser API credentials.
    class BossVoice {
      constructor() {
        this.bytes = new Map(); this.decoded = new Map(); this.previous = {};
        this.token = 0; this.source = null; this.captionTimer = null; this.lastAt = -Infinity;
        this.groups = {intro:['intro'], miss:['miss_air','miss_love'], bent:['bent_dance','bent_heart'], success:['success']};
      }
      preload() {
        for (const id of Object.keys(BOSS_LINES)) this.load(id);
      }
      load(id) {
        if (!this.bytes.has(id)) {
          this.bytes.set(id, Promise.resolve().then(() => fetch(`voice/${id}.mp3?v=2-gravel`))
            .then(r => r.ok ? r.arrayBuffer() : null).catch(() => null));
        }
        return this.bytes.get(id);
      }
      async buffer(id) {
        const bytes = await this.load(id);
        if (!bytes || !sfx.ctx) return null;
        if (!this.decoded.has(id)) this.decoded.set(id, Promise.resolve().then(() => sfx.ctx.decodeAudioData(bytes.slice(0))).catch(() => null));
        return this.decoded.get(id);
      }
      duck(active) {
        if (sfx.effects) sfx.effects.gain.setTargetAtTime(active ? .12 : .38, sfx.ctx.currentTime, .045);
      }
      stop() {
        this.token++;
        clearTimeout(this.captionTimer);
        if (this.source) { this.source.onended = null; this.source.stop(); this.source.disconnect(); this.source = null; }
        this.duck(false);
        document.getElementById('boss-caption').hidden = true;
      }
      caption(id, duration) {
        const line = BOSS_LINES[id];
        document.getElementById('boss-line').textContent = line.subtitle;
        document.getElementById('boss-tailo').textContent = line.tailo;
        document.getElementById('boss-caption').hidden = false;
        clearTimeout(this.captionTimer);
        this.captionTimer = setTimeout(() => { document.getElementById('boss-caption').hidden = true; }, duration * 1000);
      }
      async play(event, preview = false) {
        const options = this.groups[event];
        if (!options || document.hidden) return;
        const now = performance.now();
        if (!preview && event !== 'success' && now - this.lastAt < 900) return;
        const choices = options.filter(id => id !== this.previous[event]);
        const pool = choices.length ? choices : options;
        const id = pool[Math.floor(Math.random() * pool.length)];
        this.previous[event] = id; this.lastAt = now;
        this.stop(); const token = this.token;
        if (!sfx.init() || sfx.muted) { this.caption(id, 2.8); return; }
        const buffer = await this.buffer(id);
        // A reset, mute, new event or slow network must never revive stale dialogue.
        if (token !== this.token || document.hidden || sfx.muted || performance.now() - now > 1500) return;
        if (!buffer) { this.caption(id, 2.8); return; }
        try {
          const source = sfx.ctx.createBufferSource(); source.buffer = buffer;
          source.connect(sfx.voice); this.source = source;
          source.onended = () => {
            if (this.source === source) { this.source = null; source.disconnect(); this.duck(false); }
          };
          this.duck(true); this.caption(id, Math.max(2.2, buffer.duration + .2)); source.start();
        } catch (_) { this.stop(); }
      }
    }
    const boss = new BossVoice();
    boss.preload();

export { sfx, boss };
