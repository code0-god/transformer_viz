import type { ReactElement, Ref } from "react";

import type { LearningCourseLocation } from "../../types";
import { CurriculumNavigation } from "./CurriculumNavigation";
import type { ChapterId } from "./types";

type CurriculumChapterHeaderProps = Readonly<{
  eyebrow: string;
  title: string;
  learningGoal: string;
  chapterId: ChapterId;
  course: LearningCourseLocation;
  headingRef: Ref<HTMLHeadingElement>;
}>;

export function CurriculumChapterHeader({
  eyebrow,
  title,
  learningGoal,
  chapterId,
  course,
  headingRef,
}: CurriculumChapterHeaderProps): ReactElement {
  return (
    <header
      className="curriculum-workspace__header"
      data-threeui-surface="chapter-header"
    >
      <div className="curriculum-workspace__chapter-copy">
        <h1 id="curriculum-chapter-title" ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
        <p className="curriculum-workspace__eyebrow">{eyebrow}</p>
        <p>{learningGoal}</p>
      </div>
      <CurriculumNavigation
        currentChapterId={chapterId}
        onNavigate={course.navigateChapter}
        chapterHref={(nextChapterId) => course.chapterHref(nextChapterId)}
      />
    </header>
  );
}
