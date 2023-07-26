import {BaseTopAccount} from './top-account'

export interface AccountList<TopAccountType extends BaseTopAccount> {
  accounts: TopAccountType[]
  total: number
}
