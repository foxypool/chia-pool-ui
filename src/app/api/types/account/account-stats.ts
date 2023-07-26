import {BaseTopAccount, TopAccount} from './top-account'

export interface AccountStats<TopAccountType extends BaseTopAccount = TopAccount> {
  topAccounts: TopAccountType[]
  accountsWithShares: number
  ecSum: number
}
