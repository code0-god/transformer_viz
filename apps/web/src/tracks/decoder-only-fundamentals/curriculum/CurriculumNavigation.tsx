import { type ReactElement, useState } from "react";

import { decoderCurriculum } from "./catalog";
import type { ChapterId } from "./types";

type CurriculumNavigationProps = {
  readonly currentChapterId: ChapterId;
  readonly onNavigate: (chapterId: ChapterId) => void;
  readonly chapterHref?: (chapterId: ChapterId) => string;
};

export function CurriculumNavigation({
  currentChapterId,
  onNavigate,
  chapterHref,
}: CurriculumNavigationProps): ReactElement {
  const [open, setOpen] = useState(false);
  const navigate = (chapterId: ChapterId): void => {
    setOpen(false);
    onNavigate(chapterId);
  };

  return (
    <section className="curriculum-navigation" aria-label="Chapter navigation">
      <div className="curriculum-navigation__header">
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
                    {chapterHref === undefined ? (
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
                    ) : (
                      <a
                        href={chapterHref(chapter.id)}
                        aria-label={chapter.title}
                        aria-current={
                          chapter.id === currentChapterId ? "page" : undefined
                        }
                        onClick={() => setOpen(false)}
                      >
                        {chapter.title}
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </nav>
      ) : null}
    </section>
  );
}
