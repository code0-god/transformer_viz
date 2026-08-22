//! Line-numbered correspondence to the checked-in pinned nanoGPT source.

use leptos::prelude::*;
use nanogpt_schema::OperationId;

use crate::{
    app::{architecture::ArchitectureOperation, state::AppState},
    source_map::{NANOGPT_COMMIT, NANOGPT_MODEL_SOURCE, entry},
};

use super::selected_operation;

pub(super) fn panel(state: &AppState) -> AnyView {
    if state.summary.is_none() {
        return empty("실행 후 현재 단계의 고정 nanoGPT 소스를 표시합니다.".to_owned());
    }
    let operation = if let Some(operation) = selected_operation(state) {
        operation.operation
    } else {
        let Some(architecture) = state.ui.architecture.operation else {
            return empty("아키텍처 연산을 선택하면 연결된 고정 소스를 표시합니다.".to_owned());
        };
        let Some(operation) = source_operation(architecture) else {
            return empty(
                "이 생성 경계에는 대응하는 기존 trace/source 연산이 없습니다.".to_owned(),
            );
        };
        operation
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
        })
        .collect::<Vec<_>>();
    let active_start = mapped.line_start;
    let active_end = mapped.line_end;
    view! {
        <div class="inspector-source" data-testid="inspector-source">
            <div class="source-meta"><span>{mapped.label.clone()}</span><code>{commit.clone()}</code></div>
            <div class="source-code" role="region" aria-label=format!("고정 model.py {}줄부터 {}줄, 가로 스크롤 가능", mapped.line_start, mapped.line_end) tabindex="0">
                <code>{lines.into_iter().map(|(number, text)| view! { <span class="source-line" class:active=(active_start..=active_end).contains(&number)><span class="line-number">{number}</span><span class="line-text">{text}</span></span> }).collect_view()}</code>
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

const fn source_operation(operation: ArchitectureOperation) -> Option<OperationId> {
    use ArchitectureOperation as O;
    match operation {
        O::Embedding => Some(OperationId::Embedding),
        O::FinalLayerNorm => Some(OperationId::FinalLayerNorm),
        O::LanguageModelHead | O::Logits => Some(OperationId::Logits),
        O::AttentionLayerNorm => Some(OperationId::AttentionLayerNorm),
        O::AttentionResidual => Some(OperationId::AttentionResidual),
        O::MlpLayerNorm => Some(OperationId::MlpLayerNorm),
        O::Mlp => Some(OperationId::Mlp),
        O::MlpResidual => Some(OperationId::MlpResidual),
        O::Query | O::Key | O::Value => Some(OperationId::QueryKeyValue),
        O::QueryKeyProduct
        | O::Scale
        | O::Mask
        | O::Softmax
        | O::ValueProduct
        | O::MergeHeads
        | O::Projection => Some(OperationId::Attention),
        O::Temperature | O::TopK | O::GenerationSoftmax | O::Sample | O::Append | O::Repeat => None,
    }
}

fn empty(message: String) -> AnyView {
    view! { <p class="empty-state inspector-empty" role="status">{message}</p> }.into_any()
}
