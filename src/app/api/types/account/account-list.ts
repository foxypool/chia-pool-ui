import {TopAccount} from './top-account'

export interface AccountList<TopAccountType extends TopAccount> {
  accounts: TopAccountType[]
  total: number
}
