export type HistoricalStatsDuration = '1d' | '7d' | '30d'
export function durationInDays(duration: HistoricalStatsDuration): number {
  switch (duration) {
    case '1d': return 1
    case '7d': return 7
    case '30d': return 30
  }
}
export function durationInHours(duration: HistoricalStatsDuration): number {
  return durationInDays(duration) * 24
}
export function getResolutionInMinutes(duration: HistoricalStatsDuration): number {
  switch (duration) {
    case '1d': return 15
    case '7d': return 60
    case '30d': return 60 * 4
  }
}
