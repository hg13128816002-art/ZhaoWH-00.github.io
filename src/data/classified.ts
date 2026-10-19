/** ARG presentation seal. Original editorial text stays in source, never in rendered labels. */
export const CLASSIFIED_ALT = '封存影像：访问受限';
export const redact = (text: string): string => text.replace(/[^\s\p{P}]/gu, '█');
