import {BaseAccount} from './account'

export interface BaseTopAccount extends Omit<BaseAccount,
  'lastAcceptedPartialAt'
  | 'shares'
  | 'difficulty'
  | 'minimumPayout'
  | 'payoutMultiplesOf'
  | 'isFixedDifficulty'
  | 'ecLastHour'
  | 'notificationSettings'
> {}

export interface NftTopAccount extends BaseTopAccount {
  singleton: {
    genesis: string
  }
}

export interface BaseOgTopAccount extends BaseTopAccount {
  poolPublicKey: string
  collateral?: string
}

export interface CheatingOgTopAccount extends BaseOgTopAccount {
  isCheating: true
}

export interface InactiveOgTopAccount extends BaseOgTopAccount {
  hasLeftThePool: true
}

export type OgTopAccount = BaseOgTopAccount | CheatingOgTopAccount | InactiveOgTopAccount

export type TopAccount = OgTopAccount | NftTopAccount

export function isOgTopAccount(account: TopAccount): account is OgTopAccount {
  return 'poolPublicKey' in account
}

export function isCheatingOgTopAccount(account: TopAccount): account is CheatingOgTopAccount {
  return isOgTopAccount(account) && 'isCheating' in account
}

export function isInactiveOgTopAccount(account: TopAccount): account is InactiveOgTopAccount {
  return isOgTopAccount(account) && 'hasLeftThePool' in account
}

export function isNftTopAccount(account: TopAccount): account is NftTopAccount {
  return 'singleton' in account
}

export function getAccountIdentifier(account: TopAccount): string {
  if (isOgTopAccount(account)) {
    return account.poolPublicKey
  }

  return account.singleton.genesis
}
