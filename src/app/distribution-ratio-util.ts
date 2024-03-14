export function isValidDistributionRatio(distributionRatio: string): boolean {
  const parts = getDistributionRatioPartsFromString(distributionRatio)
  if (parts.length !== 2 || parts.some(part => !isDistributionRatioPartValid(part))) {
    return false
  }
  const sum = parts.reduce((acc, curr) => acc + curr, 0)

  return sum === 100
}

export function isDistributionRatioPartValid(ratioPart: number): boolean {
  return ratioPart !== null && ratioPart >= 0 && ratioPart <= 100
}

export function getDistributionRatioPartsFromString(distributionRatio: string): number[] {
  return distributionRatio.split('-').map(part => parseInt(part, 10))
}
