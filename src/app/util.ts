import BigNumber from 'bignumber.js';

export function ensureHexPrefix(string: String) {
  return string.startsWith('0x') ? string : `0x${string}`;
}

export function getEffortColor(effort: BigNumber | null | undefined): string {
  if (effort === null || effort === undefined) {
    return '';
  }
  if (effort.isLessThan(0.25)) {
    return 'color-dark-green';
  }
  if (effort.isLessThan(0.5)) {
    return 'color-green';
  }
  if (effort.isLessThan(0.75)) {
    return 'color-light-green';
  }
  if (effort.isLessThan(1)) {
    return 'color-lighter-green';
  }
  if (effort.isLessThan(1.5)) {
    return '';
  }
  if (effort.isLessThan(2.5)) {
    return 'color-grey';
  }
  if (effort.isLessThan(4)) {
    return 'color-dark-orange';
  }

  return 'color-red';
}
