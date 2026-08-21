//! Deterministic visualization geometry, scales, and numeric formatting.

/// Arrow-key direction for roving heatmap focus.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GridDirection {
    /// Previous key column.
    Left,
    /// Next key column.
    Right,
    /// Previous query row.
    Up,
    /// Next query row.
    Down,
}

/// Moves a row-major focus coordinate within fixed bounds.
#[must_use]
pub const fn move_grid(
    row: usize,
    column: usize,
    rows: usize,
    columns: usize,
    direction: GridDirection,
) -> (usize, usize) {
    match direction {
        GridDirection::Left => (row, column.saturating_sub(1)),
        GridDirection::Right => {
            let next = column.saturating_add(1);
            (
                row,
                if next < columns {
                    next
                } else {
                    columns.saturating_sub(1)
                },
            )
        }
        GridDirection::Up => (row.saturating_sub(1), column),
        GridDirection::Down => {
            let next = row.saturating_add(1);
            (
                if next < rows {
                    next
                } else {
                    rows.saturating_sub(1)
                },
                column,
            )
        }
    }
}

/// Formats selected tensor values for inspection.
#[must_use]
pub fn format_precise(value: f32) -> String {
    format!("{value:.8}")
}

/// Maps a finite probability to a CSS lightness percentage.
#[must_use]
pub const fn probability_lightness(probability: f32) -> f32 {
    probability.clamp(0.0, 1.0).mul_add(-56.0, 94.0)
}

#[cfg(test)]
mod tests {
    use super::{GridDirection, format_precise, move_grid, probability_lightness};

    #[test]
    fn roving_focus_moves_and_clamps_when_arrow_pressed() {
        // Given: the center of a 3 by 4 heatmap.
        let start = (1, 1);

        // When: each directional key is applied once.
        let left = move_grid(start.0, start.1, 3, 4, GridDirection::Left);
        let right = move_grid(start.0, start.1, 3, 4, GridDirection::Right);
        let up = move_grid(start.0, start.1, 3, 4, GridDirection::Up);
        let down = move_grid(start.0, start.1, 3, 4, GridDirection::Down);

        // Then: focus follows rows and columns without wrapping.
        assert_eq!((left, right, up, down), ((1, 0), (1, 2), (0, 1), (2, 1)));
        assert_eq!(move_grid(0, 0, 3, 4, GridDirection::Up), (0, 0));
    }

    #[test]
    fn selected_tensor_value_retains_f32_precision() {
        // Given: a value whose educational detail is lost at two decimals.
        let value = 0.123_456_79_f32;

        // When: the selected value is formatted.
        let rendered = format_precise(value);

        // Then: enough f32 precision remains visible for numerical inspection.
        assert_eq!(rendered, "0.12345679");
    }

    #[test]
    fn probability_scale_stays_inside_readable_range() {
        // Given/When: minimum and maximum probabilities are mapped.
        let minimum = probability_lightness(0.0);
        let maximum = probability_lightness(1.0);

        // Then: neither endpoint becomes invisible white or black.
        assert_eq!((minimum, maximum), (94.0, 38.0));
    }
}
