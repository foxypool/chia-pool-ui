import axios, {AxiosInstance} from 'axios'
import {PoolConfig} from './types/pool/pool-config'
import {PoolStats} from './types/pool/pool-stats'
import {PoolHistoricalStat} from './types/pool/pool-historical-stat'
import {AccountStats} from './types/account/account-stats'
import {RecentlyWonBlock, RewardStats} from './types/pool/reward-stats'
import {Payout} from './types/pool/payout'
import {RateStats} from './types/pool/rate-stats'
import {AccountList} from './types/account/account-list'
import {Account, AccountNotificationSettings, AccountSettings} from './types/account/account'
import {Harvester, HarvesterNotificationSettings} from './types/harvester/harvester'
import {HarvesterStats} from './types/harvester/harvester-stats'
import {ProofTime} from './types/harvester/proof-time'
import {ClientVersion} from './types/pool/client-version'
import {AccountHistoricalStat} from './types/account/account-historical-stat'
import {AccountWonBlock} from './types/account/account-won-block'
import {AccountPayout} from './types/account/account-payout'
import {AuthenticationResult} from './types/auth/authentication-result'
import {LoginTokenResult} from './types/auth/login-token-result'
import {BaseTopAccount} from './types/account/top-account'
import {ApiResponse} from './types/api-response'
import {HistoricalStatsDuration} from './types/historical-stats-duration'
import {AccountPartialList} from './types/account/account-partial'
import {AccountBalanceChangeList} from './types/account/account-balance-change'

export abstract class AbstractApi<
  AccountType extends Account,
  TopAccountType extends BaseTopAccount,
  RecentlyWonBlockType extends RecentlyWonBlock,
> {
  protected readonly client: AxiosInstance

  public constructor(poolIdentifier: string) {
    this.client = axios.create({ baseURL: `https://api.foxypool.io/api/v3/${poolIdentifier}` })
  }

  public async getPoolConfig(): Promise<PoolConfig> {
    const { data } = await this.client.get<PoolConfig>('config')

    return data
  }

  public async getPoolStats(): Promise<PoolStats> {
    const { data } = await this.client.get<PoolStats>('pool')

    return data
  }

  public async getPoolHistoricalStats(): Promise<PoolHistoricalStat[]> {
    const { data } = await this.client.get<PoolHistoricalStat[]>('pool/historical')

    return data
  }

  public async getAccountsStats(): Promise<AccountStats<TopAccountType>> {
    const { data } = await this.client.get<AccountStats<TopAccountType>>('accounts')

    return data
  }

  public async getRewardStats(): Promise<RewardStats<RecentlyWonBlockType>> {
    const { data } = await this.client.get<RewardStats<RecentlyWonBlockType>>('rewards')

    return data
  }

  public async getRecentPayouts(): Promise<Payout[]> {
    const { data } = await this.client.get<Payout[]>('payouts')

    return data
  }

  public async getRateStats(): Promise<RateStats> {
    const { data } = await this.client.get<RateStats>('rates')

    return data
  }

  public async getAccountList({ page, limit }: { page: number, limit: number }): Promise<AccountList<TopAccountType>> {
    const { data } = await this.client.get<AccountList<TopAccountType>>('accounts/list', { params: { page, limit } })

    return data
  }

  public async getAccount({ accountIdentifier, bustCache = false }: { accountIdentifier: string, bustCache?: boolean }): Promise<AccountType> {
    const params: any = {}
    if (bustCache) {
      params.cacheBuster = Math.random()
    }
    const { data } = await this.client.get<AccountType>(`account/${accountIdentifier}`, { params })

    return data
  }

  public async getAccountHarvesters({ accountIdentifier, bustCache }: { accountIdentifier: string, bustCache?: boolean }): Promise<Harvester[]> {
    const params: any = {}
    if (bustCache) {
      params.cacheBuster = Math.random()
    }

    const { data } = await this.client.get<Harvester[]>(`account/${accountIdentifier}/harvesters`, { params })

    return data
  }

  public async getAccountPartials({ accountIdentifier, page, limit }: { accountIdentifier: string, page: number, limit: number }): Promise<AccountPartialList> {
    const { data } = await this.client.get<AccountPartialList>(`account/${accountIdentifier}/partials`, { params: { page, limit } })

    return data
  }

  public async getAccountBalanceChanges({ accountIdentifier, page, limit }: { accountIdentifier: string, page: number, limit: number }): Promise<AccountBalanceChangeList> {
    const { data } = await this.client.get<AccountBalanceChangeList>(`account/${accountIdentifier}/balance-changes`, { params: { page, limit } })

    return data
  }

  public async getHarvesterStats({ harvesterId, duration }: { harvesterId: string, duration: HistoricalStatsDuration }): Promise<HarvesterStats> {
    const { data } = await this.client.get<HarvesterStats>(`harvester/${harvesterId}/stats`, { params: { duration } })

    return data
  }

  public async getHarvesterProofTimes({ harvesterId, duration }: { harvesterId: string, duration: HistoricalStatsDuration }): Promise<ProofTime[]> {
    const { data } = await this.client.get<ProofTime[]>(`harvester/${harvesterId}/proof-times`, { params: { duration } })

    return data
  }

  public async getClientVersions(): Promise<ClientVersion[]> {
    const { data } = await this.client.get<ClientVersion[]>('client/versions')

    return data
  }

  public async getAccountHistoricalStats({ accountIdentifier, duration }: { accountIdentifier: string, duration: HistoricalStatsDuration }): Promise<AccountHistoricalStat[]> {
    const { data } = await this.client.get<AccountHistoricalStat[]>(`account/${accountIdentifier}/historical`, { params: { duration }})

    return data
  }

  public async getAccountWonBlocks(accountIdentifier: string): Promise<AccountWonBlock[]> {
    const { data } = await this.client.get<AccountWonBlock[]>(`account/${accountIdentifier}/won-blocks`)

    return data
  }

  public async getAccountPayouts(accountIdentifier: string): Promise<AccountPayout[]> {
    const { data } = await this.client.get<AccountPayout[]>(`account/${accountIdentifier}/payouts`)

    return data
  }

  public async authenticateAccount({ accountIdentifier, message, signature }: { accountIdentifier: string, message: string, signature: string }): Promise<ApiResponse<AuthenticationResult>> {
    const { data } = await this.client.post<ApiResponse<AuthenticationResult>>(`account/${accountIdentifier}/authenticate`, {
      message,
      signature,
    })

    return data
  }

  public async authenticateAccountWithToken({ accountIdentifier, token }: { accountIdentifier: string, token: string }): Promise<ApiResponse<AuthenticationResult>> {
    const { data } = await this.client.post<ApiResponse<AuthenticationResult>>(`account/${accountIdentifier}/authenticate-with-token`, {
      token,
    })

    return data
  }

  public async generateLoginToken({ accountIdentifier, authToken }: AuthenticatedAccountRequestOptions): Promise<ApiResponse<LoginTokenResult>> {
    const { data } = await this.client.post<ApiResponse<LoginTokenResult>>(`account/${accountIdentifier}/login-token/generate`, undefined, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updateAccountName({ accountIdentifier, authToken, newName }: UpdateAccountNameOptions): Promise<ApiResponse<void>> {
    const { data } = await this.client.post<ApiResponse<void>>(`account/${accountIdentifier}/name`, {
      newName,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updateAccountDistributionRatio({ accountIdentifier, authToken, newDistributionRatio }: UpdateAccountDistributionRatioOptions): Promise<ApiResponse<void>> {
    const { data } = await this.client.post<ApiResponse<void>>(`account/${accountIdentifier}/distribution-ratio`, {
      newDistributionRatio,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updateHarvesterName({ accountIdentifier, authToken, harvesterPeerId, newName }: UpdateHarvesterNameOptions): Promise<ApiResponse<void>> {
    const { data } = await this.client.put<ApiResponse<void>>(`account/${accountIdentifier}/harvester/${harvesterPeerId}/name`, {
      newName,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updateHarvesterNotificationSettings({ accountIdentifier, authToken, harvesterPeerId, notificationSettings }: UpdateHarvesterNotificationSettingsOptions): Promise<ApiResponse<void>> {
    const { data } = await this.client.put<ApiResponse<void>>(`account/${accountIdentifier}/harvester/${harvesterPeerId}/notification-settings`, notificationSettings, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async deleteHarvester({ accountIdentifier, authToken, harvesterPeerId }: UpdateHarvesterOptions): Promise<ApiResponse<void>> {
    const { data } = await this.client.delete<ApiResponse<void>>(`account/${accountIdentifier}/harvester/${harvesterPeerId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updatePayoutOptions({ accountIdentifier, authToken, minimumPayout, payoutMultiplesOf }: UpdateAccountPayoutOptions): Promise<ApiResponse<void>> {
    const { data } = await this.client.put<ApiResponse<void>>(`account/${accountIdentifier}/payout-options`, {
      minimumPayout,
      payoutMultiplesOf,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }
  public async updateIntegrations({ accountIdentifier, authToken, chiaDashboardShareKey }: UpdateAccountIntegrations): Promise<ApiResponse<void>> {
    const { data } = await this.client.put<ApiResponse<void>>(`account/${accountIdentifier}/integrations`, {
      chiaDashboardShareKey,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updateAccountDifficulty({ accountIdentifier, authToken, difficulty, isFixedDifficulty }: UpdateAccountDifficultyOptions): Promise<ApiResponse<void>> {
    const { data } = await this.client.put<ApiResponse<void>>(`account/${accountIdentifier}/difficulty`, {
      difficulty,
      isFixedDifficulty,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updateNotificationSettings({accountIdentifier, authToken, notificationSettings }: UpdateAccountNotificationSettingsOptions): Promise<ApiResponse<void>> {
    const { data } = await this.client.put<ApiResponse<void>>(`account/${accountIdentifier}/notification-settings`, notificationSettings, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updateSettings({accountIdentifier, authToken, partialSettings }: UpdateAccountSettingsOptions): Promise<ApiResponse<void>> {
    const { data } = await this.client.put<ApiResponse<void>>(`account/${accountIdentifier}/settings`, partialSettings, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }
}

export interface UpdateAccountNameOptions extends AuthenticatedAccountRequestOptions {
  newName?: string
}

export interface UpdateAccountDistributionRatioOptions extends AuthenticatedAccountRequestOptions {
  newDistributionRatio: string
}

export interface UpdateAccountPayoutOptions extends AuthenticatedAccountRequestOptions {
  minimumPayout?: string,
  payoutMultiplesOf?: string
}

export interface UpdateAccountIntegrations extends AuthenticatedAccountRequestOptions {
  chiaDashboardShareKey?: string,
}

export interface UpdateAccountDifficultyOptions extends AuthenticatedAccountRequestOptions {
  difficulty?: number,
  isFixedDifficulty: boolean
}

export interface UpdateAccountNotificationSettingsOptions extends AuthenticatedAccountRequestOptions {
  notificationSettings: AccountNotificationSettings
}

export interface UpdateAccountSettingsOptions extends AuthenticatedAccountRequestOptions {
  partialSettings: Partial<AccountSettings>
}

export interface UpdateHarvesterNameOptions extends UpdateHarvesterOptions {
  newName?: string
}

export interface UpdateHarvesterNotificationSettingsOptions extends UpdateHarvesterOptions {
  notificationSettings: HarvesterNotificationSettings
}

interface UpdateHarvesterOptions extends AuthenticatedAccountRequestOptions {
  harvesterPeerId: string
}

export interface AuthenticatedAccountRequestOptions {
  accountIdentifier: string
  authToken: string
}
