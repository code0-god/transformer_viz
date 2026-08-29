import type { ReactElement } from "react";

import type { LearningChapter } from "./types";

type CurriculumChapterFooterProps = Readonly<{
  previous: LearningChapter | undefined;
  next: LearningChapter | undefined;
  chapterHref: (chapterId: LearningChapter["id"]) => string;
  onNavigate: (chapterId: LearningChapter["id"]) => void;
}>;

export function CurriculumChapterFooter({
  previous,
  next,
  chapterHref,
  onNavigate,
}: CurriculumChapterFooterProps): ReactElement {
  return (
    <nav
      className="curriculum-chapter-footer"
      aria-label="Chapter 이동"
      data-threeui-surface="chapter-footer"
    >
      <span>
        {previous === undefined ? null : (
          <a
            href={chapterHref(previous.id)}
            aria-label={`이전: ${previous.title}`}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(previous.id);
            }}
          >
            ← {previous.title}
          </a>
        )}
      </span>
      <span>
        {next === undefined ? null : (
          <a
            href={chapterHref(next.id)}
            aria-label={`다음: ${next.title}`}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(next.id);
            }}
          >
            {next.title} →
          </a>
        )}
      </span>
    </nav>
  );
}
