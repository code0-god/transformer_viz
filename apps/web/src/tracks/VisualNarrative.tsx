import {
  createContext,
  Fragment,
  type ReactElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { GuideVisualNarrativeBlock } from "./guideTypes";
import { LearningFigure } from "./LearningFigure";
import type { LearningFigureRegistry } from "./learningFigureTypes";

import "./visualNarrative.css";

type VisualNarrativeContextValue = Readonly<{
  activeStage: string;
  selectStage: (stage: string) => void;
}>;

const VisualNarrativeContext =
  createContext<VisualNarrativeContextValue | null>(null);

export function useVisualNarrative(): VisualNarrativeContextValue | null {
  return useContext(VisualNarrativeContext);
}

export function VisualNarrative({
  block,
  registry,
}: Readonly<{
  block: GuideVisualNarrativeBlock;
  registry: LearningFigureRegistry | undefined;
}>): ReactElement {
  const initialBeat = block.beats[0];
  if (initialBeat === undefined) {
    throw new Error(`Visual Narrative has no beats: ${block.id}`);
  }
  const [activeStage, setActiveStage] = useState(initialBeat.stage);
  const beatElements = useRef(new Map<string, HTMLParagraphElement>());
  const selectStage = useCallback((stage: string) => {
    setActiveStage((current) => (current === stage ? current : stage));
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    let hasScrolled = false;
    let scrollFrame: number | undefined;
    const selectNearestBeat = () => {
      const activationLine = window.innerHeight * 0.44;
      const nearest = [...beatElements.current.values()]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            distance: Math.abs(rect.top + rect.height / 2 - activationLine),
            element,
          };
        })
        .sort((left, right) => left.distance - right.distance)[0]?.element;
      const stage = nearest?.getAttribute("data-narrative-stage") ?? undefined;
      if (stage !== undefined) selectStage(stage);
    };
    const onScroll = () => {
      hasScrolled = true;
      if (scrollFrame !== undefined) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = undefined;
        selectNearestBeat();
      });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (!hasScrolled) return;
        const active = entries
          .filter(({ isIntersecting }) => isIntersecting)
          .sort(
            (left, right) =>
              Math.abs(
                left.boundingClientRect.top +
                  left.boundingClientRect.height / 2 -
                  window.innerHeight / 2,
              ) -
              Math.abs(
                right.boundingClientRect.top +
                  right.boundingClientRect.height / 2 -
                  window.innerHeight / 2,
              ),
          )[0];
        if (!(active?.target instanceof HTMLElement)) return;
        const stage =
          active.target.getAttribute("data-narrative-stage") ?? undefined;
        if (stage !== undefined) selectStage(stage);
      },
      {
        rootMargin: "-34% 0px -46% 0px",
        threshold: [0, 0.25, 0.6],
      },
    );
    for (const element of beatElements.current.values()) {
      observer.observe(element);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollFrame !== undefined) {
        window.cancelAnimationFrame(scrollFrame);
      }
      observer.disconnect();
    };
  }, [selectStage]);

  const context = { activeStage, selectStage };
  const visual = (
    <div className="visual-narrative__visual">
      <LearningFigure block={block.figure} registry={registry} />
      <nav
        className="visual-narrative__steps"
        aria-label={`${block.label} 단계`}
      >
        {block.beats.map((beat) => (
          <button
            key={beat.id}
            type="button"
            aria-current={beat.stage === activeStage ? "step" : undefined}
            onClick={() => selectStage(beat.stage)}
            onFocus={() => selectStage(beat.stage)}
          >
            <span aria-hidden="true" />
            {beat.label}
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <VisualNarrativeContext.Provider value={context}>
      <section
        className={`visual-narrative visual-narrative--${block.layout}`}
        data-narrative-layout={block.layout}
        aria-label={block.label}
      >
        {block.beats.map((beat, index) => (
          <Fragment key={beat.id}>
            <p
              ref={(element) => {
                if (element === null) {
                  beatElements.current.delete(beat.stage);
                } else {
                  beatElements.current.set(beat.stage, element);
                }
              }}
              className="visual-narrative__beat"
              data-narrative-active={
                beat.stage === activeStage ? "true" : "false"
              }
              data-narrative-stage={beat.stage}
            >
              {beat.text}
            </p>
            {index === 0 ? visual : null}
          </Fragment>
        ))}
      </section>
    </VisualNarrativeContext.Provider>
  );
}
