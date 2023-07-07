import {Account} from './account'

export interface TopAccount extends Omit<Account,
  'lastAcceptedPartialAt'
  | 'shares'
  | 'difficulty'
  | 'minimumPayout'
  | 'payoutMultiplesOf'
  | 'isFixedDifficulty'
  | 'ecLastHour'
  | 'notificationSettings'
> {}

export interface NftTopAccount extends TopAccount {
  singleton: {
    genesis: string
  }
}

export interface OgTopAccount extends TopAccount {
  poolPublicKey: string
  collateral?: string
  isCheating?: boolean
  hasLeftThePool: boolean
}
