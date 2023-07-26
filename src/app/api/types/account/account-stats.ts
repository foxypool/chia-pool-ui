import {BaseTopAccount} from './top-account'

export interface AccountStats<TopAccountType extends BaseTopAccount> {
  topAccounts: TopAccountType[]
  accountsWithShares: number
  ecSum: number
}
