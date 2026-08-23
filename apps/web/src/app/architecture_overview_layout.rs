//! Geometry contracts for the config-driven architecture overview.

/// SVG viewport width.
pub const VIEW_WIDTH: usize = 1_000;
/// Horizontal center shared by the main nodes and calculation spine.
pub const CENTER_X: usize = VIEW_WIDTH / 2;
/// Input node top coordinate.
pub const INPUT_Y: usize = 24;
/// Input node height.
pub const INPUT_HEIGHT: usize = 56;
/// Input node width.
pub const INPUT_WIDTH: usize = 360;
/// First Transformer block top coordinate.
pub const BLOCK_START_Y: usize = 344;
/// Transformer block height.
pub const BLOCK_HEIGHT: usize = 480;
/// Edge-to-edge gap between output stages.
pub const STACK_GAP: usize = 24;
/// Gap between the repeated Block and final normalization.
pub const BLOCK_TO_STACK_GAP: usize = 36;
/// Height shared by compact output stages.
pub const COMPACT_HEIGHT: usize = 48;
/// Token-selection node height.
pub const SELECTION_HEIGHT: usize = 60;
/// Generated-token and append node height.
pub const TOKEN_HEIGHT: usize = 54;
/// Space after the final node inside the SVG viewport.
pub const VIEW_BOTTOM_GAP: usize = 40;

/// Vertical stage coordinates after the repeated Block container.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DiagramLayout {
    /// Final `LayerNorm` top coordinate.
    pub final_layer_norm_y: usize,
    /// Language-model head top coordinate.
    pub lm_head_y: usize,
    /// Logits node top coordinate.
    pub logits_y: usize,
    /// Token-selection node top coordinate.
    pub selection_y: usize,
    /// Generated-token node top coordinate.
    pub generated_y: usize,
    /// Append-to-context node top coordinate.
    pub append_y: usize,
    /// SVG viewport height.
    pub view_height: usize,
}

impl DiagramLayout {
    /// Builds one top-to-bottom layout for the configured block count.
    #[must_use]
    pub const fn new(_layer_count: usize) -> Self {
        let final_layer_norm_y = BLOCK_START_Y + BLOCK_HEIGHT + BLOCK_TO_STACK_GAP;
        let lm_head_y = final_layer_norm_y + COMPACT_HEIGHT + STACK_GAP;
        let logits_y = lm_head_y + COMPACT_HEIGHT + STACK_GAP;
        let selection_y = logits_y + COMPACT_HEIGHT + STACK_GAP;
        let generated_y = selection_y + SELECTION_HEIGHT + STACK_GAP;
        let append_y = generated_y + TOKEN_HEIGHT + STACK_GAP;
        Self {
            final_layer_norm_y,
            lm_head_y,
            logits_y,
            selection_y,
            generated_y,
            append_y,
            view_height: append_y + TOKEN_HEIGHT + VIEW_BOTTOM_GAP,
        }
    }

    /// Returns the repeat-path destination on the input node.
    #[must_use]
    pub const fn return_target(self) -> (usize, usize) {
        (CENTER_X - INPUT_WIDTH / 2, INPUT_Y + INPUT_HEIGHT / 2)
    }
}

#[cfg(test)]
mod tests {
    use super::{
        BLOCK_HEIGHT, BLOCK_START_Y, BLOCK_TO_STACK_GAP, CENTER_X, COMPACT_HEIGHT, DiagramLayout,
        INPUT_HEIGHT, INPUT_WIDTH, INPUT_Y, SELECTION_HEIGHT, STACK_GAP, TOKEN_HEIGHT,
        VIEW_BOTTOM_GAP, VIEW_WIDTH,
    };

    #[test]
    fn architecture_layout_uses_one_repeated_block_container() {
        let two_layers = DiagramLayout::new(2);
        let twelve_layers = DiagramLayout::new(12);

        assert_eq!(
            two_layers.final_layer_norm_y,
            twelve_layers.final_layer_norm_y
        );
        assert_eq!(CENTER_X, VIEW_WIDTH / 2);
        assert_eq!(
            two_layers.final_layer_norm_y,
            BLOCK_START_Y + BLOCK_HEIGHT + BLOCK_TO_STACK_GAP
        );
        assert_eq!(
            two_layers.lm_head_y,
            two_layers.final_layer_norm_y + COMPACT_HEIGHT + STACK_GAP
        );
        assert_eq!(
            two_layers.logits_y,
            two_layers.lm_head_y + COMPACT_HEIGHT + STACK_GAP
        );
        assert_eq!(
            two_layers.selection_y,
            two_layers.logits_y + COMPACT_HEIGHT + STACK_GAP
        );
        assert_eq!(
            two_layers.generated_y,
            two_layers.selection_y + SELECTION_HEIGHT + STACK_GAP
        );
        assert_eq!(
            two_layers.append_y,
            two_layers.generated_y + TOKEN_HEIGHT + STACK_GAP
        );
        assert_eq!(
            two_layers.view_height,
            two_layers.append_y + TOKEN_HEIGHT + VIEW_BOTTOM_GAP
        );
        assert_eq!(
            two_layers.return_target(),
            (CENTER_X - INPUT_WIDTH / 2, INPUT_Y + INPUT_HEIGHT / 2)
        );
    }
}
