//! Globally synchronized layer, head, token, and heatmap selection.

use nanogpt_schema::{OperationId, WorkerRequest};

use super::state::AppState;

/// Globally synchronized explorer selectors.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Selection {
    /// Zero-based Transformer layer.
    pub layer: usize,
    /// Zero-based attention head.
    pub head: usize,
    /// Zero-based token position.
    pub token: usize,
    /// Selected heatmap key column.
    pub key: usize,
}

impl AppState {
    /// Selects one layer and requests its real cached trace.
    #[must_use]
    pub fn select_layer(&mut self, layer: usize) -> Option<WorkerRequest> {
        self.selection.layer = clamp_index(layer, self.layer_count());
        self.selection.head = clamp_index(self.selection.head, self.head_count());
        self.clamp_token_coordinates();
        self.block = None;
        self.attention = None;
        self.token = None;
        self.status = super::state::AppStatus::Running("선택한 블록 추적 중".to_owned());
        let run_id = self.current_run()?;
        Some(self.block_request(run_id))
    }

    /// Selects one attention head and requests its real cached trace.
    #[must_use]
    pub fn select_head(&mut self, head: usize) -> Option<WorkerRequest> {
        self.selection.head = clamp_index(head, self.head_count());
        self.clamp_token_coordinates();
        self.attention = None;
        self.token = None;
        self.status = super::state::AppStatus::Running("어텐션 헤드 추적 중".to_owned());
        let run_id = self.current_run()?;
        Some(self.head_request(run_id))
    }

    /// Selects a query token and requests its real cached trace.
    #[must_use]
    pub fn select_token(&mut self, token: usize) -> Option<WorkerRequest> {
        self.selection.token = clamp_index(token, self.token_count());
        self.selection.key = clamp_index(self.selection.key, self.token_count());
        self.token = None;
        self.status = super::state::AppStatus::Running("토큰 세부 값 추적 중".to_owned());
        let run_id = self.current_run()?;
        Some(self.token_request(run_id))
    }

    /// Selects a heatmap query/key coordinate and requests query-token detail.
    #[must_use]
    pub fn select_cell(&mut self, query: usize, key: usize) -> Option<WorkerRequest> {
        let token_count = self.token_count();
        self.selection.token = clamp_index(query, token_count);
        self.selection.key = clamp_index(key, token_count);
        self.token = None;
        self.status = super::state::AppStatus::Running("어텐션 셀 추적 중".to_owned());
        let run_id = self.current_run()?;
        Some(self.token_request(run_id))
    }

    fn layer_count(&self) -> usize {
        self.summary
            .as_ref()
            .map_or(1, |summary| summary.layers.len())
    }

    fn token_count(&self) -> usize {
        self.summary
            .as_ref()
            .map_or(1, |summary| summary.tokens.len())
    }

    fn head_count(&self) -> usize {
        self.block
            .as_ref()
            .and_then(|trace| {
                trace
                    .operations
                    .iter()
                    .find(|operation| operation.operation == OperationId::QueryKeyValue)
            })
            .and_then(|operation| operation.tensor.shape.get(1).copied())
            .unwrap_or(1)
    }

    fn clamp_token_coordinates(&mut self) {
        let count = self.token_count();
        self.selection.token = clamp_index(self.selection.token, count);
        self.selection.key = clamp_index(self.selection.key, count);
    }
}

const fn clamp_index(index: usize, count: usize) -> usize {
    let last = count.saturating_sub(1);
    if index < last { index } else { last }
}

#[cfg(test)]
mod tests {
    use super::Selection;

    #[test]
    fn selection_defaults_to_first_real_coordinate() {
        // Given: a new explorer.
        let selection = Selection::default();

        // When: no interaction has happened.
        // Then: every synchronized coordinate starts at zero.
        assert_eq!(
            selection,
            Selection {
                layer: 0,
                head: 0,
                token: 0,
                key: 0
            }
        );
    }
}
