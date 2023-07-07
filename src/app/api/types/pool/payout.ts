import {TransactionState} from '../transaction-state'

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
  state: PayoutState
  transactions: PayoutTransaction[]
  createdAt: string
}
