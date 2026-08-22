//! Non-focusing alignment for selected evidence inside local scrollports.

use wasm_bindgen::JsCast as _;

pub(super) fn reveal_item(container_id: &str, item_id: &str) {
    let Some(document) = web_sys::window().and_then(|window| window.document()) else {
        return;
    };
    let Some(container) = document
        .get_element_by_id(container_id)
        .and_then(|element| element.dyn_into::<web_sys::HtmlElement>().ok())
    else {
        return;
    };
    let Some(item) = document
        .get_element_by_id(item_id)
        .and_then(|element| element.dyn_into::<web_sys::HtmlElement>().ok())
    else {
        return;
    };

    reveal_axis(
        item.offset_left(),
        item.offset_width(),
        container.scroll_left(),
        container.client_width(),
        |offset| container.set_scroll_left(offset),
    );
    reveal_axis(
        item.offset_top(),
        item.offset_height(),
        container.scroll_top(),
        container.client_height(),
        |offset| container.set_scroll_top(offset),
    );
}

fn reveal_axis(
    item_start: i32,
    item_size: i32,
    current_scroll: i32,
    viewport_size: i32,
    set_scroll: impl FnOnce(i32),
) {
    let item_end = item_start.saturating_add(item_size);
    let visible_end = current_scroll.saturating_add(viewport_size);
    if item_start < current_scroll || item_end > visible_end {
        let inset = viewport_size.saturating_sub(item_size).max(0) / 2;
        set_scroll(item_start.saturating_sub(inset).max(0));
    }
}
