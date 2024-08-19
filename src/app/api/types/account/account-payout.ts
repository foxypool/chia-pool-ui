import {TransactionState} from '../transaction-state'
import {HistoricalRate} from '../historical/historical-rate'

export interface AccountPayout {
  coinId: string
  amount: string
  state: TransactionState
  historicalRate?: HistoricalRate
  createdAt: Date
}

export interface AccountPayouts {
  payouts: AccountPayout[]
  total: number
}
