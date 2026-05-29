import { parseBlocks, type Block } from './parse';
import { buildExport } from './export';
import { renderBlocks } from './render';
import { NoteStore } from './notes';

const input = document.querySelector<HTMLTextAreaElement>('#input')!;
const convertBtn = document.querySelector<HTMLButtonElement>('#convert')!;
const copyBtn = document.querySelector<HTMLButtonElement>('#copy')!;
const output = document.querySelector<HTMLElement>('#output')!;
const status = document.querySelector<HTMLElement>('#status')!;

const store = new NoteStore();
let blocks: Block[] = [];
let currentSrc = '';

// 변환: parse → render. 빈 입력은 안내 후 거부 (FR-011). 재변환 시 기존 의견 초기화 (Edge).
convertBtn.addEventListener('click', () => {
  const src = input.value;
  const parsed = parseBlocks(src);

  if (parsed.length === 0) {
    output.innerHTML = '';
    blocks = [];
    currentSrc = '';
    copyBtn.disabled = true;
    status.textContent = '변환할 markdown 을 입력하세요.';
    return;
  }

  store.clear();
  blocks = parsed;
  currentSrc = src;
  renderBlocks(blocks, store, output);
  copyBtn.disabled = false;
  status.textContent = `${blocks.length}개 단락 렌더됨 — 단락별로 의견·반박을 달 수 있습니다.`;
});

// 복사: 원본 + 단락별 의견을 클립보드로 (FR-007).
copyBtn.addEventListener('click', async () => {
  const text = buildExport(currentSrc, blocks, store.toMap());
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = '클립보드에 복사됨 (원본 + 단락별 의견).';
  } catch {
    status.textContent = '복사 실패 — 브라우저 클립보드 권한을 확인하세요.';
  }
});
