"""Rendered layout metrics and assertions for the Golden Chapter deck."""

from __future__ import annotations

from browser_hybrid_contract import number, require
from browser_hybrid_helpers import JsonObject, evaluate_dict
from browser_session import ChromeSession
from golden_chapter_browser_probes import DECK_SELECTOR, VISUAL_SELECTOR


def probe(browser: ChromeSession) -> JsonObject:
    return evaluate_dict(browser, f"""(() => {{
      const deck = document.querySelector('{DECK_SELECTOR}');
      const stage = deck?.querySelector(':scope > .visual-narrative__stage');
      const beat = stage?.querySelector('.visual-narrative__beat');
      const visualWrap = stage?.querySelector(
        ':scope > .visual-narrative__visual'
      );
      const visual = document.querySelector('{VISUAL_SELECTOR}');
      const numericStrip = document.querySelector(
        '[data-testid="nlp-golden-numeric-strip"]'
      );
      const numericSlots = [...(numericStrip?.querySelectorAll(
        ':scope > [data-nlp-value]'
      ) ?? [])];
      const result = document.querySelector(
        '[data-testid="nlp-golden-result"]'
      );
      const resultConnector = result?.querySelector(
        '[data-nlp-result-connector]'
      );
      const rightContent = [
        document.querySelector('.nlp-golden__sentence'),
        document.querySelector('.nlp-golden__numeric'),
        document.querySelector('.nlp-golden__result'),
      ].filter(element => {{
        const elementStyle = element ? getComputedStyle(element) : null;
        const elementBox = element?.getBoundingClientRect();
        return elementStyle !== null
          && elementBox !== undefined
          && elementStyle.visibility !== 'hidden'
          && Number.parseFloat(elementStyle.opacity) > 0.05
          && elementBox.height > 0;
      }});
      const boundaryPhrases = [...document.querySelectorAll(
        '[data-nlp-boundary-step]'
      )];
      const tokenNote = document.querySelector('.nlp-golden__token-note');
      const pageNavigation = document.querySelector(
        '.curriculum-workspace__adjacent-navigation'
      );
      const workspaceContent = document.querySelector(
        '.curriculum-workspace__content'
      );
      const controls = deck?.querySelector(
        ':scope > .visual-narrative__steps'
      );
      const takeaway = document.querySelector('[data-testid="key-takeaway"]');
      const figure = deck?.querySelector('[data-figure-id]');
      const content = document.querySelector(
        '.learning-guide-introduction > p'
      );
      const guide = document.querySelector('.learning-guide');
      const rect = element => element?.getBoundingClientRect();
      const box = element => {{ const r = rect(element); return {{
        left: r?.left ?? -1, top: r?.top ?? -1, right: r?.right ?? -1,
        bottom: r?.bottom ?? -1, width: r?.width ?? -1, height: r?.height ?? -1,
      }}; }};
      const previous = deck?.querySelector('[data-deck-action="previous"]');
      const next = deck?.querySelector('[data-deck-action="next"]');
      const stageBox = box(stage), beatBox = box(beat);
      const wrapBox = box(visualWrap), visualBox = box(visual);
      const controlBox = box(controls), contentBox = box(content);
      const guideBox = box(guide), stripBox = box(numericStrip);
      const connectorBox = box(resultConnector);
      const tokenNoteBox = box(tokenNote);
      const takeawayBox = box(takeaway);
      const style = element => element ? getComputedStyle(element) : null;
      const shellHeaderBottom = Math.max(
        0,
        ...[...document.querySelectorAll('header')]
          .filter(element => ['fixed', 'sticky'].includes(
            style(element)?.position ?? ''
          ))
          .map(element => box(element).bottom),
      );
      const observer = window.__narrativeObserverMetrics;
      return {{
        width: innerWidth, height: innerHeight,
        stageName: deck?.getAttribute('data-narrative-stage') ?? '',
        visualStage: visual?.getAttribute('data-nlp-stage') ?? '',
        slideIndex: Number(deck?.getAttribute('data-narrative-slide-index')),
        deckCount: document.querySelectorAll('{DECK_SELECTOR}').length,
        beatCount: deck?.querySelectorAll('.visual-narrative__beat').length ?? -1,
        activeBeatCount: deck?.querySelectorAll(
          '[data-narrative-active="true"]'
        ).length ?? -1,
        stageWidth: stageBox.width, stageHeight: stageBox.height,
        stageTop: stageBox.top,
        contentStart: contentBox.left, wideEnd: guideBox.right,
        leftStart: beatBox.left, leftEnd: beatBox.right,
        leftTop: beatBox.top,
        leftTopOffset: beatBox.top - stageBox.top,
        beatBottom: beatBox.bottom,
        rightStart: wrapBox.left, rightEnd: stageBox.right,
        rightContentTop: Math.min(
          ...rightContent.map(element => box(element).top),
        ),
        rightTopOffset: Math.min(
          ...rightContent.map(element => box(element).top),
        ) - stageBox.top,
        leftRightTopDelta: Math.abs(
          beatBox.top - Math.min(
            ...rightContent.map(element => box(element).top),
          ),
        ),
        visualLeft: visualBox.left, visualTop: visualBox.top,
        visualWidth: visualBox.width, visualHeight: visualBox.height,
        mobileStackGap: visualBox.top - beatBox.bottom,
        visualCenterX: visualBox.left + visualBox.width / 2,
        visualCenterY: visualBox.top + visualBox.height / 2,
        controlLeft: controlBox.left, controlTop: controlBox.top,
        controlWidth: controlBox.width, controlHeight: controlBox.height, controlRight: controlBox.right, takeawayLeft: takeawayBox.left,
        takeawayRight: takeawayBox.right, takeawayWidth: takeawayBox.width,
        previousWidth: box(previous).width, previousHeight: box(previous).height,
        nextWidth: box(next).width, nextHeight: box(next).height,
        documentOverflow: Math.max(
          0,
          document.documentElement.scrollWidth
            - document.documentElement.clientWidth,
        ),
        localOverflow: deck instanceof HTMLElement
          ? Math.max(0, deck.scrollWidth - deck.clientWidth) : -1,
        canvasCount: figure?.querySelectorAll('canvas').length ?? -1,
        r3fCount: figure?.querySelectorAll(
          '[data-threeui-renderer="r3f"]'
        ).length ?? -1,
        replayCount: [...(deck?.querySelectorAll('button') ?? [])]
          .filter(button => button.textContent?.includes('처음부터')).length,
        figureBorder: style(figure)?.borderTopWidth ?? '',
        deckBorder: style(deck)?.borderTopWidth ?? '',
        visualPosition: style(visualWrap)?.position ?? '',
        copyAlignItems: style(stage?.querySelector(
          ':scope > .visual-narrative__copy'
        ))?.alignItems ?? '',
        visualAlignItems: style(visualWrap)?.alignItems ?? '',
        stageMinHeight: style(stage)?.minBlockSize ?? '',
        pendingRaf: window.__goldenRafPending ?? -1,
        observerActive: observer?.active ?? -1,
        observerCreated: observer?.created ?? -1,
        copyHeaderOverlap: Math.max(0, shellHeaderBottom - beatBox.top),
        numericStripWidth: stripBox.width,
        numericStripHeight: stripBox.height,
        visibleNumericSlots: numericSlots.filter(
          slot => box(slot).width > 0 && style(slot)?.display !== 'none'
        ).length,
        numericFontSize: Number.parseFloat(
          style(numericStrip)?.fontSize ?? '0'
        ),
        resultOverlap: Math.max(0, stripBox.bottom - connectorBox.top),
        resultValueCount: result?.querySelectorAll(
          '[data-nlp-result-value]'
        ).length ?? -1,
        resultTaskCount: result?.querySelectorAll(
          '[data-nlp-result-task]'
        ).length ?? -1,
        otherTaskCount: result?.querySelectorAll(
          '[data-nlp-other-task]'
        ).length ?? -1,
        visibleBoundaries: boundaryPhrases.filter(
          phrase => Number.parseFloat(
            getComputedStyle(phrase, '::after').opacity
          ) > 0.99
        ).length,
        boundaryDelays: boundaryPhrases.map(
          phrase => getComputedStyle(phrase, '::after').transitionDelay
        ).join('|'),
        tokenNoteRight: tokenNoteBox.right, tokenNoteBottom: tokenNoteBox.bottom,
        pageNavigationCount: document.querySelectorAll(
          '.curriculum-workspace__adjacent-navigation'
        ).length,
        pageNavigationLast:
          workspaceContent?.lastElementChild === pageNavigation,
        stageHandoffCount:
          document.querySelectorAll('.nlp-golden__handoff').length,
      }};
    }})()""")


def assert_probe(data: JsonObject, stage: str, index: int) -> None:
    require(
        data["stageName"] == stage and data["visualStage"] == stage,
        f"Golden stage root: {data}",
    )
    require(data["slideIndex"] == index + 1, f"Golden slide index: {data}")
    require(
        data["deckCount"] == 1 and data["beatCount"] == 1,
        f"Golden mounted deck: {data}",
    )
    require(data["activeBeatCount"] == 1, f"Golden active beat: {data}")
    require(
        data["pageNavigationCount"] == 1
        and data["pageNavigationLast"] is True
        and data["stageHandoffCount"] == 0,
        f"Golden persistent page navigation: {data}",
    )
    for key in (
        "documentOverflow",
        "localOverflow",
        "canvasCount",
        "r3fCount",
        "replayCount",
    ):
        require(data[key] == 0, f"Golden {key}: {data}")
    require(
        data["figureBorder"] == "0px" and data["deckBorder"] == "0px",
        f"Golden card border: {data}",
    )
    require(data["pendingRaf"] == 0, f"Golden idle RAF: {data}")
    require(
        data["observerActive"] == 0 and data["observerCreated"] == 0,
        f"Golden scroll observer: {data}",
    )
    for key in ("previousWidth", "previousHeight", "nextWidth", "nextHeight"):
        require(number(data[key], key) >= 44, f"Golden control target: {data}")
    divider_aligned = all(
        abs(number(data[f"control{key}"], key) - number(data[f"takeaway{key}"], key)) <= 1
        for key in ("Left", "Right", "Width")
    )
    require(divider_aligned, f"Golden divider span: {data}")
    width = number(data["width"], "viewport width")
    if width > 768:
        require(
            400 <= number(data["stageHeight"], "stage height") <= 450,
            f"Golden desktop height: {data}",
        )
        require(
            24 <= number(data["leftTopOffset"], "Golden LEFT top") <= 48
            and 24 <= number(data["rightTopOffset"], "Golden RIGHT top") <= 48
            and number(data["leftRightTopDelta"], "Golden top delta") <= 24,
            f"Golden top alignment: {data}",
        )
        require(
            data["copyAlignItems"] == "flex-start"
            and data["visualAlignItems"] == "flex-start",
            f"Golden top alignment styles: {data}",
        )
    else:
        require(
            data["stageMinHeight"] == "386px"
            and 385 <= number(data["stageHeight"], "mobile stage height") <= 387,
            f"Golden mobile stage contract: {data}",
        )
        require(
            number(data["beatBottom"], "copy bottom")
            <= number(data["visualTop"], "visual top"),
            f"Golden mobile order: {data}",
        )
        require(
            number(data["copyHeaderOverlap"], "Golden copy/header overlap") <= 1,
            f"Golden mobile header clearance: {data}",
        )
        require(
            0 <= number(data["mobileStackGap"], "mobile stack gap") <= 32,
            f"Golden mobile stack rhythm: {data}",
        )
        require(
            data["visibleNumericSlots"] == 6,
            f"Golden mobile numeric slots: {data}",
        )
        require(number(data["controlHeight"], "controlHeight") <= 45 and number(data["controlTop"], "controlTop") + number(data["controlHeight"], "controlHeight") <= number(data["height"], "height") + 1, f"Golden mobile controls visible: {data}")
        minimum_font = 12 if width == 390 else 11
        require(
            number(data["numericFontSize"], "Golden numeric font")
            >= minimum_font,
            f"Golden mobile numeric font: {data}",
        )
    if stage in ("numeric", "transform", "result"):
        expected_height = 70 if width > 768 else 54
        require(
            abs(
                number(data["numericStripHeight"], "Golden strip height")
                - expected_height
            )
            <= 2,
            f"Golden strip scale: {data}",
        )
    if stage == "result":
        require(
            number(data["resultOverlap"], "Golden result overlap") <= 1,
            f"Golden result overlap: {data}",
        )
        require(
            data["resultValueCount"] == 1
            and data["resultTaskCount"] == 1
            and data["otherTaskCount"] == 3,
            f"Golden result hierarchy: {data}",
        )
    if stage == "token-preview":
        require(
            data["visibleBoundaries"] == 4,
            f"Golden token boundaries: {data}",
        )
        require(
            data["boundaryDelays"] == "0s|0.16s|0.32s|0.48s",
            f"Golden boundary order: {data}",
        )
        token_right_aligned = (
            abs(
                number(data["tokenNoteRight"], "tokenNoteRight")
                - number(data["rightEnd"], "rightEnd")
            )
            <= 1
        )
        require(token_right_aligned, f"Golden Token right alignment: {data}")
    require(data["visualPosition"] != "sticky", f"Golden sticky visual: {data}")
