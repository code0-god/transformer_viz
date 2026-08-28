import type { ReactElement } from "react";

import { chapterHref } from "../app/appRoute";
import {
  type LearningTrackRegistry,
  learningTrackRegistry,
} from "../tracks/registry";

type CourseHomeProps = {
  readonly registry?: LearningTrackRegistry;
};

const COURSE_STEP_SUMMARIES: Readonly<Record<string, string>> = {
  텍스트: "사람이 쓰는 언어",
  토큰: "모델이 처리하는 단위",
  "언어 모델": "다음 token을 예측",
  Embedding: "숫자를 의미 공간에 배치",
  GPT: "context에서 다음 token까지",
  "Transformer Block": "정보를 섞고 갱신",
  "Self-Attention": "어떤 token을 참고할지 계산",
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
          텍스트가 숫자가 되고, 그 숫자가 Transformer 안에서 처리되어 다음
          token이 되는 과정을 순서대로 배웁니다.
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
            {course.journey.map((step, index) => (
              <li key={step}>
                <span
                  className="course-home__step-number"
                  data-course-step-number
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="course-home__step-copy">
                  <strong data-course-step-title>{step}</strong>
                  <span data-course-step-summary>
                    {COURSE_STEP_SUMMARIES[step] ?? ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </section>
  );
}
