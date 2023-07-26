import {BaseTopAccount, TopAccount} from './top-account'

export interface AccountList<TopAccountType extends BaseTopAccount = TopAccount> {
  accounts: TopAccountType[]
  total: number
}
