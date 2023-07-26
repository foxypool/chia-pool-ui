export interface AccountNotificationSettings {
  areEcChangeNotificationsEnabled: boolean
  ecLastHourThreshold: number
  areBlockWonNotificationsEnabled: boolean
  arePayoutAddressChangeNotificationsEnabled: boolean
  areHarvesterOfflineNotificationsEnabled: boolean
  harvesterOfflineDurationInMinutes: number
}

export interface BaseAccount {
  pending: string
  ec: number
  ecLastHour: number
  shares: number
  difficulty: number
  isFixedDifficulty: boolean
  payoutAddress: string
  distributionRatio: string
  createdAt: string
  notificationSettings: AccountNotificationSettings
  name?: string
  rank?: number
  rejoinedAt?: string
  minimumPayout?: string
  payoutMultiplesOf?: string
  lastAcceptedPartialAt?: string
}

export interface OgBaseAccount extends BaseAccount {
  poolPublicKey: string
  collateral?: string
}

export interface CheatingOgAccount extends OgBaseAccount {
  isCheating: true
}

export interface InactiveOgAccount extends OgBaseAccount {
  hasLeftThePool: true
}

export type OgAccount = OgBaseAccount | CheatingOgAccount | InactiveOgAccount

export interface NftAccount extends BaseAccount {
  singleton: {
    genesis: string
  }
  isPoolMember: boolean
}

export type Account = OgAccount | NftAccount

export function isOgAccount(account: Account): account is OgAccount {
  return 'poolPublicKey' in account
}

export function isCheatingOgAccount(account: Account): account is CheatingOgAccount {
  return isOgAccount(account) && 'isCheating' in account
}

export function isInactiveOgAccount(account: Account): account is InactiveOgAccount {
  return isOgAccount(account) && 'hasLeftThePool' in account
}

export function isNftAccount(account: Account): account is NftAccount {
  return 'singleton' in account
}

export function getAccountIdentifier(account: Account): string {
  if (isOgAccount(account)) {
    return account.poolPublicKey
  }

  return account.singleton.genesis
}
