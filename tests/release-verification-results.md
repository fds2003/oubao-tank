# 上线前实测报告 — 欧宝坦克大战

> 日期：2026-09-04T08:01:15.150Z ｜ OS：win32 10.0.26200 ｜ Node：v22.23.1
> 方式：Playwright headless（软件渲染）。FPS 为基准值，真机 GPU 通常更高。

## 引擎可用性
- 全部引擎可用

## 矩阵结果（10 AI 实战 4s 采样）
| 引擎 | 分辨率 | 状态 | 平均 FPS | 最低 FPS | P25 FPS | <30fps段数 |
|---|---|---|---|---|---|---|
| Chromium(chrome) | 1280x720 (低配 16:9) | PASS | 61.8 | 60 | 62 | 0 |
| Chromium(chrome) | 1280x1024 (5:4 letterbox) | PASS | 62 | 62 | 62 | 0 |
| Chromium(chrome) | 1920x1080 (1080p) | PASS | 61.3 | 60 | 60 | 0 |
| Chromium(chrome) | 2560x1440 (1440p) | PASS | 61.8 | 60 | 62 | 0 |
| Chromium(chrome) | 3840x2160 (4K) | PASS | 61.5 | 60 | 62 | 0 |
| Firefox | 1280x720 (低配 16:9) | PASS | 61.8 | 60 | 62 | 0 |
| Firefox | 1280x1024 (5:4 letterbox) | PASS | 61.8 | 60 | 62 | 0 |
| Firefox | 1920x1080 (1080p) | PASS | 61.8 | 60 | 62 | 0 |
| Firefox | 2560x1440 (1440p) | PASS | 61.8 | 60 | 62 | 0 |
| Firefox | 3840x2160 (4K) | PASS | 58.3 | 52 | 58 | 0 |
| WebKit | 1280x720 (低配 16:9) | PASS | 34 | 26 | 34 | 1 |
| WebKit | 1280x1024 (5:4 letterbox) | PASS | 30.8 | 22 | 28 | 3 |
| WebKit | 1920x1080 (1080p) | PASS | 20.8 | 18 | 20 | 8 |
| WebKit | 2560x1440 (1440p) | PASS | 15 | 14 | 14 | 8 |
| WebKit | 3840x2160 (4K) | PASS | 7.8 | 6 | 8 | 8 |

## 多局内存趋势（Chromium 1080p，连续 6 局 startMatch）
| 局 | JSHeapUsedSize | tanks | bullets | trackMarks | state |
|---|---|---|---|---|---|
| 1 | 5.4 MB | 11 | 10 | 105 | play |
| 2 | 3.1 MB | 11 | 10 | 121 | play |
| 3 | 3.1 MB | 11 | 14 | 103 | play |
| 4 | 3.1 MB | 11 | 10 | 101 | play |
| 5 | 2.9 MB | 11 | 10 | 103 | play |
| 6 | 3.4 MB | 11 | 13 | 99 | play |

## 运行时错误：无 ✅

## 总结
- 矩阵执行：15 ｜ 通过 15 ｜ 失败 0
- 运行时错误总数：0
- 引擎跳过：0（无）