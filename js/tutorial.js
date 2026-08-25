'use strict';

/**
 * 新手引导系统
 * Tutorial - 引导新玩家学习基本操作
 */

var TUTORIAL_STORAGE_KEY = 'oubao_tutorial_done';

var TUTORIAL_STEPS = [
  {
    id: 'mode_select',
    title: '选择模式',
    description: '按 1 选择单人模式\n按 2 选择双人模式\n按 3 选择协作模式',
    highlight: { x: 500, y: 126, w: 640, h: 42 },
    position: 'bottom'
  },
  {
    id: 'map_select',
    title: '选择地图',
    description: '按 ← → 键\n选择你喜欢的战场',
    highlight: { x: 330, y: 206, w: 940, h: 180 },
    position: 'bottom'
  },
  {
    id: 'difficulty',
    title: '调整难度',
    description: '按 Q 切换难度\n按 Z - 减少AI数量\n按 X + 增加AI数量',
    highlight: { x: 580, y: 380, w: 200, h: 60 },
    position: 'bottom'
  },
  {
    id: 'controls_move',
    title: '移动操作',
    description: '玩家1: WASD 移动\n玩家2: 方向键 移动',
    highlight: null,
    position: 'center'
  },
  {
    id: 'controls_fire',
    title: '开火操作',
    description: '玩家1: F 或 空格 开火\n玩家2: L 或 回车 开火',
    highlight: null,
    position: 'center'
  }
];

var Tutorial = class Tutorial {
  constructor() {
    this.state = 'idle';
    this.currentStep = 0;
    this.steps = TUTORIAL_STEPS;
    this.fadeAlpha = 0;
    this.stepTimer = 0;
    this.stepDuration = 4;
    this.autoAdvance = true;
  }

  static shouldShow() {
    try {
      return localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'true';
    } catch (e) {
      return true;
    }
  }

  static markCompleted() {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch (e) { console.warn('Tutorial save failed:', e); }
  }

  static reset() {
    try {
      localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    } catch (e) { console.warn('Tutorial reset failed:', e); }
  }

  start() {
    if (this.state !== 'idle') return;
    this.state = 'active';
    this.currentStep = 0;
    this.fadeAlpha = 0;
    this.stepTimer = 0;
    AudioSys.beep();
  }

  skip() {
    this.state = 'skipped';
    Tutorial.markCompleted();
  }

  complete() {
    this.state = 'completed';
    Tutorial.markCompleted();
    AudioSys.pickup();
  }

  nextStep() {
    if (this.state !== 'active') return;
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.stepTimer = 0;
      AudioSys.beep();
    } else {
      this.complete();
    }
  }

  prevStep() {
    if (this.state !== 'active') return;
    if (this.currentStep > 0) {
      this.currentStep--;
      this.stepTimer = 0;
      AudioSys.beep();
    }
  }

  getCurrentStep() {
    if (this.state !== 'active') return null;
    return this.steps[this.currentStep];
  }

  update(dt) {
    if (this.state !== 'active') return;
    if (this.fadeAlpha < 1) {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + dt * 3);
    }
    if (this.autoAdvance) {
      this.stepTimer += dt;
      if (this.stepTimer >= this.stepDuration) {
        this.nextStep();
      }
    }
  }

  draw(ctx) {
    if (this.state !== 'active') return;
    var step = this.getCurrentStep();
    if (!step) return;

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha * 0.85;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (step.highlight) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = 'rgba(255, 210, 63, 0.15)';
      ctx.fillRect(step.highlight.x, step.highlight.y, step.highlight.w, step.highlight.h);
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.strokeRect(step.highlight.x, step.highlight.y, step.highlight.w, step.highlight.h);
    }

    ctx.globalAlpha = this.fadeAlpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 32px ' + FONT;
    ctx.fillStyle = '#ffd23f';
    ctx.shadowColor = '#ff8c42';
    ctx.shadowBlur = 20;
    ctx.fillText(step.title, VIEW_W / 2, VIEW_H / 2 - 40);
    ctx.shadowBlur = 0;

    ctx.font = '20px ' + FONT;
    ctx.fillStyle = '#e8edf5';
    var lines = step.description.split('\n');
    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], VIEW_W / 2, VIEW_H / 2 + 10 + i * 28);
    }

    ctx.font = '16px ' + FONT;
    ctx.fillStyle = '#7a8599';
    ctx.fillText((this.currentStep + 1) + ' / ' + this.steps.length, VIEW_W / 2, VIEW_H / 2 + 80);

    ctx.font = '14px ' + FONT;
    ctx.fillStyle = '#5a6478';
    ctx.fillText('按任意键继续 · 按 Esc 跳过', VIEW_W / 2, VIEW_H - 60);

    ctx.restore();
  }

  handleInput(keyCode) {
    if (this.state !== 'active') return;
    if (keyCode === 'Escape') {
      this.skip();
    } else {
      this.nextStep();
    }
  }
};
