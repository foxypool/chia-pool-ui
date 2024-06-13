export function getPlotFilterShareMultiplier(height?: number): number {
  if (height === undefined) {
    return 2 // TODO: Adjust after next plot filter halving
  }

  if (height < 5_496_000) {
    return 1
  }

  if (height < 10_542_000) {
    return 2
  }

  if (height < 15_592_000) {
    return 4
  }

  if (height < 20_643_000) {
    return 8
  }

  return 16
}
