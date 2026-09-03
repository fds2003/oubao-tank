'use strict';
// 触屏虚拟摇杆：检测触屏设备，创建「移动摇杆 + 开火按钮」，把虚拟输入写入 Input.held
// 复用现有键盘键码（P1=WASD+Space，P2=方向键+Enter），零侵入 tank.js 的移动/开火逻辑
const Touch = {
  enabled: false,
  root: null,
  game: null,
  _timer: null,
  _groups: [],
  DEADZONE: 0.3,
  keys: [
    { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'Space' },
    { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', fire: 'Enter' }
  ],

  init(game) {
    this.game = game;
    if (!('ontouchstart' in window) && !(navigator.maxTouchPoints > 0)) return;
    this.enabled = true;
    this._buildUI();
    this._bind();
    this.sync();
    this._timer = setInterval(() => this.sync(), 150);
  },

  _buildUI() {
    this.root = document.createElement('div');
    this.root.className = 'touch-ui';
    for (let p = 0; p < 2; p++) {
      const joy = document.createElement('div');
      joy.className = 'joy';
      joy.dataset.player = p;
      const base = document.createElement('div');
      base.className = 'joy-base';
      const knob = document.createElement('div');
      knob.className = 'joy-knob';
      joy.appendChild(base); joy.appendChild(knob);

      const fire = document.createElement('div');
      fire.className = 'fire-btn';
      fire.dataset.player = p;
      fire.textContent = '开火';

      this.root.appendChild(joy);
      this.root.appendChild(fire);
      this._groups.push({ player: p, joy, base, knob, fire, stickId: null, fireId: null });
    }
    document.body.appendChild(this.root);
  },

  _bind() {
    this._groups.forEach(g => {
      g.joy.addEventListener('touchstart', e => this._stickDown(e, g), { passive: false });
      g.joy.addEventListener('touchmove', e => this._stickMove(e, g), { passive: false });
      g.joy.addEventListener('touchend', e => this._stickUp(e, g), { passive: false });
      g.joy.addEventListener('touchcancel', e => this._stickUp(e, g), { passive: false });
      g.fire.addEventListener('touchstart', e => this._fireDown(e, g), { passive: false });
      g.fire.addEventListener('touchend', e => this._fireUp(e, g), { passive: false });
      g.fire.addEventListener('touchcancel', e => this._fireUp(e, g), { passive: false });
    });
  },

  _findTouch(e, id) {
    if (id === null) return null;
    for (const t of e.touches) if (t.identifier === id) return t;
    for (const t of e.changedTouches) if (t.identifier === id) return t;
    return null;
  },

  _stickDown(e, g) {
    e.preventDefault();
    if (g.stickId !== null) return; // 已被占用
    const t = e.changedTouches[0];
    if (!t) return;
    g.stickId = t.identifier;
    this._stickMove(e, g);
  },

  _stickMove(e, g) {
    e.preventDefault();
    const t = this._findTouch(e, g.stickId);
    if (!t) return;
    const rect = g.base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = rect.width / 2;
    let dx = t.clientX - cx, dy = t.clientY - cy;
    const mag = Math.hypot(dx, dy);
    if (mag > r) { dx = dx / mag * r; dy = dy / mag * r; }
    g.knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    const dir = (mag < r * this.DEADZONE) ? null
      : (Math.abs(dx) > Math.abs(dy)) ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');
    this._setDir(g.player, dir);
  },

  _stickUp(e, g) {
    if (this._findTouch(e, g.stickId)) g.stickId = null;
    this._setDir(g.player, null);
    g.knob.style.transform = 'translate(0,0)';
  },

  _fireDown(e, g) {
    e.preventDefault();
    if (g.fireId !== null) return;
    const t = e.changedTouches[0];
    if (!t) return;
    g.fireId = t.identifier;
    this._setFire(g.player, true);
    g.fire.classList.add('active');
  },

  _fireUp(e, g) {
    if (this._findTouch(e, g.fireId)) g.fireId = null;
    this._setFire(g.player, false);
    g.fire.classList.remove('active');
  },

  _setDir(player, dir) {
    const k = this.keys[player];
    for (const key of [k.up, k.down, k.left, k.right]) Input.held.delete(key);
    if (dir) Input.held.add(k[dir]);
  },

  _setFire(player, on) {
    const k = this.keys[player];
    if (on) Input.held.add(k.fire); else Input.held.delete(k.fire);
  },

  // 依据游戏状态/模式，显示或隐藏摇杆、切换单双人布局
  sync() {
    if (!this.enabled) return;
    const g = this.game;
    const playing = g && (g.state === 'play' || g.state === 'countdown');
    const duo = g && (g.gameMode === 1 || g.gameMode === 2);
    this.root.classList.toggle('show', playing);
    this.root.classList.toggle('duo', duo);
    if (this.menuBtn) this.menuBtn.classList.toggle('show', g && g.state === 'menu');
    if (!playing) {
      for (let p = 0; p < 2; p++) { this._setDir(p, null); this._setFire(p, false); }
    }
  }
};
