export interface HistoricalSubmissionStat {
  shares: number
  staleShares: number
  invalidShares: number
  partials: number
  proofTimeInSeconds: number|null
  receivedAt: string
}

export type HarvesterStats = HistoricalSubmissionStat[]
