export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

const TIMING_LINE = /((?:\d+:)?\d{1,2}:\d{1,2}[.,]\d{1,3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{1,2}[.,]\d{1,3})/;
// Tags de posicionamento do ASS/SSA que alguns SRT trazem ({\an8})
const ASS_TAGS = /\{\\[^}]*\}/g;

// SRT costuma vir em Windows-1252; se o UTF-8 quebrar acentos, cai pro Latin1
export function decodeSubtitleText(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buffer) : utf8;
}

// Lê WebVTT ou SRT e devolve as falas em segundos
export function parseSubtitleCues(content: string): SubtitleCue[] {
  const blocks = content
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/);

  return blocks
    .map(toCue)
    .filter((cue): cue is SubtitleCue => cue !== null);
}

function toCue(block: string): SubtitleCue | null {
  const lines = block.split('\n');
  const timingIndex = lines.findIndex((line) => TIMING_LINE.test(line));
  if (timingIndex < 0) return null;

  const [, startLabel, endLabel] = lines[timingIndex].match(TIMING_LINE)!;
  const start = toSeconds(startLabel);
  const end = toSeconds(endLabel);
  const text = lines.slice(timingIndex + 1).join('\n').replace(ASS_TAGS, '').trim();

  if (!text || !(end > start)) return null;
  return { start, end, text };
}

function toSeconds(label: string): number {
  const parts = label.replace(',', '.').split(':').map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}
