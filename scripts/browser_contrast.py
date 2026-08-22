"""Computed non-text control-boundary contrast assertions."""

from __future__ import annotations

from browser_cdp import Cdp


def contrast_contract(cdp: Cdp, session: str) -> list[str]:
    probe = r"""(() => {
      document.getAnimations().forEach(animation => animation.finish());
      const parse = value => {
        if (value.startsWith('#')) {
          const hex = value.slice(1);
          return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
        }
        return (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      };
      const luminance = value => {
        const channels = parse(value).map(channel => channel / 255).map(channel =>
          channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
        return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
      };
      const ratio = (left, right) => {
        const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
        return (values[0] + .05) / (values[1] + .05);
      };
      const background = element => {
        for (let node = element; node; node = node.parentElement) {
          const color = getComputedStyle(node).backgroundColor;
          if (color && color !== 'rgba(0, 0, 0, 0)') return color;
        }
        return 'rgb(243, 240, 232)';
      };
      const root = getComputedStyle(document.documentElement);
      const boundaryToken = root.getPropertyValue('--control-boundary').trim();
      const surfaces = ['--canvas', '--surface', '--surface-strong'].map(name =>
        root.getPropertyValue(name).trim());
      const tokenRatios = surfaces.map(surface => ratio(boundaryToken, surface));
      const candidates = [...document.querySelectorAll(
        'input:not(:disabled),select:not(:disabled),textarea:not(:disabled),'
        + 'button:not(:disabled):not(.primary):not(.play-toggle):not([aria-current]):not([aria-pressed="true"]):not([data-progress]),'
        + '.mode-tabs,.curriculum-group:not([data-current="true"])')];
      const wrongTokens = candidates.filter(element => {
        if (element.getBoundingClientRect().width === 0 || element.matches(':hover')) return false;
        const style = getComputedStyle(element);
        if (parseFloat(style.borderTopWidth) === 0 || style.borderTopColor === 'rgba(0, 0, 0, 0)') return false;
        return style.borderTopColor !== 'rgb(129, 120, 106)';
      }).map(element => ({tag: element.tagName, id: element.id, classes: element.className,
        border: getComputedStyle(element).borderTopColor, html: element.outerHTML.slice(0, 240)}));
      const dynamicFailures = [...document.querySelectorAll('.generated-token,button.context-token')]
        .filter(element => element.getBoundingClientRect().width > 0)
        .flatMap(element => {
          const boundary = getComputedStyle(element).borderTopColor;
          const adjacent = [background(element), background(element.parentElement)];
          const minimum = Math.min(...adjacent.map(surface => ratio(boundary, surface)));
          return minimum + .001 < 3 ? [{classes: element.className, boundary, adjacent, minimum}] : [];
        });
      return {tokenRatios, wrongTokens, dynamicFailures};
    })()"""
    result = cdp.evaluate(session, probe)
    failures: list[str] = []
    if min(result["tokenRatios"]) < 3:
        failures.append(f"control boundary token is below 3:1: {result}")
    if result["wrongTokens"]:
        failures.append(f"unfocused control does not use boundary token: {result}")
    if result["dynamicFailures"]:
        failures.append(f"dynamic token boundary contrast below 3:1: {result}")
    return failures
