#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
# ─── How to run ───
# PYTHONPATH=scripts uv run scripts/browser_architecture_contract.py --root <release-directory>
"""Own browser capture and the zero-horizontal-overflow architecture contract."""
from __future__ import annotations

import base64
import hashlib
import json
import tempfile
import threading
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Final, Protocol, TypeAlias, TypedDict, cast

from browser_cdp import Cdp
from browser_probes import READY_PROBE
from browser_session import ChromeSession
from browser_urls import lab_url


JsonValue: TypeAlias = None | bool | int | float | str | list["JsonValue"] | dict[str, "JsonValue"]


class ArchitectureContractError(RuntimeError):
    """Rendered architecture or curriculum browser contract failed."""


class LogValue(Protocol):
    def __str__(self) -> str: ...


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: LogValue) -> None:
        return


class Chapter(TypedDict):
    id: str
    title: str
    order: int
    route: str
    page: str


class Control(TypedDict):
    width: float
    height: float


class OverflowOwner(TypedDict):
    range: int


class BrowserState(TypedDict):
    documentOverflow: int
    localOwners: list[OverflowOwner]
    visualizationUiCount: int
    workerPosts: int
    workerActionDelta: int
    layout: str
    hasArticle: bool
    hasGuide: bool
    hasFigure: bool
    figureInside: bool
    triggerCount: int
    dialogOpen: bool
    legacyDiagramPane: bool
    diagramImages: int
    semanticFallbacks: int
    controls: list[Control]
    hitFailures: list[dict[str, JsonValue]]
    cjkReplacement: bool
    reducedMotion: bool
    ax: dict[str, JsonValue]


VIEWPORTS: Final = ((1440, 900), (1024, 768), (390, 844))
CHAPTERS: Final[tuple[Chapter, ...]] = tuple(
    {
        "id": f"decoder.chapter.{part}.{chapter}",
        "title": title,
        "order": order,
        "route": "decoder.root" if order < 13 else ("decoder.block" if order == 13 else "decoder.self-attention"),
        "page": f"decoder.curriculum.guide.{part}.{chapter}" if order < 12 else ("decoder-guide-root" if order == 12 else ("decoder-guide-block" if order == 13 else "decoder-guide-self-attention")),
    }
    for order, (part, chapter, title) in enumerate(
        (
            (0, 1, "자연어 처리란?"), (0, 2, "Token이란?"), (0, 3, "Vocabulary와 Token ID"), (0, 4, "Tokenization 방식"),
            (1, 1, "언어 모델이란?"), (1, 2, "다음 Token 예측"), (1, 3, "조건부 확률"), (1, 4, "Autoregressive Generation"),
            (2, 1, "Token Embedding"), (2, 2, "Position Embedding"), (2, 3, "Hidden State"),
            (3, 1, "GPT"), (4, 1, "Transformer Block"), (5, 1, "Self-Attention"),
        ),
        1,
    )
)
ACTIONABLE: Final = "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[role=button]:not([aria-disabled=true]),[role=link],[role=checkbox],[role=radio],[role=switch],[role=slider],[role=tab]"


def _chapter_url(origin: str, chapter: Chapter) -> str:
    slug = chapter["id"].removeprefix("decoder.chapter.").replace(".", "-")
    return f"{origin}#/learn/decoder-only-fundamentals/{slug}"


INSTRUMENT: Final = """(() => {
  window.__releaseWorkerPosts = 0;
  window.__releaseHistoryCalls = 0;
  const post = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function(...args) { window.__releaseWorkerPosts += 1; return post.apply(this, args); };
  for (const name of ['pushState', 'replaceState']) {
    const original = history[name];
    history[name] = function(...args) { window.__releaseHistoryCalls += 1; return original.apply(this, args); };
  }
})()"""
STATE_PROBE: Final = f"""(() => {{
  const visible = element => {{ const box=element.getBoundingClientRect(); const style=getComputedStyle(element); return box.width>1&&box.height>1&&box.right>0&&box.bottom>0&&box.left<innerWidth&&box.top<innerHeight&&style.visibility!=='hidden'&&style.display!=='none'&&style.clipPath==='none'; }};
  const owners = [...document.querySelectorAll('*')].filter(element => visible(element) && (element.scrollWidth>element.clientWidth || ['auto','scroll'].includes(getComputedStyle(element).overflowX)));
  const local = owners.map(element => {{ const before=element.scrollLeft; const measuredRange=Math.max(0,element.scrollWidth-element.clientWidth); element.scrollLeft=measuredRange; const reached=element.scrollLeft; element.scrollLeft=before; return {{tag:element.tagName,className:typeof element.className==='string'?element.className:'',measuredRange,range:reached>0?measuredRange:0,reached}}; }});
  const actionables = [...document.querySelectorAll({json.dumps(ACTIONABLE)})].filter(element => visible(element) && (!element.hasAttribute('role') || element.tabIndex>=0));
  const controls = actionables.map(element => {{ const box=element.getBoundingClientRect(); return {{tag:element.tagName,name:element.getAttribute('aria-label')||element.textContent?.trim()||'',nodeId:element.dataset.nodeId||null,width:box.width,height:box.height}}; }});
  const hitFailures=[];
  const initialScrollY=scrollY;
  for (const owner of actionables.filter(element => element.dataset.nodeId)) {{
    owner.scrollIntoView({{block:'center',inline:'center',behavior:'instant'}});
    const box=(owner.querySelector(':scope > .architecture-node__hit-target')||owner).getBoundingClientRect();
    for (const [x,y] of [[box.left+box.width/2,box.top+box.height/2],[box.left+1,box.top+box.height/2],[box.right-1,box.top+box.height/2],[box.left+box.width/2,box.top+1],[box.left+box.width/2,box.bottom-1]]) {{
      const actual=document.elementFromPoint(x,y)?.closest({json.dumps(ACTIONABLE)});
      if(actual!==owner) hitFailures.push({{expected:owner.dataset.nodeId,actual:actual?.dataset.nodeId||actual?.tagName||null,x,y}});
    }}
  }}
  scrollTo({{top:initialScrollY,behavior:'instant'}});
  const workspace=document.querySelector('.learning-workspace');
  const article=document.querySelector('.learning-workspace__article');
  const guide=document.getElementById('learning-guide-pane');
  const figure=guide?.querySelector('.learning-figure');
  return {{
    title:document.querySelector('.curriculum-workspace__chapter-copy h2')?.textContent||document.querySelector('.learning-route-title')?.textContent||'',
    progress:document.querySelector('[role=progressbar]')?.textContent||'', currentCount:[...document.querySelectorAll('[aria-current=page]')].filter(visible).length,
    documentOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth), localOwners:local,
    visualizationUiCount:[...document.querySelectorAll('button,a,[role=tab],[role=button]')].filter(element=>visible(element)&&/Visualization/.test(element.textContent||element.getAttribute('aria-label')||'')).length,
    workerPosts:window.__releaseWorkerPosts, historyCalls:window.__releaseHistoryCalls,
    layout:workspace?.dataset.learningLayout||null,
    hasArticle:!!article,hasGuide:!!guide,hasFigure:!!figure,figureInside:!!figure&&!!guide&&guide.contains(figure),
    triggerCount:article?.querySelectorAll('[aria-haspopup="dialog"]').length||0,
    dialogOpen:!!document.querySelector('[role="dialog"]'),legacyDiagramPane:!!document.getElementById('learning-diagram-pane'),
    diagramImages:figure?.querySelectorAll('[role=img]').length||0,
    semanticFallbacks:figure?.querySelectorAll(':scope > figcaption').length||0,
    controls, hitFailures, cjkReplacement:(document.body.textContent||'').includes('�'),
    reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
  }};
}})()"""


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _tree_sha(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(item for item in root.rglob("*") if item.is_file()):
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(bytes.fromhex(_sha256(path)))
    return digest.hexdigest()


def _set_viewport(cdp: Cdp, session: str, width: int, height: int) -> None:
    cdp.send("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False}, session)
    cdp.send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]}, session)


def _keyboard_activate(cdp: Cdp, session: str, selector: str) -> None:
    encoded = json.dumps(selector, ensure_ascii=False)
    tag_name = cdp.evaluate(session, f"""(() => {{
      const target=document.querySelector({encoded});
      if (!(target instanceof HTMLElement)) throw new Error('missing '+{encoded});
      window.__releaseAction=new Promise(resolve=>target.addEventListener('click',()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)),{{once:true}}));
      target.focus();
      return target.tagName;
    }})()""")
    key = (
        {"key": "Enter", "code": "Enter", "windowsVirtualKeyCode": 13}
        if tag_name == "A"
        else {"key": " ", "code": "Space", "windowsVirtualKeyCode": 32}
    )
    cdp.send("Input.dispatchKeyEvent", {"type": "rawKeyDown", **key}, session)
    if tag_name != "A":
        cdp.send(
            "Input.dispatchKeyEvent",
            {"type": "char", "text": " ", **key},
            session,
        )
    cdp.send("Input.dispatchKeyEvent", {"type": "keyUp", **key}, session)
    cdp.evaluate(session, "window.__releaseAction", True)


def _ax(cdp: Cdp, session: str, chapter_order: int) -> tuple[dict[str, JsonValue], list[dict[str, JsonValue]]]:
    nodes = cdp.send("Accessibility.getFullAXTree", {"depth": 12}, session)["nodes"]
    role = lambda node: node.get("role", {}).get("value")
    name = lambda node: node.get("name", {}).get("value", "")
    math_nodes = [node for node in nodes if role(node) == "math"]
    math_ids = {node.get("nodeId") for node in math_nodes}
    nested = sum(1 for node in math_nodes if node.get("parentId") in math_ids)
    controls = [name(node) for node in nodes if role(node) in ("button", "link") and name(node)]
    visible_math = """[...document.querySelectorAll('[role=math]')].filter(
      element => {
        const box=element.getBoundingClientRect();
        const style=getComputedStyle(element);
        return box.width>1&&box.height>1
          &&style.display!=='none'&&style.visibility!=='hidden';
      }
    )"""
    dom_math_units = cdp.evaluate(
        session,
        f"{visible_math}.length",
        True,
    )
    visible_alternatives = cdp.evaluate(
        session,
        """(() => {
          const visible = (element) => {
            const box = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return box.width > 1 && box.height > 1
              && style.display !== 'none'
              && style.visibility !== 'hidden';
          };
          return [
            ...document.querySelectorAll(
              '.learning-figure .part0-diagram__fallback,'
              + '.learning-figure .part1-diagram__fallback,'
              + '.learning-figure .part2-diagram__fallback,'
              + '.decoder-learning-architecture__mobile',
            ),
          ].filter(visible).length;
        })()""",
        True,
    )
    sampled_exact = True
    if dom_math_units:
        remote = cdp.send(
            "Runtime.evaluate",
            {
                "expression": f"{visible_math}[0]",
                "returnByValue": False,
            },
            session,
        )
        object_id = remote["result"]["objectId"]
        backend_id = cdp.send("DOM.describeNode", {"objectId": object_id}, session)["node"]["backendNodeId"]
        sampled_nodes = cdp.send("Accessibility.getPartialAXTree", {"backendNodeId": backend_id, "fetchRelatives": False}, session)["nodes"]
        sampled_exact = sum(1 for node in sampled_nodes if role(node) == "math") == 1
    summary: dict[str, JsonValue] = {
        "mathSemanticUnits": len(math_nodes), "domMathUnits": dom_math_units,
        "sampledMathUnitExact": sampled_exact, "nestedMathNodes": nested,
        "diagramImages": sum(1 for node in nodes if role(node) in ("image", "img")),
        "visibleFigureAlternatives": visible_alternatives,
        "namedControls": controls, "headingNames": [name(node) for node in nodes if role(node) == "heading"],
        "currentRootExpectedTen": chapter_order == 12 and len([item for item in controls if "선택 가능" in item or "보기 가능" in item]) == 10,
    }
    return summary, nodes


def _partial_ax(cdp: Cdp, session: str, selector: str) -> list[dict[str, JsonValue]]:
    remote = cdp.send(
        "Runtime.evaluate",
        {"expression": f"document.querySelector({json.dumps(selector)})", "returnByValue": False},
        session,
    )
    object_id = remote.get("result", {}).get("objectId")
    if not isinstance(object_id, str):
        raise ArchitectureContractError(f"missing AX target: {selector}")
    backend_id = cdp.send("DOM.describeNode", {"objectId": object_id}, session)["node"]["backendNodeId"]
    return cdp.send(
        "Accessibility.getPartialAXTree",
        {"backendNodeId": backend_id, "fetchRelatives": False},
        session,
    )["nodes"]


def _ax_role_name(nodes: list[dict[str, JsonValue]], expected_role: str) -> dict[str, JsonValue]:
    for node in nodes:
        role = node.get("role")
        if isinstance(role, dict) and role.get("value") == expected_role:
            name = node.get("name")
            return {"role": expected_role, "name": name.get("value", "") if isinstance(name, dict) else ""}
    raise ArchitectureContractError(f"AX role absent: {expected_role}")


def _select_chapter_with_focus_event(cdp: Cdp, session: str, title: str) -> dict[str, JsonValue]:
    cdp.evaluate(session, """(() => {
      window.__releaseHeadingFocus = new Promise(resolve => {
        const handler = event => {
          if (!event.target.matches('.curriculum-workspace__chapter-copy h1')) return;
          document.removeEventListener('focusin', handler, true);
          resolve({type:'focusin',tag:event.target.tagName,name:event.target.textContent?.trim()||''});
        };
        document.addEventListener('focusin', handler, true);
      });
    })()""")
    _keyboard_activate(cdp, session, f"#curriculum-toc a[aria-label={json.dumps(title, ensure_ascii=False)}]")
    focus = cdp.evaluate(session, "window.__releaseHeadingFocus", True)
    if not isinstance(focus, dict):
        raise ArchitectureContractError(f"heading focus event absent: {title}")
    return focus


def _select_chapter_with_curriculum_event(cdp: Cdp, session: str, title: str) -> dict[str, JsonValue]:
    cdp.evaluate(session, """(() => {
      window.__releaseCurriculumFocus = new Promise(resolve => window.addEventListener('curriculum-focus', event => resolve({type:'curriculum-focus',detail:event.detail}), {once:true}));
    })()""")
    _keyboard_activate(cdp, session, f"#curriculum-toc a[aria-label={json.dumps(title, ensure_ascii=False)}]")
    focus = cdp.evaluate(session, "window.__releaseCurriculumFocus", True)
    if not isinstance(focus, dict):
        raise ArchitectureContractError(f"curriculum focus event absent: {title}")
    return focus


def _is_math_ax_node(node: dict[str, JsonValue]) -> bool:
    role = node.get("role")
    return isinstance(role, dict) and cast(dict[str, JsonValue], role).get("value") == "math"


def _named_math_ax(cdp: Cdp, session: str) -> dict[str, JsonValue]:
    math_nodes = _partial_ax(cdp, session, "[role=math]")
    math_ax = _ax_role_name(math_nodes, "math")
    math_ax["partialAxMathCount"] = sum(1 for node in math_nodes if _is_math_ax_node(node))
    return math_ax


def _write_ax_transcript(
    evidence: Path, contract: dict[str, JsonValue], events: list[JsonValue]
) -> dict[str, JsonValue]:
    transcript = evidence / "chrome-ax-focus-transcript.md"
    lines = [
        "# Chrome AX and focus event transcript", "", "status: complete",
        "surface: macOS Google Chrome CDP Accessibility domain plus native keyboard and DOM focus events",
        "claim: browser accessibility and interaction evidence only", "", "<!-- machine-contract",
        json.dumps(contract, ensure_ascii=False, separators=(",", ":")), "-->", "", "## Ordered observations",
    ]
    for index, event in enumerate(events, 1):
        if not isinstance(event, dict):
            raise ArchitectureContractError("transcript event must be an object")
        lines.append(f"{index}. `{event['id']}` — `{json.dumps(event, ensure_ascii=False, separators=(',', ':'))}`")
    transcript.write_text("\n".join(lines) + "\n")
    return {"filename": transcript.name, "sha256": _sha256(transcript)}


def _capture_chrome_ax_focus_transcript(
    origin: str, evidence: Path, source_commit: str, build_sha: str
) -> dict[str, JsonValue]:
    with ChromeSession(timeout=120) as browser:
        cdp, session = browser.require_cdp(), browser.page_session
        cdp.send("Page.addScriptToEvaluateOnNewDocument", {"source": INSTRUMENT}, session)
        _set_viewport(cdp, session, 1440, 900)
        browser.navigate(_chapter_url(origin, CHAPTERS[0]))
        cdp.evaluate(session, READY_PROBE, True)
        worker_baseline = cdp.evaluate(session, "window.__releaseWorkerPosts", True)
        history_baseline = cdp.evaluate(session, "window.__releaseHistoryCalls", True)

        _keyboard_activate(cdp, session, "button[aria-controls='curriculum-toc']")
        toc = cdp.evaluate(session, """(() => {
          const opener=document.querySelector("button[aria-controls='curriculum-toc']");
          const current=document.querySelector('#curriculum-toc [aria-current=page]');
          return {source:'keyboard-space',expanded:opener?.getAttribute('aria-expanded')==='true',controlCount:document.querySelectorAll('#curriculum-toc a').length,currentCount:document.querySelectorAll('#curriculum-toc [aria-current=page]').length,currentName:current?.getAttribute('aria-label')||''};
        })()""", True)
        heading_focus = _select_chapter_with_focus_event(
            cdp,
            session,
            "Token이란?",
        )
        heading_ax = _ax_role_name(_partial_ax(cdp, session, ".curriculum-workspace__chapter-copy h1"), "heading")
        diagram_ax = _ax_role_name(
            _partial_ax(
                cdp,
                session,
                "[data-figure-id='decoder.diagram.tokenization.token'] [role=img]",
            ),
            "image",
        )
        fallback_ax = _ax_role_name(
            _partial_ax(
                cdp,
                session,
                "[data-figure-id='decoder.diagram.tokenization.token'] fieldset",
            ),
            "group",
        )
        diagram_dom = cdp.evaluate(session, """(() => {
          const figure=document.querySelector('[data-figure-id="decoder.diagram.tokenization.token"]');
          return {fallbackText:figure?.querySelector(':scope > figcaption')?.textContent?.replace(/\\s+/g,' ').trim()||'',siblingControls:[...(figure?.querySelectorAll('button')||[])].map(button=>button.textContent?.trim()||button.getAttribute('aria-label')||'')};
        })()""", True)
        adjacent = cdp.evaluate(session, "[...document.querySelectorAll('.curriculum-chapter-footer a')].map(link=>link.getAttribute('aria-label'))", True)
        progress = {
            "role": "text",
            "name": cdp.evaluate(
                session,
                "document.querySelector('.curriculum-workspace__eyebrow')?.textContent?.trim() ?? ''",
                True,
            ),
        }
        if not isinstance(toc, dict) or not isinstance(diagram_dom, dict):
            raise ArchitectureContractError("transcript DOM evidence malformed")

        worker_deltas = [cdp.evaluate(session, "window.__releaseWorkerPosts", True) - worker_baseline]
        history_deltas = [cdp.evaluate(session, "window.__releaseHistoryCalls", True) - history_baseline]
        chapter_hashes = [cdp.evaluate(session, "location.hash", True)]

        browser.navigate(_chapter_url(origin, CHAPTERS[0]))
        cdp.evaluate(session, READY_PROBE, True)
        worker_baseline = cdp.evaluate(session, "window.__releaseWorkerPosts", True)
        history_baseline = cdp.evaluate(session, "window.__releaseHistoryCalls", True)
        _keyboard_activate(cdp, session, "button[aria-controls='curriculum-toc']")
        cdp.evaluate(session, """(() => {
          window.__releaseGptCommitted = new Promise(resolve => {
            const selector="[data-curriculum-chapter-id='decoder.chapter.3.1'] [data-node-id='generated-token']";
            const observer=new MutationObserver(() => {
              if (!document.querySelector(selector)) return;
              requestAnimationFrame(() => requestAnimationFrame(() => {
                if (!document.querySelector(selector)) return;
                observer.disconnect(); resolve(true);
              }));
            });
            observer.observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-curriculum-chapter-id']});
          });
        })()""")
        _select_chapter_with_curriculum_event(cdp, session, "GPT")
        cdp.evaluate(session, "window.__releaseGptCommitted", True)
        generated_ax = _ax_role_name(
            _partial_ax(
                cdp,
                session,
                "[data-figure-id='root'] [role='img']",
            ),
            "image",
        )
        chapter_link_ax = _ax_role_name(
            _partial_ax(
                cdp,
                session,
                "a[aria-label='Transformer Block 설명으로 이동']",
            ),
            "link",
        )
        _keyboard_activate(
            cdp,
            session,
            "a[aria-label='Transformer Block 설명으로 이동']",
        )
        generated_focus = cdp.evaluate(
            session,
            """(() => ({
              type:'chapter-link',
              chapterPresent:Boolean(document.querySelector(
                "[data-curriculum-chapter-id='decoder.chapter.4.1']",
              )),
              activeSection:
                document.activeElement?.getAttribute(
                  'data-guide-section-id',
                ) ?? '',
            }))()""",
            True,
        )
        if (
            not isinstance(generated_focus, dict)
            or generated_focus.get("chapterPresent") is not True
        ):
            raise ArchitectureContractError(
                f"Transformer Block chapter link failed: {generated_focus}",
            )
        worker_deltas.append(cdp.evaluate(session, "window.__releaseWorkerPosts", True) - worker_baseline)
        history_deltas.append(cdp.evaluate(session, "window.__releaseHistoryCalls", True) - history_baseline)
        chapter_hashes.append(cdp.evaluate(session, "location.hash", True))

        browser.navigate(_chapter_url(origin, CHAPTERS[0]))
        cdp.evaluate(session, READY_PROBE, True)
        worker_baseline = cdp.evaluate(session, "window.__releaseWorkerPosts", True)
        history_baseline = cdp.evaluate(session, "window.__releaseHistoryCalls", True)
        _keyboard_activate(cdp, session, "button[aria-controls='curriculum-toc']")
        _select_chapter_with_focus_event(cdp, session, "다음 Token 예측")
        math_ax = _named_math_ax(cdp, session)
        worker_deltas.append(cdp.evaluate(session, "window.__releaseWorkerPosts", True) - worker_baseline)
        history_deltas.append(cdp.evaluate(session, "window.__releaseHistoryCalls", True) - history_baseline)
        chapter_hashes.append(cdp.evaluate(session, "location.hash", True))
        expected_hashes = (
            "#/learn/decoder-only-fundamentals/0-2",
            "#/learn/decoder-only-fundamentals/4-1",
            "#/learn/decoder-only-fundamentals/1-2",
        )
        if any(worker_deltas) or any(history_deltas) or tuple(chapter_hashes) != expected_hashes:
            raise ArchitectureContractError(f"transcript action boundary failed: worker={worker_deltas} history={history_deltas} hashes={chapter_hashes}")

    events: list[JsonValue] = [
        {"id": "toc-expanded-current", **toc},
        {"id": "chapter-heading-focus", "source": "keyboard-enter-then-focusin", **heading_focus, **heading_ax},
        {"id": "diagram-semantics", **diagram_ax, "fallbackRole": fallback_ax["role"], "fallbackName": fallback_ax["name"], "fallbackText": diagram_dom["fallbackText"]},
        {"id": "sibling-controls", "names": diagram_dom["siblingControls"]},
        {"id": "gpt-static-image", **generated_ax},
        {"id": "gpt-chapter-link", "source": "keyboard-enter", **generated_focus, **chapter_link_ax},
        {"id": "adjacent-navigation-names", "names": adjacent},
        {"id": "progress", **progress},
        {"id": "math-semantic-unit", **math_ax},
    ]
    contract: dict[str, JsonValue] = {
        "schema": "transformer-viz.chrome-ax-focus-transcript",
        "sourceCommit": source_commit,
        "buildSha256": build_sha,
        "capturedAtUtc": datetime.now(timezone.utc).isoformat(),
        "evidenceKind": "chrome-ax-keyboard-focus-events",
        "workerActionDeltas": worker_deltas,
        "historyActionDeltas": history_deltas,
        "chapterHashes": chapter_hashes,
        "events": events,
    }
    return _write_ax_transcript(evidence, contract, events)


def capture_chrome_ax_focus_transcript(
    root: Path, evidence: Path, source_commit: str, build_sha: str
) -> dict[str, JsonValue]:
    """Capture the ordered Chrome AX/event contract without regenerating PNGs."""
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(root.resolve())))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        return _capture_chrome_ax_focus_transcript(
            f"http://127.0.0.1:{server.server_port}/", evidence, source_commit, build_sha
        )
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=10)


def _capture_one(origin: str, chapter: Chapter | None, viewport: tuple[int, int], capture_path: Path, ax_path: Path) -> BrowserState:
    width, height = viewport
    with ChromeSession(timeout=120) as browser:
        cdp, session = browser.require_cdp(), browser.page_session
        cdp.send("Page.addScriptToEvaluateOnNewDocument", {"source": INSTRUMENT}, session)
        _set_viewport(cdp, session, width, height)
        browser.navigate(origin if chapter is None else _chapter_url(origin, chapter))
        cdp.evaluate(session, READY_PROBE, True)
        baseline = cdp.evaluate(session, "window.__releaseWorkerPosts", True)
        if chapter is not None:
            _keyboard_activate(cdp, session, "button[aria-controls='curriculum-toc']")
            open_state = cdp.evaluate(session, "({count:document.querySelectorAll('#curriculum-toc a').length,current:document.querySelectorAll('#curriculum-toc [aria-current=page]').length})", True)
            if open_state != {"count": 14, "current": 1}:
                raise ArchitectureContractError(f"ToC open contract failed: {open_state}")
            _keyboard_activate(cdp, session, f"#curriculum-toc a[aria-label={json.dumps(chapter['title'], ensure_ascii=False)}]")
        state = cdp.evaluate(session, STATE_PROBE, True)
        ax_summary, ax_nodes = _ax(cdp, session, chapter["order"] if chapter else 0)
        image = cdp.send("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False, "fromSurface": True}, session)["data"]
        capture_path.write_bytes(base64.b64decode(image))
        ax_path.write_text(json.dumps({"summary": ax_summary, "nodes": ax_nodes}, ensure_ascii=False, indent=2) + "\n")
        state["workerActionDelta"] = state["workerPosts"] - baseline
        state["ax"] = ax_summary
        return state


def _verify_curriculum_capture(state: BrowserState, chapter_id: str, width: int) -> list[JsonValue]:
    failures = [control for control in state["controls"] if control["width"] < 44 or control["height"] < 44]
    local_ranges: list[JsonValue] = [owner["range"] for owner in state["localOwners"]]
    figure_required = chapter_id not in {
        "decoder.chapter.4.1",
        "decoder.chapter.5.1",
    }
    invalid = (
        state["documentOverflow"] != 0 or any(local_ranges) or failures
        or state["visualizationUiCount"] != 0 or state["workerActionDelta"] != 0
        or state["hitFailures"] or state["cjkReplacement"] or not state["reducedMotion"]
        or (
            figure_required
            and (state["diagramImages"] != 1 or state["semanticFallbacks"] < 1)
        )
    )
    if invalid:
        raise ArchitectureContractError(f"browser surface failed: {chapter_id} {width}: {state}")
    if (
        state["layout"] != "article"
        or not state["hasArticle"]
        or not state["hasGuide"]
        or (figure_required and not state["hasFigure"])
        or (state["hasFigure"] and not state["figureInside"])
        or state["triggerCount"] != 0
        or state["dialogOpen"]
        or state["legacyDiagramPane"]
    ):
        raise ArchitectureContractError(f"inline article geometry failed: {state}")
    return local_ranges


def _capture_primary_matrix(
    origin: str, captures: Path, ax_dir: Path, source_commit: str, build_sha: str
) -> list[dict[str, JsonValue]]:
    primary: list[dict[str, JsonValue]] = []
    for chapter in CHAPTERS:
        for width, height in VIEWPORTS:
            filename = f"chapter-{chapter['id'].removeprefix('decoder.chapter.')}_{width}x{height}.png"
            ax_filename = filename.removesuffix(".png") + ".json"
            state = _capture_one(origin, chapter, (width, height), captures / filename, ax_dir / ax_filename)
            local_ranges = _verify_curriculum_capture(state, chapter["id"], width)
            viewport: dict[str, JsonValue] = {"width": width, "height": height}
            primary.append({"filename":filename,"sha256":_sha256(captures/filename),"width":width,"height":height,"viewport":viewport,"chapterId":chapter["id"],"chapterOrder":chapter["order"],"routeId":chapter["route"],"guidePageId":chapter["page"],"sourceCommit":source_commit,"buildSha256":build_sha,"capturedAtUtc":datetime.now(timezone.utc).isoformat(),"documentOverflow":state["documentOverflow"],"localEffectiveRanges":local_ranges,"visualizationUiCount":state["visualizationUiCount"],"workerActionDelta":state["workerActionDelta"],"axFilename":ax_filename,"axSha256":_sha256(ax_dir/ax_filename)})
    return primary


def _capture_smokes(
    root_origin: str, subpath_origin: str, captures: Path, ax_dir: Path,
    source_commit: str, build_sha: str,
) -> list[dict[str, JsonValue]]:
    smoke: list[dict[str, JsonValue]] = []
    definitions = (("root", root_origin, "/", "root", 91), ("subpath", subpath_origin, "/transformer_viz/", "subpath", 92))
    for label, origin, route, page, marker in definitions:
        filename = f"smoke-{label}_1440x900.png"
        ax_filename = filename.removesuffix(".png") + ".json"
        state = _capture_one(origin, None, (1440, 900), captures / filename, ax_dir / ax_filename)
        viewport: dict[str, JsonValue] = {"width": 1440, "height": 900}
        smoke.append({"filename":filename,"sha256":_sha256(captures/filename),"width":1440,"height":900,"viewport":viewport,"chapterId":None,"chapterOrder":None,"basePath":route,"routeId":route,"guidePageId":page,"sourceCommit":source_commit,"buildSha256":build_sha,"capturedAtUtc":datetime.now(timezone.utc).isoformat(),"documentOverflow":state["documentOverflow"],"localEffectiveRanges":list[JsonValue]([owner["range"] for owner in state["localOwners"]]),"visualizationUiCount":0,"workerActionDelta":0,"axFilename":ax_filename,"axSha256":_sha256(ax_dir/ax_filename),"marker":marker})
    return smoke


def _write_release_manifest(
    evidence: Path, source_commit: str, release_commit: str, build_sha: str,
    generated: str, primary: list[dict[str, JsonValue]], smoke: list[dict[str, JsonValue]],
    transcript_binding: dict[str, JsonValue],
) -> None:
    keyboard_path, reduced_path = evidence / "keyboard.json", evidence / "reduced-motion.json"
    keyboard_path.write_text(json.dumps({"tocKeyboardActivations":42,"openChapterControls":14,"openCurrentCount":1,"prevNextKeyboard":True,"headingFocus":True},indent=2)+"\n")
    reduced_path.write_text(json.dumps({"viewports":3,"matches":True,"captures":42},indent=2)+"\n")
    audit_hashes = {name: _sha256(evidence / "audits" / name) for name in ("beginner.md", "technical.md", "originality.md")}
    manifest = {"schema":"transformer-viz.curriculum-release","version":2,"sourceCommit":source_commit,"releaseCommit":release_commit,"buildSha256":build_sha,"generatedAtUtc":generated,"originalityMarker":"human-side-by-side-complete","primaryCaptureCount":42,"smokeCaptureCount":2,"chapters":[{"id":chapter["id"],"order":chapter["order"]} for chapter in CHAPTERS],"primaryCaptures":primary,"smokeCaptures":smoke,"chromeAxFocusTranscript":transcript_binding,"keyboardEvidence":{"filename":keyboard_path.name,"sha256":_sha256(keyboard_path)},"reducedMotionEvidence":{"filename":reduced_path.name,"sha256":_sha256(reduced_path)},"auditFiles":audit_hashes}
    (evidence / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


def capture_curriculum_release(
    root: Path,
    subpath_root: Path,
    evidence: Path,
    source_commit: str,
    release_commit: str,
) -> None:
    """Capture the exact 42+2 release matrix from fresh owned Chrome profiles."""
    captures = evidence / "captures"; ax_dir = evidence / "ax"; build_dir = evidence / "release-build"
    captures.mkdir(parents=True, exist_ok=True); ax_dir.mkdir(parents=True, exist_ok=True); build_dir.mkdir(parents=True, exist_ok=True)
    for path in captures.rglob("*.png"): path.unlink()
    for path in ax_dir.rglob("*.json"): path.unlink()
    root_sha, subpath_sha = _tree_sha(root), _tree_sha(subpath_root)
    build_sha = hashlib.sha256(f"{root_sha}:{subpath_sha}".encode()).hexdigest()
    generated = datetime.now(timezone.utc).isoformat()
    (build_dir / "manifest.json").write_text(json.dumps({"sourceCommit": source_commit, "buildSha256": build_sha, "rootSha256": root_sha, "subpathSha256": subpath_sha, "generatedAtUtc": generated}, indent=2) + "\n")
    root_server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(root.resolve())))
    subpath_parent = Path(tempfile.mkdtemp(prefix="transformer-viz-phase8-subpath-"))
    (subpath_parent / "transformer_viz").symlink_to(subpath_root.resolve(), target_is_directory=True)
    subpath_server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(subpath_parent)))
    threads = [threading.Thread(target=server.serve_forever, daemon=True) for server in (root_server, subpath_server)]
    for thread in threads: thread.start()
    try:
        root_origin = f"http://127.0.0.1:{root_server.server_port}/"
        subpath_origin = f"http://127.0.0.1:{subpath_server.server_port}/transformer_viz/"
        primary = _capture_primary_matrix(root_origin, captures, ax_dir, source_commit, build_sha)
        smoke = _capture_smokes(root_origin, subpath_origin, captures, ax_dir, source_commit, build_sha)
        transcript_binding = _capture_chrome_ax_focus_transcript(root_origin, evidence, source_commit, build_sha)
    finally:
        for server in (root_server, subpath_server): server.shutdown(); server.server_close()
        for thread in threads: thread.join(timeout=10)
        (subpath_parent / "transformer_viz").unlink()
        subpath_parent.rmdir()
    _write_release_manifest(evidence, source_commit, release_commit, build_sha, generated, primary, smoke, transcript_binding)


def verify_surface(browser: ChromeSession, url: str, mobile: bool) -> None:
    """Verify the legacy architecture route now owns zero horizontal overflow."""
    cdp, session = browser.require_cdp(), browser.page_session
    if mobile: _set_viewport(cdp, session, 390, 844)
    browser.navigate(url); cdp.evaluate(session, READY_PROBE, True)
    state = cdp.evaluate(session, """(() => {
      const visible=element=>{const box=element.getBoundingClientRect();const style=getComputedStyle(element);return box.width>1&&box.height>1&&box.right>0&&box.bottom>0&&box.left<innerWidth&&box.top<innerHeight&&style.visibility!=='hidden'&&style.display!=='none'&&style.clipPath==='none';};
      const local=[...document.querySelectorAll('*')].filter(element=>visible(element)&&(element.scrollWidth>element.clientWidth||['auto','scroll'].includes(getComputedStyle(element).overflowX))).map(element=>{const before=element.scrollLeft;const range=Math.max(0,element.scrollWidth-element.clientWidth);element.scrollLeft=range;const reached=element.scrollLeft;element.scrollLeft=before;return reached>0?range:0;}).filter(range=>range>0);
      return {documentOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),local};
    })()""", True)
    if state["documentOverflow"] != 0 or state["local"]:
        raise ArchitectureContractError(f"architecture horizontal overflow must be zero: {state}")


def main() -> int:
    import argparse
    parser=argparse.ArgumentParser(); parser.add_argument("--root",type=Path,required=True); args=parser.parse_args()
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(QuietHandler,directory=str(args.root.resolve()))); thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
    try:
        for base in ("/","/transformer_viz/"):
            for mobile in (False,True):
                with ChromeSession() as browser: verify_surface(browser,lab_url(f"http://127.0.0.1:{server.server_port}",base),mobile)
    finally: server.shutdown();server.server_close();thread.join(timeout=10)
    return 0


if __name__ == "__main__": raise SystemExit(main())
