import { Injectable } from '@angular/core'
import {BehaviorSubject} from 'rxjs'
import {BigNumber} from 'bignumber.js'
import * as moment from 'moment'

import {PoolsProvider} from './pools.provider'
import {SnippetService} from './snippet.service'
import {configForCoin} from './coin-config'
import {
  AccountHistoricalStat,
  AccountListResponse,
  ApiService,
  ClientVersion,
  HarvesterStats, LoginTokenResponse,
  ProofTime
} from './api.service'

@Injectable({
  providedIn: 'root'
})
export class StatsService {

  public poolConfig = new BehaviorSubject<any>({})
  public coinConfig = configForCoin('CHIA')
  public poolStats = new BehaviorSubject<any>({})
  public poolHistoricalStats = new BehaviorSubject<any>([])
  public accountStats = new BehaviorSubject<any>({})
  public rewardStats = new BehaviorSubject<any>({})
  public lastPayouts = new BehaviorSubject<any>(null)
  public exchangeStats = new BehaviorSubject<any>({})

  private apiService: ApiService

  constructor(
    private readonly poolsProvider: PoolsProvider,
    private readonly snippetService: SnippetService,
  ) {
    this.init()
  }

  init() {
    this.apiService = new ApiService(this.poolsProvider.apiUrl)
    this.initStats()
    setInterval(this.updatePoolConfig.bind(this), 60 * 60 * 1000)
    setInterval(this.updatePoolStats.bind(this), 31 * 1000)
    setInterval(this.updateAccountsStats.bind(this), 61 * 1000)
    setInterval(this.updateRewardStats.bind(this), 61 * 1000)
    setInterval(this.updateLastPayouts.bind(this), 5 * 61 * 1000)
    setInterval(this.updateExchangeStats.bind(this), 5 * 61 * 1000)
    this.registerPoolHistoricalStatsUpdates()
  }

  registerPoolHistoricalStatsUpdates() {
    let nextRefreshDate = moment().utc().startOf('day').add(6, 'minutes')
    if (moment().isAfter(nextRefreshDate)) {
      nextRefreshDate = nextRefreshDate.add(1, 'day')
    }
    const timeTillRefreshInMs = nextRefreshDate.diff(moment(), 'milliseconds')
    setTimeout(async () => {
      setInterval(this.updatePoolHistoricalStats.bind(this), 24 * 60 * 60 * 1000)
      await this.updatePoolHistoricalStats()
    }, timeTillRefreshInMs)
  }

  get poolIdentifier() {
    return this.poolsProvider.poolIdentifier
  }

  async initStats() {
   await Promise.all([
      this.updatePoolConfig(),
      this.updatePoolStats(),
      this.updatePoolHistoricalStats(),
      this.updateAccountsStats(),
      this.updateRewardStats(),
      this.updateLastPayouts(),
      this.updateExchangeStats(),
    ])
  }

  async updatePoolConfig() {
    this.onNewPoolConfig(await this.apiService.getPoolConfig({ poolIdentifier: this.poolIdentifier }))
  }

  async updatePoolStats() {
    this.onNewPoolStats(await this.apiService.getPoolStats({ poolIdentifier: this.poolIdentifier }))
  }

  async updatePoolHistoricalStats() {
    this.onNewPoolHistoricalStats(await this.apiService.getPoolHistoricalStats({ poolIdentifier: this.poolIdentifier }))
  }

  async updateAccountsStats() {
    this.onNewAccountsStats(await this.apiService.getAccountsStats({ poolIdentifier: this.poolIdentifier }))
  }

  async updateRewardStats() {
    this.onNewRewardStats(await this.apiService.getRewardStats({ poolIdentifier: this.poolIdentifier }))
  }

  async updateLastPayouts() {
    this.onNewLastPayouts(await this.apiService.getLastPayouts({ poolIdentifier: this.poolIdentifier }))
  }

  async updateExchangeStats() {
    this.onNewExchangeStats(await this.apiService.getExchangeStats({ poolIdentifier: this.poolIdentifier }))
  }

  onNewPoolConfig(poolConfig) {
    this.poolConfig.next(poolConfig)
    this.coinConfig = configForCoin(poolConfig.coin)
  }

  onNewPoolStats(poolStats) {
    this.poolStats.next(poolStats)
  }

  onNewPoolHistoricalStats(poolHistoricalStats) {
    this.poolHistoricalStats.next(poolHistoricalStats)
  }

  onNewAccountsStats(accountStats) {
    if (accountStats.topAccounts) {
      accountStats.topAccounts.forEach(account => {
        account.pendingRounded = (new BigNumber(account.pending)).decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber()
        if (account.collateral) {
          account.collateralRounded = (new BigNumber(account.collateral)).decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber()
        }
      })
    }
    this.accountStats.next(accountStats)
  }

  onNewRewardStats(rewardStats) {
    this.rewardStats.next(rewardStats)
  }

  onNewLastPayouts(lastPayouts) {
    this.lastPayouts.next(lastPayouts)
  }

  onNewExchangeStats(exchangeStats) {
    this.exchangeStats.next(exchangeStats)
  }

  public async getAccounts({ page, limit}: { page: number, limit: number}): Promise<AccountListResponse> {
    return this.apiService.getAccounts({ poolIdentifier: this.poolIdentifier, page, limit })
  }

  getAccount({ poolPublicKey, bustCache = false }) {
    return this.apiService.getAccount({ poolIdentifier: this.poolIdentifier, poolPublicKey, bustCache })
  }

  getAccountHarvesters({ poolPublicKey, bustCache }) {
    return this.apiService.getAccountHarvesters({ poolIdentifier: this.poolIdentifier, poolPublicKey, bustCache })
  }

  getAccountHistoricalStats({ poolPublicKey}): Promise<AccountHistoricalStat[]> {
    return this.apiService.getAccountHistoricalStats({ poolIdentifier: this.poolIdentifier, poolPublicKey })
  }

  public getAccountWonBlocks({ poolPublicKey}) {
    return this.apiService.getAccountWonBlocks({ poolIdentifier: this.poolIdentifier, poolPublicKey })
  }

  public getAccountPayouts({ poolPublicKey}) {
    return this.apiService.getAccountPayouts({ poolIdentifier: this.poolIdentifier, poolPublicKey })
  }

  public async getHarvesterStats(harvesterId: string): Promise<HarvesterStats> {
    return this.apiService.getHarvesterStats({ poolIdentifier: this.poolIdentifier, harvesterId })
  }

  public async getHarvesterProofTimes(harvesterId: string): Promise<ProofTime[]> {
    return this.apiService.getHarvesterProofTimes({ poolIdentifier: this.poolIdentifier, harvesterId })
  }

  public async getClientVersions(): Promise<ClientVersion[]> {
    return this.apiService.getClientVersions({ poolIdentifier: this.poolIdentifier })
  }

  authenticate({ poolPublicKey, message, signature }): any {
    return this.requestWithError(this.apiService.authenticateAccount({ poolIdentifier: this.poolIdentifier, poolPublicKey, message, signature }))
  }

  authenticateWithToken({ accountIdentifier, token }): any {
    return this.requestWithError(this.apiService.authenticateAccountWithToken({ poolIdentifier: this.poolIdentifier, accountIdentifier, token }))
  }

  async generateLoginToken({ accountIdentifier, authToken }): Promise<LoginTokenResponse> {
    return this.requestWithError(this.apiService.generateLoginToken({ poolIdentifier: this.poolIdentifier, accountIdentifier, authToken }))
  }

  async updateAccountName({ poolPublicKey, authToken, newName }) {
    return this.requestWithError(this.apiService.updateAccountName({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken, newName }))
  }

  public async updateHarvesterName({ poolPublicKey, authToken, harvesterPeerId, newName }): Promise<unknown> {
    return this.requestWithError(this.apiService.updateHarvesterName({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken, harvesterPeerId, newName }))
  }

  public async updateHarvesterNotificationSettings({ poolPublicKey, authToken, harvesterPeerId, notificationSettings }): Promise<unknown> {
    return this.requestWithError(this.apiService.updateHarvesterNotificationSettings({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken, harvesterPeerId, notificationSettings }))
  }

  updateAccountDistributionRatio({ poolPublicKey, authToken, newDistributionRatio }) {
    return this.requestWithError(this.apiService.updateAccountDistributionRatio({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken, newDistributionRatio }))
  }

  public updatePayoutOptions({ poolPublicKey, authToken, minimumPayout, payoutMultiplesOf }) {
    return this.requestWithError(this.apiService.updatePayoutOptions({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken, minimumPayout, payoutMultiplesOf }))
  }

  public updateAccountDifficulty({ poolPublicKey, authToken, difficulty, isFixedDifficulty }): Promise<unknown> {
    return this.requestWithError(this.apiService.updateAccountDifficulty({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken, difficulty, isFixedDifficulty }))
  }

  public updateNotificationSettings({
    poolPublicKey,
    authToken,
    ecLastHourThreshold,
    areEcChangeNotificationsEnabled,
    areBlockWonNotificationsEnabled,
    arePayoutAddressChangeNotificationsEnabled,
    areHarvesterOfflineNotificationsEnabled,
    harvesterOfflineDurationInMinutes,
  }): Promise<unknown> {
    return this.requestWithError(this.apiService.updateNotificationSettings({
      poolIdentifier: this.poolIdentifier,
      poolPublicKey,
      authToken,
      ecLastHourThreshold,
      areEcChangeNotificationsEnabled,
      areBlockWonNotificationsEnabled,
      arePayoutAddressChangeNotificationsEnabled,
      areHarvesterOfflineNotificationsEnabled,
      harvesterOfflineDurationInMinutes,
    }))
  }

  leavePool({ poolPublicKey, authToken, leaveForEver }) {
    return this.requestWithError(this.apiService.leavePool({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken, leaveForEver }))
  }

  rejoinPool({ poolPublicKey, authToken }) {
    return this.requestWithError(this.apiService.rejoinPool({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken }))
  }

  async requestWithError(requestPromise) {
    const result:any = await requestPromise
    if (result && result.error) {
      throw new Error(this.snippetService.getSnippet(`api.error.${result.error}`))
    }

    return result
  }
}
