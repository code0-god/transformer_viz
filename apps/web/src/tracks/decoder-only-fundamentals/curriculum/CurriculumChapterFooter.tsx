import type { ReactElement } from "react";

import type { LearningChapter } from "./types";

type CurriculumChapterFooterProps = Readonly<{
  previous: LearningChapter | undefined;
  next: LearningChapter | undefined;
  onNavigate: (chapterId: LearningChapter["id"]) => void;
}>;

export function CurriculumChapterFooter({
  previous,
  next,
  onNavigate,
}: CurriculumChapterFooterProps): ReactElement {
  return (
    <nav className="curriculum-chapter-footer" aria-label="Chapter 이동">
      <span>
        {previous === undefined ? null : (
          <button type="button" onClick={() => onNavigate(previous.id)}>
            이전 Chapter · {previous.title}
          </button>
        )}
      </span>
      <span>
        {next === undefined ? null : (
          <button type="button" onClick={() => onNavigate(next.id)}>
            다음 Chapter · {next.title}
          </button>
        )}
      </span>
    </nav>
  );
}
