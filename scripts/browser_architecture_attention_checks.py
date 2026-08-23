"""Assertions for Self-Attention Architecture probe values."""

from __future__ import annotations

from typing import Any

from browser_architecture_navigation import require


def verify_structure(detail: dict[str, Any], mobile: bool) -> None:
    require(detail["attention"] and not detail["block"], f"attention route: {detail}")
    require(
        detail["breadcrumbBlock"] == "Transformer Block × 2"
        and detail["breadcrumbAttention"] == "Self-Attention"
        and detail["breadcrumbCurrent"] == "page",
        f"attention breadcrumb: {detail}",
    )
    require(
        detail["layerButtons"] == 2 and detail["headButtons"] == 4,
        f"config selectors: {detail}",
    )
    require(detail["oneQkvProjection"] == 1, f"combined QKV: {detail}")
    require(detail["splitHeadNodes"] == 3, f"head splits: {detail}")
    require(
        len(detail["nodeIds"]) == 11
        and all(value == "selectable" for value in detail["nodeCapabilities"])
        and all(value == "button" for value in detail["nodeRoles"]),
        f"attention node contract: {detail}",
    )
    require(
        "Score MatMul, Query와 전치된 Key의 행렬곱" in detail["nodeAriaLabels"][4]
        and "Value MatMul, attention probability와 Value의 행렬곱"
        in detail["nodeAriaLabels"][8],
        f"attention accessible notation: {detail}",
    )
    starts = detail["qkvStarts"]
    require(
        all(
            abs(point["x"] - starts[0]["x"]) < 0.01
            and abs(point["y"] - starts[0]["y"]) < 0.01
            for point in starts
        ),
        f"QKV branch origin: {detail}",
    )
    require(not detail["hasValueToScores"], f"Value entered scores: {detail}")
    require(
        detail["qToScoresEnd"]["y"] == detail["kToScoresEnd"]["y"],
        f"Q/K score convergence: {detail}",
    )
    require(
        detail["valueToAggregationEnd"]["x"] > detail["qToScoresEnd"]["x"],
        f"Value aggregation path: {detail}",
    )
    require(
        detail["operationOrder"] == sorted(detail["operationOrder"]),
        f"attention operation order: {detail}",
    )
    current = detail["currentValues"]
    require(
        current == {"t": "—", "c": "64", "h": "4", "d": "16", "scale": "0.25"},
        f"attention current values: {detail}",
    )
    require(
        detail["symbolSections"] == ["A. 기호", "B. 현재 모델값", "C. 현재 연산"],
        f"attention panel hierarchy: {detail}",
    )
    require(
        detail["qkvShape"]
        and detail["scoreMatmul"]
        and detail["valueMatmul"]
        and detail["scaleSymbolic"]
        and detail["formula"],
        f"canonical attention notation: {detail}",
    )
    require(not detail["actualShapeInDiagram"], f"actual shape leaked into diagram: {detail}")
    require(not detail["legacyNotation"], f"legacy notation rendered: {detail}")
    require(detail["attentionOutput"], f"missing attention output: {detail}")
    require(not detail["hasResidual"], f"residual duplicated: {detail}")
    require(not detail["forbiddenDetail"], f"forbidden detail rendered: {detail}")
    require(detail["documentOverflow"] == 0, f"document overflow: {detail}")
    if mobile:
        require(detail["localOverflow"] > 0, f"mobile lacks local overflow: {detail}")
