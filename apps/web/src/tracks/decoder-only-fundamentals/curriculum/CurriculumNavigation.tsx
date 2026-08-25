import { type ReactElement, useState } from "react";

import { decoderCurriculum } from "./catalog";
import { chapterNavigation } from "./navigation";
import type { ChapterId } from "./types";

type CurriculumNavigationProps = {
  readonly currentChapterId: ChapterId;
  readonly onNavigate: (chapterId: ChapterId) => void;
};

export function CurriculumNavigation({
  currentChapterId,
  onNavigate,
}: CurriculumNavigationProps): ReactElement {
  const [open, setOpen] = useState(false);
  const navigation = chapterNavigation(currentChapterId);
  const ordinal = (navigation?.index ?? 0) + 1;
  const navigate = (chapterId: ChapterId): void => {
    setOpen(false);
    onNavigate(chapterId);
  };

  return (
    <section className="curriculum-navigation" aria-label="Chapter navigation">
      <div className="curriculum-navigation__header">
        <div>
          <p className="curriculum-navigation__progress-copy">
            현재 Chapter {ordinal} / 14
          </p>
          <div
            className="curriculum-navigation__progress"
            role="progressbar"
            aria-label="Chapter 진행률"
            aria-valuemin={1}
            aria-valuemax={14}
            aria-valuenow={ordinal}
          >
            <span style={{ inlineSize: `${(ordinal / 14) * 100}%` }} />
          </div>
        </div>
        <button
          type="button"
          className="curriculum-navigation__opener"
          aria-expanded={open}
          aria-controls="curriculum-toc"
          aria-label={open ? "목차 닫기" : "목차 열기"}
          onClick={() => setOpen((current) => !current)}
        >
          <span aria-hidden="true">목차</span>
        </button>
      </div>

      {open ? (
        <nav
          id="curriculum-toc"
          className="curriculum-toc"
          aria-label="Chapter 목차"
        >
          {decoderCurriculum.parts.map((part) => (
            <section key={part.id} className="curriculum-toc__part">
              <h2>{part.title}</h2>
              <ol>
                {part.chapters.map((chapter) => (
                  <li key={chapter.id}>
                    <button
                      type="button"
                      aria-label={chapter.title}
                      aria-current={
                        chapter.id === currentChapterId ? "page" : undefined
                      }
                      onClick={() => navigate(chapter.id)}
                    >
                      {chapter.title}
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </nav>
      ) : null}

      <nav
        className="curriculum-navigation__adjacent"
        aria-label="인접 Chapter"
      >
        {navigation?.previous === undefined ? null : (
          <button
            type="button"
            onClick={() =>
              navigate(navigation.previous?.id ?? currentChapterId)
            }
          >
            이전: {navigation.previous.title}
          </button>
        )}
        {navigation?.next === undefined ? null : (
          <button
            type="button"
            onClick={() => navigate(navigation.next?.id ?? currentChapterId)}
          >
            다음: {navigation.next.title}
          </button>
        )}
      </nav>
    </section>
  );
}
