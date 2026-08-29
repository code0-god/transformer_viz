# ThreeUI Phase 1 responsive verification

Date: 2026-08-29

## Verified viewport matrix

Production Chrome exercised Home, Learn, Lab, and focused-viewer surfaces at
320x568, 390x844, 768x1024, 1024x768, 1366x768, and 1440x900 where applicable.

| Viewport | Shell navigation | Home | Learn | Lab |
| --- | --- | --- | --- | --- |
| 320x568 | No overlap; 44px targets | First course starts at 303.75px; 44px actions | 17px / 29.75px reading type; no overflow | Experiment, primary controls, and settings stack |
| 390x844 | No overlap; 44px targets | First course starts at 289.91px; 44px actions | 17px / 29.75px reading type; no overflow | Experiment, primary controls, and settings stack |
| 768x1024 | No overlap; 44px targets | Course visible in first viewport; 44px actions | 17px / 29.75px reading type; no overflow | Experiment stacks; controls remain contained |
| 1024x768 | No overlap | Course visible in first viewport; 44px actions | 17px / 29.75px reading type; no overflow | Two-column experiment; controls remain contained |
| 1440x900 | No overlap | Two-column Home; 44px actions | 17px / 29.75px reading type; no overflow | Two-column experiment; controls remain contained |

Every tested Lab overlay:

- fits within its viewport with zero document or local horizontal overflow;
- keeps one modal dialog and an inert application background;
- locks page scroll and restores the exact prior scroll position;
- focuses a 44x44px close control;
- displays non-empty architecture content.

The 320px overlay occupies the complete viewport with no rounded inset shell.

## Regression coverage

The same run also verifies all twelve preserved Learn Figures at 320, 390,
768, 1024, 1366, and 1440 widths. Each Figure remains inside its article,
retains its semantic caption and preferred-width contract, and introduces no
viewer trigger or horizontal overflow.

## Evidence

- Browser evidence:
  `.omo/evidence/threeui-phase1/responsive/browser-hybrid.json`
- Milestone captures:
  `docs/screenshots/threeui-phase1/milestone-responsive/`
- Captures produced: 23
- Network errors: 0
- Runtime errors: 0

Manually reviewed narrow captures:

- `course-home-320x568.png`
- `learn-token-320x568.png`
- `lab-base-320x568.png`
- `lab-architecture-viewer-320x568.png`

## Command

```text
python3 scripts/browser_hybrid_foundation.py \
  --root apps/web/dist \
  --screenshots docs/screenshots/threeui-phase1/milestone-responsive \
  --evidence .omo/evidence/threeui-phase1/responsive/browser-hybrid.json
```

Result: `Hybrid browser foundation: PASS (23 screenshots)`.
