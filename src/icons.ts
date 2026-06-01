/**
 * SVG 아이콘 — design/ui.jsx 의 ICON_D 중 003 에서 쓰는 것만 포팅.
 * createElementNS 로 vanilla SVG 생성 (React 비종속).
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

const ICON_D = {
  doc: ['M4 1.75h5L13 5.5v8.75a.75.75 0 0 1-.75.75h-8.5a.75.75 0 0 1-.75-.75V2.5a.75.75 0 0 1 .75-.75Z', 'M9 1.75V5.5H13'],
  history: ['M8 4v4l2.5 1.5', 'M2.5 8a5.5 5.5 0 1 0 1.7-4M3 2.5V6h3.5'],
  plus: ['M8 3.5v9', 'M3.5 8h9'],
  x: ['M4 4l8 8', 'M12 4l-8 8'],
  check: ['M3 8.4l3.3 3.3L13 5'],
  copy: ['M5.75 5.75h7.5v7.5h-7.5z', 'M3.25 10.25h-.5v-7.5h7.5v.5'],
  chevronDown: ['M4 6l4 4 4-4'],
  comment: ['M2.5 3.5h11v7H7l-3 2.5V10.5H2.5z'],
  reply: ['M6 4L2.5 7.5 6 11', 'M2.5 7.5H10a3.5 3.5 0 0 1 3.5 3.5v1.5'],
  trash: ['M3 4.5h10', 'M6 4.5V3.2A.7.7 0 0 1 6.7 2.5h2.6a.7.7 0 0 1 .7.7V4.5', 'M4.5 4.5l.6 9a.8.8 0 0 0 .8.75h4.2a.8.8 0 0 0 .8-.75l.6-9'],
  handoff: ['M2.5 8h8', 'M8 5l3 3-3 3', 'M13.5 3.2v9.6'],
  arrowRight: ['M3 8h9', 'M9 5l3 3-3 3'],
} as const;

export type IconName = keyof typeof ICON_D;

/** name 아이콘을 size(px) 정사각 SVG 로 생성. */
export function createIcon(name: IconName, size = 16): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.4');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.flexShrink = '0';
  for (const d of ICON_D[name]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
