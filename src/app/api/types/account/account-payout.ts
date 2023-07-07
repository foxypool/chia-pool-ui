import {TransactionState} from '../transaction-state'

export interface AccountPayout {
  coinId: string
  amount: string
  state: TransactionState
  createdAt: Date
}
