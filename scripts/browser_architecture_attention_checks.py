"""Assertions for Self-Attention Architecture probe values."""

from __future__ import annotations

from typing import TypedDict

from browser_architecture_navigation import require


class ProbePoint(TypedDict):
    x: float
    y: float


class CurrentValues(TypedDict):
    t: str
    c: str
    h: str
    d: str
    scale: str


class AttentionDetailProbe(TypedDict):
    attention: bool
    block: bool
    breadcrumbBlock: str
    breadcrumbAttention: str
    breadcrumbCurrent: str
    layerButtons: int
    headButtons: int
    oneQkvProjection: int
    splitHeadNodes: int
    nodeIds: list[str]
    nodeCapabilities: list[str]
    nodeRoles: list[str]
    nodeAriaLabels: list[str]
    qkvStarts: list[ProbePoint]
    qToScoresEnd: ProbePoint
    kToScoresEnd: ProbePoint
    valueToAggregationEnd: ProbePoint
    hasValueToScores: bool
    operationOrder: list[int]
    currentValues: CurrentValues
    guidePage: str
    guideSections: list[str]
    outlineCount: int
    runtimePresentation: bool
    qkvShape: bool
    scoreMatmul: bool
    valueMatmul: bool
    scaleSymbolic: bool
    formula: bool
    connectorFormula: bool
    captionFormulaCount: int
    plainMathCodeCount: int
    plainConnectorLabelCount: int
    formulaMaxHeight: float
    actualShapeInDiagram: bool
    legacyNotation: bool
    attentionOutput: bool
    hasResidual: bool
    forbiddenDetail: bool
    documentOverflow: int
    localOverflow: int


def verify_structure(detail: AttentionDetailProbe, mobile: bool) -> None:
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
        detail["guidePage"] == "decoder-guide-self-attention"
        and detail["outlineCount"] == 8
        and detail["runtimePresentation"]
        and all(
            section in detail["guideSections"]
            for section in ("qkv", "heads", "score", "scale", "mask", "softmax", "value", "merge")
        ),
        f"attention Guide hierarchy: {detail}",
    )
    require(
        detail["qkvShape"]
        and detail["scoreMatmul"]
        and detail["valueMatmul"]
        and detail["scaleSymbolic"]
        and detail["formula"],
        f"canonical attention notation: {detail}",
    )
    require(
        detail["connectorFormula"]
        and detail["captionFormulaCount"] == 2
        and detail["plainMathCodeCount"] == 0
        and detail["plainConnectorLabelCount"] == 0,
        f"complete attention math surface: {detail}",
    )
    require(detail["formulaMaxHeight"] < 40, f"fragmented attention formula: {detail}")
    require(not detail["actualShapeInDiagram"], f"actual shape leaked into diagram: {detail}")
    require(not detail["legacyNotation"], f"legacy notation rendered: {detail}")
    require(detail["attentionOutput"], f"missing attention output: {detail}")
    require(not detail["hasResidual"], f"residual duplicated: {detail}")
    require(not detail["forbiddenDetail"], f"forbidden detail rendered: {detail}")
    require(detail["documentOverflow"] == 0, f"document overflow: {detail}")
    require(detail["localOverflow"] == 0, f"local overflow: {detail}")
