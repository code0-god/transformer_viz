import type { ReactElement } from "react";

import { PageDivider } from "../../../layout/PageLayout";
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
      className="curriculum-chapter-footer page-layout__full page-layout"
      aria-label="Chapter 이동"
      data-threeui-surface="chapter-footer"
    >
      <PageDivider boundaryId="article-final" />
      <div className="curriculum-chapter-footer__content page-layout__content">
        <span>
          {previous === undefined ? null : (
            <a
              href={chapterHref(previous.id)}
              aria-label={`이전: ${previous.title}`}
              data-control-tier="secondary"
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
              data-control-tier="secondary"
              onClick={(event) => {
                event.preventDefault();
                onNavigate(next.id);
              }}
            >
              {next.title} →
            </a>
          )}
        </span>
      </div>
    </nav>
  );
}
