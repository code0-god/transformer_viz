//! Tensor identity, statistics, formula, and typed empty-state primitives.

use leptos::prelude::*;
use nanogpt_schema::TensorSnapshot;

#[must_use]
pub(super) fn tensor_facts(tensor: &TensorSnapshot, role: &'static str) -> impl IntoView + use<> {
    let id = tensor.id.clone();
    let id_label = id.clone();
    let label = tensor.label.clone();
    let shape = tensor.shape.clone();
    let stats = tensor.stats.clone();
    view! {
        <dl class="tensor-facts" data-tensor-id=id>
            <div><dt>{role}</dt><dd><code>{id_label}</code></dd></div>
            <div><dt>"tensor"</dt><dd>{label}</dd></div>
            <div><dt>"shape"</dt><dd><code>{format!("{shape:?}")}</code></dd></div>
            <div><dt>"μ / σ"</dt><dd><code>{format!("{:.5} / {:.5}", stats.mean.get(), stats.std.get())}</code></dd></div>
        </dl>
    }
}

#[must_use]
pub(super) fn error_state(message: impl Into<String>) -> AnyView {
    let message = message.into();
    view! { <div class="stage-visual stage-empty" data-visual="unavailable" data-trace-ready="false"><svg role="img" viewBox="0 0 320 80"><title>"Trace unavailable"</title><desc>"현재 선택에 필요한 실제 tensor가 없습니다."</desc><path d="M20 40 H300" /></svg><p>{format!("실제 trace를 표시할 수 없습니다: {message}")}</p></div> }.into_any()
}

#[must_use]
pub(super) fn waiting(kind: &'static str) -> AnyView {
    view! { <div class="stage-visual stage-empty" data-visual=kind data-trace-ready="false"><svg role="img" viewBox="0 0 320 80"><title>"Trace loading"</title><desc>"Worker가 실제 tensor를 준비하고 있습니다."</desc><path d="M20 40 H300" /></svg><p>"문장을 실행하면 이 단계의 실제 tensor 증거가 표시됩니다."</p></div> }.into_any()
}
