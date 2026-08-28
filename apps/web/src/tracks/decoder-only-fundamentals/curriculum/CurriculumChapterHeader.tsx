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
    <header className="curriculum-workspace__header">
      <div className="curriculum-workspace__chapter-copy">
        <p className="curriculum-workspace__eyebrow">{eyebrow}</p>
        <h1 id="curriculum-chapter-title" ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
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
