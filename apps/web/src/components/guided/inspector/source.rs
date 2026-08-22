//! Line-numbered correspondence to the checked-in pinned nanoGPT source.

use crate::{
    app::{
        architecture::{ArchitectureOperation, source_operation_precedence},
        state::AppState,
    },
    source_map::{NANOGPT_COMMIT, NANOGPT_MODEL_SOURCE, entry},
};
use leptos::prelude::*;

use super::selected_operation;

pub(super) fn panel(state: &AppState) -> AnyView {
    if state.ui.architecture.operation.is_some_and(|operation| {
        matches!(
            operation,
            ArchitectureOperation::Temperature
                | ArchitectureOperation::TopK
                | ArchitectureOperation::GenerationSoftmax
                | ArchitectureOperation::Sample
                | ArchitectureOperation::Append
                | ArchitectureOperation::Repeat
        )
    }) {
        return empty("이 샘플링 경계에는 replay tensor/source ID를 만들지 않습니다. 선택한 compact step과 적용 설정이 증거입니다.".to_owned());
    }
    if state.summary.is_none() {
        return empty(
            if state.ui.architecture.operation == Some(ArchitectureOperation::Logits)
                && state.generation.selected_step.is_some()
            {
                "현재 선택한 생성 step의 replay가 연결되면 고정 nanoGPT 소스를 표시합니다."
                    .to_owned()
            } else {
                "실행 후 현재 단계의 고정 nanoGPT 소스를 표시합니다.".to_owned()
            },
        );
    }
    let legacy = selected_operation(state).map(|operation| operation.operation);
    let Some(operation) =
        source_operation_precedence(state.ui.mode, state.ui.architecture.operation, legacy)
    else {
        return empty("이 생성 경계에는 대응하는 기존 trace/source 연산이 없습니다.".to_owned());
    };
    let mapped = match entry(operation) {
        Ok(mapped) => mapped,
        Err(error) => return empty(error.to_string()),
    };
    let commit = NANOGPT_COMMIT.trim().to_owned();
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
                .then(|| (number, text.to_owned()))
        });
    let active_start = mapped.line_start;
    let active_end = mapped.line_end;
    view! {
        <div class="inspector-source" data-testid="inspector-source">
            <div class="source-meta"><span>{mapped.label.clone()}</span><code>{commit.clone()}</code></div>
            <div class="source-code" role="region" aria-label=format!("고정 model.py {}줄부터 {}줄, 가로 스크롤 가능", mapped.line_start, mapped.line_end) tabindex="0">
                <code>{lines.map(|(number, text)| view! { <span class="source-line" class:active=(active_start..=active_end).contains(&number)><span class="line-number">{number}</span><span class="line-text">{text}</span></span> }).collect_view()}</code>
            </div>
            <dl class="source-counterpart">
                <div><dt>"Python"</dt><dd><a href=source_url target="_blank" rel="noreferrer">{format!("{}:{}–{}", mapped.file, mapped.line_start, mapped.line_end)}</a></dd></div>
                <div><dt>"Rust"</dt><dd><code>{format!("{} · {}", mapped.rust_file, mapped.rust_symbol)}</code></dd></div>
                <div><dt>"Commit"</dt><dd><code>{commit}</code></dd></div>
                <div><dt>"License"</dt><dd><a href=license_url target="_blank" rel="noreferrer">"MIT · 원문 보기"</a></dd></div>
            </dl>
        </div>
    }.into_any()
}

fn empty(message: String) -> AnyView {
    view! { <p class="empty-state inspector-empty" role="status">{message}</p> }.into_any()
}
