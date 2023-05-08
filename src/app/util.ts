import BigNumber from 'bignumber.js'

export function ensureHexPrefix(string: string) {
  return string.startsWith('0x') ? string : `0x${string}`
}

export function stripHexPrefix(string: string) {
  return string.startsWith('0x') ? string.slice(2) : string
}

export function getEffortColor(effort: BigNumber | null | undefined): string {
  if (effort === null || effort === undefined) {
    return ''
  }
  if (effort.isLessThan(0.25)) {
    return 'color-dark-green'
  }
  if (effort.isLessThan(0.5)) {
    return 'color-green'
  }
  if (effort.isLessThan(0.75)) {
    return 'color-light-green'
  }
  if (effort.isLessThan(1)) {
    return 'color-lighter-green'
  }
  if (effort.isLessThan(1.5)) {
    return ''
  }
  if (effort.isLessThan(2.5)) {
    return 'color-grey'
  }
  if (effort.isLessThan(4)) {
    return 'color-dark-orange'
  }

  return 'color-red'
}

export function getEffortColorForChart(effort: number | null | undefined): string {
  if (effort === null || effort === undefined) {
    return '#bbb'
  }
  if (effort < 0.25) {
    return '#53b332'
  }
  if (effort < 0.5) {
    return '#46cf76'
  }
  if (effort < 0.75) {
    return '#4bd28f'
  }
  if (effort < 1) {
    return '#87d3b5'
  }
  if (effort < 1.5) {
    return '#cfd0d1'
  }
  if (effort < 2.5) {
    return '#8c8c8c'
  }
  if (effort < 4) {
    return '#cc9321'
  }

  return '#ff4d4d'
}
