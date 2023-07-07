interface SubmissionStat {
  shares: number
  partials: number
  proofTimeSumInSeconds: number|null
  date: string
}

export enum RejectedSubmissionType {
  stale = 'STALE',
  invalid = 'INVALID',
}

interface RejectedSubmissionStat extends SubmissionStat {
  type: RejectedSubmissionType
}

export interface HarvesterStats {
  submissionStats: SubmissionStat[]
  rejectedSubmissionStats: RejectedSubmissionStat[]
}
