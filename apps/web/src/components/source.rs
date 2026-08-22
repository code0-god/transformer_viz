//! Pinned nanoGPT source range synchronized with the selected trace operation.

use leptos::prelude::*;

use crate::{
    app::{playback::Playback, state::AppState},
    source_map::{NANOGPT_COMMIT, NANOGPT_MODEL_SOURCE, SourceMapEntry, entry},
};

/// Line-numbered source panel using only the checked-in pinned source.
#[must_use]
pub fn source_view(state: RwSignal<AppState>, playback: RwSignal<Playback>) -> impl IntoView {
    view! {
        <section class="panel source-panel" aria-labelledby="source-title">
            <div class="panel-heading"><div><h2 id="source-title">"nanoGPT 소스 연결"</h2><p>"고정된 원본 Python과 현재 Rust 구현을 같은 연산 경계로 연결합니다."</p></div></div>
            {move || selected_entry(state.get(), playback.get()).map_or_else(
                |error| view! { <p class="empty">{error}</p> }.into_any(),
                |mapped| source_code(mapped).into_any()
            )}
        </section>
    }
}

fn selected_entry(state: AppState, playback: Playback) -> Result<SourceMapEntry, String> {
    let operation = state
        .block
        .and_then(|trace| trace.operations.get(playback.step).cloned())
        .ok_or_else(|| "실행 후 선택 연산의 원본 소스를 표시합니다.".to_owned())?;
    entry(operation.operation).map_err(|error| error.to_string())
}

fn source_code(mapped: SourceMapEntry) -> impl IntoView {
    let commit = NANOGPT_COMMIT.trim();
    let source_url = format!(
        "https://github.com/karpathy/nanoGPT/blob/{commit}/model.py#L{}-L{}",
        mapped.line_start, mapped.line_end
    );
    let license_url = format!("https://github.com/karpathy/nanoGPT/blob/{commit}/LICENSE");
    let first = mapped.line_start.saturating_sub(3).max(1);
    let last = mapped
        .line_end
        .saturating_add(3)
        .min(NANOGPT_MODEL_SOURCE.lines().count());
    let lines = NANOGPT_MODEL_SOURCE
        .lines()
        .enumerate()
        .filter_map(|(index, text)| {
            let number = index + 1;
            (first..=last)
                .contains(&number)
                .then_some((number, text.to_owned()))
        });
    let active_start = mapped.line_start;
    let active_end = mapped.line_end;
    view! {
        <div class="source-meta"><span class="phase-label">{format!("nanoGPT · {}", mapped.label)}</span><code>{commit}</code></div>
        <div class="source-code" role="region" aria-label=format!("model.py {}줄부터 {}줄", mapped.line_start, mapped.line_end) tabindex="0">
            <code>{lines.map(|(number, text)| view! { <span class="source-line" class:active=(active_start..=active_end).contains(&number)><span class="line-number">{number}</span><span class="line-text">{text}</span></span> }).collect_view()}</code>
        </div>
        <dl class="source-counterpart"><div><dt>"Python"</dt><dd><a href=source_url target="_blank" rel="noreferrer">{format!("{}:{}–{}", mapped.file, mapped.line_start, mapped.line_end)}</a></dd></div><div><dt>"Rust"</dt><dd><code>{format!("{} · {}", mapped.rust_file, mapped.rust_symbol)}</code></dd></div><div><dt>"License"</dt><dd><a href=license_url target="_blank" rel="noreferrer">"MIT · 원문 보기"</a></dd></div></dl>
    }
}
