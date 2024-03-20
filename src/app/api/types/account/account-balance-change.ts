import {HistoricalRate} from '../historical/historical-rate'

export enum AccountBalanceChangeType {
  blockRewardShare = 'blockRewardShare',
  blockWinnerReward = 'blockWinnerReward',
  poolFee = 'poolFee',
  payout = 'payout',
  payoutRollback = 'payoutRollback',
}

export interface BlockRewardMeta {
  block: number
}

export interface BlockRewardShareMeta extends BlockRewardMeta {
  percentage: string
}

export interface GenericAccountBalanceChange {
  type: AccountBalanceChangeType
  amount: string
  meta?: unknown
  createdAt: string
  historicalRate?: HistoricalRate
}

export interface BlockWinnerAccountBalanceChange extends GenericAccountBalanceChange {
  type: AccountBalanceChangeType.blockWinnerReward | AccountBalanceChangeType.poolFee
  meta: BlockRewardMeta
}

export interface BlockRewardShareAccountBalanceChange extends GenericAccountBalanceChange {
  type: AccountBalanceChangeType.blockRewardShare
  meta: BlockRewardShareMeta
}

export type AccountBalanceChange = BlockWinnerAccountBalanceChange | BlockRewardShareAccountBalanceChange | GenericAccountBalanceChange

export interface AccountBalanceChangeList {
  balanceChanges: AccountBalanceChange[]
  total: number
}
