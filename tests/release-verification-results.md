# 上线前实测报告 — 欧宝坦克大战

> 日期：2026-09-04T06:32:20.447Z ｜ OS：win32 10.0.26200 ｜ Node：v22.23.1
> 方式：Playwright headless（软件渲染）。FPS 为基准值，真机 GPU 通常更高。

## 引擎可用性
- 全部引擎可用

## 矩阵结果（10 AI 实战 4s 采样）
| 引擎 | 分辨率 | 状态 | 平均 FPS | 最低 FPS | P25 FPS | <30fps段数 |
|---|---|---|---|---|---|---|
| Chromium(chrome) | 1280x720 (低配 16:9) | PASS | 61.3 | 60 | 60 | 0 |
| Chromium(chrome) | 1280x1024 (5:4 letterbox) | PASS | 61.5 | 60 | 62 | 0 |
| Chromium(chrome) | 1920x1080 (1080p) | PASS | 61 | 60 | 60 | 0 |
| Chromium(chrome) | 2560x1440 (1440p) | PASS | 61 | 60 | 60 | 0 |
| Chromium(chrome) | 3840x2160 (4K) | PASS | 61.5 | 60 | 62 | 0 |

## 多局内存趋势（Chromium 1080p，连续 6 局 startMatch）
| 局 | JSHeapUsedSize | tanks | bullets | trackMarks | state |
|---|---|---|---|---|---|
| 1 | n/a | 11 | 10 | 102 | play |
| 2 | n/a | 11 | 9 | 85 | play |
| 3 | n/a | 11 | 9 | 93 | play |
| 4 | n/a | 11 | 11 | 88 | play |
| 5 | n/a | 11 | 10 | 90 | play |
| 6 | n/a | 11 | 10 | 103 | play |

## 运行时错误：无 ✅

## 总结
- 矩阵执行：5 ｜ 通过 5 ｜ 失败 0
- 运行时错误总数：0
- 引擎跳过：0（无）