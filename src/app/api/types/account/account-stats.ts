import {TopAccount} from './top-account'

export interface AccountStats<TopAccountType extends TopAccount> {
  topAccounts: TopAccountType[]
  accountsWithShares: number
  ecSum: number
}
