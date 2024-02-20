import {TransactionState} from '../transaction-state'
import {HistoricalRate} from '../historical/historical-rate'

export enum PayoutState {
  inMempool = 'IN_MEMPOOL',
  partiallyConfirmed = 'PARTIALLY_CONFIRMED',
  confirmed = 'CONFIRMED',
}

export interface PayoutTransaction {
  state: TransactionState
  confirmedAtHeight: number
  coinIds: string[]
  payoutAmounts: Record<string, string>
}

export interface Payout {
  _id: string
  state: PayoutState
  transactions: PayoutTransaction[]
  historicalRate?: HistoricalRate
  createdAt: string
}
