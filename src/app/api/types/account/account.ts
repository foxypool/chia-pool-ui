export interface AccountNotificationSettings {
  areEcChangeNotificationsEnabled: boolean
  ecLastHourThreshold: number
  areBlockWonNotificationsEnabled: boolean
  arePayoutAddressChangeNotificationsEnabled: boolean
  areHarvesterOfflineNotificationsEnabled: boolean
  harvesterOfflineDurationInMinutes: number
}

export interface Account {
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

export interface NftAccount extends Account {
  singleton: {
    genesis: string
  }
  isPoolMember: boolean
}

export interface OgAccount extends Account {
  poolPublicKey: string
  collateral?: string
  isCheating?: boolean
  hasLeftThePool: boolean
}
