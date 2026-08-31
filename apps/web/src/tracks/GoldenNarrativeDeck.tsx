import {
  type ReactElement,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useMemo,
  useState,
} from "react";

import type { GuideVisualNarrativeBlock } from "./guideTypes";
import { LearningFigure } from "./LearningFigure";
import type { LearningFigureRegistry } from "./learningFigureTypes";
import { VisualNarrativeContext } from "./visualNarrativeContext";

import "./goldenNarrativeDeck.css";

type GoldenNarrativeDeckProps = Readonly<{
  block: GuideVisualNarrativeBlock;
  registry: LearningFigureRegistry | undefined;
}>;

const EDITABLE_SELECTOR =
  "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

export function GoldenNarrativeDeck({
  block,
  registry,
}: GoldenNarrativeDeckProps): ReactElement {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeBeat = block.beats[activeIndex];
  if (activeBeat === undefined) {
    throw new Error(
      `Golden Narrative has no slide ${activeIndex}: ${block.id}`,
    );
  }

  const selectStage = useCallback(
    (stage: string) => {
      const index = block.beats.findIndex((beat) => beat.stage === stage);
      if (index >= 0) setActiveIndex(index);
    },
    [block.beats],
  );
  const context = useMemo(
    () => ({ activeStage: activeBeat.stage, selectStage }),
    [activeBeat.stage, selectStage],
  );
  const move = useCallback(
    (offset: -1 | 1) => {
      setActiveIndex((current) =>
        Math.min(block.beats.length - 1, Math.max(0, current + offset)),
      );
    },
    [block.beats.length],
  );
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (
        event.target instanceof Element &&
        event.target.closest(EDITABLE_SELECTOR) !== null
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      }
    },
    [move],
  );
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === block.beats.length - 1;

  return (
    <VisualNarrativeContext.Provider value={context}>
      <section
        className="visual-narrative visual-narrative--golden"
        data-narrative-layout="golden"
        data-narrative-mode="deck"
        data-narrative-slide-index={activeIndex + 1}
        data-narrative-stage={activeBeat.stage}
        aria-label={block.label}
        onKeyDown={handleKeyDown}
      >
        <div className="visual-narrative__stage">
          <div className="visual-narrative__copy" aria-live="polite">
            <p
              className="visual-narrative__beat"
              data-deck-slide={activeBeat.id}
              data-narrative-active="true"
              data-narrative-stage={activeBeat.stage}
              key={activeBeat.id}
            >
              <span className="visual-narrative__beat-label">
                {activeBeat.label}
              </span>
              <span className="visual-narrative__beat-text">
                {activeBeat.text}
              </span>
            </p>
          </div>
          <div className="visual-narrative__visual">
            <LearningFigure block={block.figure} registry={registry} />
          </div>
        </div>
        <nav
          className="visual-narrative__steps"
          aria-label={`${block.label} 단계`}
        >
          <button
            type="button"
            aria-label="이전 단계"
            data-deck-action="previous"
            disabled={isFirst}
            onClick={() => move(-1)}
          >
            이전
          </button>
          <div className="visual-narrative__progress">
            <span aria-live="polite" aria-atomic="true">
              {activeIndex + 1} / {block.beats.length}
            </span>
            <ol>
              {block.beats.map((beat, index) => (
                <li key={beat.id}>
                  <button
                    type="button"
                    aria-current={index === activeIndex ? "step" : undefined}
                    aria-label={`${index + 1}단계: ${beat.label}`}
                    onClick={() => setActiveIndex(index)}
                  >
                    <span aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <button
            type="button"
            aria-label="다음 단계"
            data-deck-action="next"
            disabled={isLast}
            onClick={() => move(1)}
          >
            다음
          </button>
        </nav>
      </section>
    </VisualNarrativeContext.Provider>
  );
}
