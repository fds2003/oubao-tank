/**
 * bgm.js - 背景音乐系统
 * 使用Web Audio API程序化生成BGM
 */
var BGM = (function(){
 // 音符频率映射
 const NOTE_FREQ = {
  'C3':130.81,'D3':146.83,'E3':164.81,'F3':174.61,'G3':196.00,'A3':220.00,'B3':246.94,
  'C4':261.63,'D4':293.66,'E4':329.63,'F4':349.23,'G4':392.00,'A4':440.00,'B4':493.88,
  'C5':523.25,'D5':587.33,'E5':659.25,'F5':698.46,'G5':783.99,'A5':880.00,
 };

 // 曲目定义
 const TRACKS = {
  menu: {
   bpm: 120,
   notes: [
    {n:'E4',d:0.5},{n:'G4',d:0.5},{n:'A4',d:1},{n:'G4',d:0.5},{n:'E4',d:0.5},
    {n:'D4',d:1},{n:'C4',d:0.5},{n:'D4',d:0.5},{n:'E4',d:1},{n:'C4',d:1},
   ]
  },
  battle: {
   bpm: 160,
   notes: [
    {n:'C4',d:0.25},{n:'C4',d:0.25},{n:'G4',d:0.25},{n:'G4',d:0.25},
    {n:'A4',d:0.25},{n:'A4',d:0.25},{n:'G4',d:0.5},
    {n:'F4',d:0.25},{n:'F4',d:0.25},{n:'E4',d:0.25},{n:'E4',d:0.25},
    {n:'D4',d:0.25},{n:'D4',d:0.25},{n:'C4',d:0.5},
   ]
  },
  victory: {
   bpm: 140,
   notes: [
    {n:'C4',d:0.5},{n:'E4',d:0.5},{n:'G4',d:0.5},{n:'C5',d:1},
    {n:'B4',d:0.5},{n:'A4',d:0.5},{n:'G4',d:1},
    {n:'C5',d:0.5},{n:'B4',d:0.5},{n:'A4',d:0.5},{n:'G4',d:1},
   ]
  }
 };

 class BGM {
  constructor() {
   this.tracks = TRACKS;
   this.currentTrack = null;
   this.isPlaying = false;
   this.isPaused = false;
   this.volume = 0.3;
   this.muted = false;
   this.audioCtx = null;
   this.gainNode = null;
   this.scheduledNodes = [];
   this.loopTimer = null;
  }

  _initAudio() {
   if (this.audioCtx) return;
   try {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.audioCtx.destination);
   } catch(e) { console.warn('BGM init failed:', e); }
  }

  play(trackName) {
   if (!this.tracks[trackName]) return;
   this._initAudio();
   this.stop();
   this.currentTrack = trackName;
   this.isPlaying = true;
   this.isPaused = false;
   this._scheduleNotes();
  }

  _scheduleNotes() {
   if (!this.isPlaying || !this.currentTrack || !this.audioCtx) return;
   const track = this.tracks[this.currentTrack];
   const beatDur = 60 / track.bpm;
   let time = this.audioCtx.currentTime + 0.05;

   for (const note of track.notes) {
    const freq = NOTE_FREQ[note.n];
    if (freq) {
     this._playNote(freq, time, note.d * beatDur * 0.8);
    }
    time += note.d * beatDur;
   }

   // 循环
   const totalDur = time - this.audioCtx.currentTime - 0.05;
   this.loopTimer = setTimeout(() => {
    if (this.isPlaying && !this.isPaused) this._scheduleNotes();
   }, totalDur * 1000);
  }

  _playNote(freq, startTime, duration) {
   if (!this.audioCtx || !this.gainNode) return;
   const osc = this.audioCtx.createOscillator();
   const env = this.audioCtx.createGain();
   osc.type = 'sine';
   osc.frequency.value = freq;
   env.gain.setValueAtTime(0, startTime);
   env.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
   env.gain.linearRampToValueAtTime(0, startTime + duration);
   osc.connect(env);
   env.connect(this.gainNode);
   osc.start(startTime);
   osc.stop(startTime + duration + 0.01);
   this.scheduledNodes.push(osc);
  }

  stop() {
   this.isPlaying = false;
   this.isPaused = false;
   this.currentTrack = null;
   if (this.loopTimer) { clearTimeout(this.loopTimer); this.loopTimer = null; }
   for (const node of this.scheduledNodes) {
    try { node.stop(); } catch(e) { console.warn('BGM node.stop failed:', e); }
   }
   this.scheduledNodes = [];
  }

  pause() {
   if (!this.isPlaying) return;
   this.isPaused = true;
   if (this.loopTimer) { clearTimeout(this.loopTimer); this.loopTimer = null; }
   for (const node of this.scheduledNodes) {
    try { node.stop(); } catch(e) { console.warn('BGM node.stop failed:', e); }
   }
   this.scheduledNodes = [];
  }

  resume() {
   if (!this.isPaused || !this.currentTrack) return;
   this.isPaused = false;
   this.isPlaying = true;
   this._scheduleNotes();
  }

  setVolume(v) {
   this.volume = Math.max(0, Math.min(1, v));
   if (this.gainNode) this.gainNode.gain.value = this.muted ? 0 : this.volume;
  }

  mute() {
   this.muted = true;
   if (this.gainNode) this.gainNode.gain.value = 0;
  }

  unmute() {
   this.muted = false;
   if (this.gainNode) this.gainNode.gain.value = this.volume;
  }

  getState() {
   if (this.isPaused) return 'paused';
   if (this.isPlaying) return 'playing';
   return 'stopped';
  }
 }

 return BGM;
})();
