# ThreeUI Phase 1 final visual regression set

Date: 2026-08-29
Set size: 10 images

These ten production-Chrome captures form the final Phase 1 visual regression
set. They are a stable subset of the 23-image responsive milestone and cover
every migrated product surface plus both specialized renderer boundaries.

| # | Surface | Viewport | SHA-256 |
| ---: | --- | --- | --- |
| 1 | Course Home | 1440x900 | `38f8f19bc2c9fcdfffec4e731a2f850fad037868ed9482489991f0d0ee2c699e` |
| 2 | Course Home | 320x568 | `78d41e0cbdeec40b04ffcd277695fc1c7c820767bec8dbc503508fa6083bdbba` |
| 3 | Token Learn | 1440x900 | `3164b9a09677b91117b95373a95d60425c058c37e37930d58497c8e0a8592076` |
| 4 | Token Learn | 390x844 | `556e02f31ab600ab5cd41f9eeed2e2f7ce74a92d432fc934dbc81a316b948316` |
| 5 | GPT Learn | 1440x900 | `f775ba7c0ae072f7c08d0b42f71a3123c3d6c0a747c084344875680911474b9b` |
| 6 | GPT Learn | 390x844 | `736eeeee0ca63f2c955668a88f23c78e11848fa1a945879d9eaedddff2f4feb9` |
| 7 | Lab base | 1440x900 | `717e8ba75f3ce4a6babe15514106c7cb2a7e3f8ec8bc7a73e6c3e9ebf207a43a` |
| 8 | Lab base | 320x568 | `f8fdba5d752f9adf245eebed381c1f1545a1823aa5f872c0128644d7b7143a38` |
| 9 | Architecture viewer | 1440x900 | `3de3c9c000cac36987e11c1ffc4f264345f6fc2445e47856cd04e8a80fa0cb00` |
| 10 | Actual Score Matrix viewer | 1440x900 | `75cfc5bfa9a7e8d1e9920945861b5fe58b6165ed91c8d966943d49c0ca0ec3d5` |

## Files

```text
docs/screenshots/threeui-phase1/milestone-responsive/course-home-1440x900.png
docs/screenshots/threeui-phase1/milestone-responsive/course-home-320x568.png
docs/screenshots/threeui-phase1/milestone-responsive/learn-token-0-2-inline-1440x900.png
docs/screenshots/threeui-phase1/milestone-responsive/learn-token-inline-mobile-390x844.png
docs/screenshots/threeui-phase1/milestone-responsive/learn-gpt-inline-1440x900.png
docs/screenshots/threeui-phase1/milestone-responsive/learn-gpt-inline-mobile-390x844.png
docs/screenshots/threeui-phase1/milestone-responsive/lab-base-1440x900.png
docs/screenshots/threeui-phase1/milestone-responsive/lab-base-320x568.png
docs/screenshots/threeui-phase1/milestone-responsive/lab-architecture-viewer-1440x900.png
docs/screenshots/threeui-phase1/milestone-responsive/viewer-score-matrix-3d-1440x900.png
```

## Manual visual result

PASS:

- shell, navigation, status, Home, Learn, Lab, and overlay chrome use one
  neutral ThreeUI-first product language;
- Korean headings wrap without clipping;
- 320px navigation, Home actions, Lab controls, and overlay close affordance
  remain usable;
- Learn keeps one readable article plane around semantic Figures;
- architecture and Score Matrix retain specialized visual semantics without
  reintroducing legacy product chrome;
- no dual-system seam, horizontal document overflow, blank renderer, clipped
  overlay, or stale loading surface is visible.
