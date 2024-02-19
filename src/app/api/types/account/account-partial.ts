export enum PartialState {
  valid = 'VALID',
  stale = 'STALE',
  invalid = 'INVALID',
}

export interface AccountPartial {
  shares: number
  harvester: string
  receivedAt: string
  proofTimeInSeconds: number
  type: PartialState
}

export interface AccountPartialList {
  partials: AccountPartial[]
  total: number
}
