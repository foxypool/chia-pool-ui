import BigNumber from 'bignumber.js';

export function ensureHexPrefix(string: String) {
  return string.startsWith('0x') ? string : `0x${string}`;
}

export function getEffortColor(effort: BigNumber | null | undefined): string {
  if (effort === null || effort === undefined) {
    return '';
  }
  if (effort.isLessThan(1)) {
    return 'color-green';
  }
  if (effort.isLessThan(1.5)) {
    return '';
  }

  return 'color-grey';
}
