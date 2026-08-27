import type { ReactElement } from "react";

import { chapterHref } from "../app/appRoute";
import {
  type LearningTrackRegistry,
  learningTrackRegistry,
} from "../tracks/registry";

type CourseHomeProps = {
  readonly registry?: LearningTrackRegistry;
};

export function CourseHome({
  registry = learningTrackRegistry,
}: CourseHomeProps): ReactElement {
  const courses = registry.registrations.flatMap((registration) =>
    registration.course === undefined
      ? []
      : [{ registration, course: registration.course }],
  );

  return (
    <section className="course-home" aria-labelledby="course-home-title">
      <header className="course-home__intro">
        <h1 id="course-home-title">Transformer를 처음부터 살펴봅니다</h1>
        <p>
          기본 개념에서 Self-Attention까지, 무엇을 어떤 순서로 공부할지 먼저
          확인합니다.
        </p>
      </header>

      {courses.map(({ registration, course }) => (
        <article
          key={registration.profile.id}
          className="course-home__course"
          aria-labelledby={`${registration.profile.id}-course-title`}
        >
          <div className="course-home__course-copy">
            <p className="course-home__model">{course.modelLabel}</p>
            <h2 id={`${registration.profile.id}-course-title`}>
              {course.title}
            </h2>
            <p>{course.summary}</p>
          </div>

          <div className="course-home__actions">
            <a
              className="course-home__start"
              href={chapterHref(
                registration.profile.id,
                course.initialChapterId,
                registry,
              )}
            >
              처음부터 시작
            </a>
            <a className="course-home__lab" href="#/lab">
              Lab으로 가기
            </a>
            <button
              type="button"
              className="course-home__contents"
              aria-controls={`${registration.profile.id}-journey`}
              onClick={() =>
                document
                  .getElementById(`${registration.profile.id}-journey`)
                  ?.scrollIntoView({ block: "start" })
              }
            >
              목차
            </button>
          </div>

          <ol
            id={`${registration.profile.id}-journey`}
            className="course-home__journey"
            aria-label="학습 순서"
          >
            {course.journey.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
      ))}
    </section>
  );
}
