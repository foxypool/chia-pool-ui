import { Injectable } from '@angular/core'
import {BehaviorSubject} from 'rxjs'
import {BigNumber} from 'bignumber.js'
import * as moment from 'moment'

import {PoolsProvider} from './pools.provider'
import {SnippetService} from './snippet.service'
import {configForCoin} from './coin-config'
import {OgApi} from './api/og-api'
import {PoolConfig} from './api/types/pool/pool-config'
import {PoolStats} from './api/types/pool/pool-stats'
import {PoolHistoricalStat} from './api/types/pool/pool-historical-stat'
import {AccountStats} from './api/types/account/account-stats'
import {OgTopAccount} from './api/types/account/top-account'
import {ApiResponse, isErrorResponse} from './api/types/api-response'

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
  private readonly api: OgApi

  constructor(
    private readonly snippetService: SnippetService,
    poolsProvider: PoolsProvider,
  ) {
    this.api = new OgApi(poolsProvider.poolIdentifier)
    void this.initStats()
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
    this.onNewPoolConfig(await this.api.getPoolConfig())
  }

  async updatePoolStats() {
    this.onNewPoolStats(await this.api.getPoolStats())
  }

  async updatePoolHistoricalStats() {
    this.onNewPoolHistoricalStats(await this.api.getPoolHistoricalStats())
  }

  async updateAccountsStats() {
    this.onNewAccountsStats(await this.api.getAccountsStats())
  }

  async updateRewardStats() {
    this.onNewRewardStats(await this.api.getRewardStats())
  }

  async updateLastPayouts() {
    this.onNewLastPayouts(await this.api.getRecentPayouts())
  }

  async updateExchangeStats() {
    this.onNewExchangeStats(await this.api.getRateStats())
  }

  onNewPoolConfig(poolConfig: PoolConfig) {
    this.poolConfig.next(poolConfig)
    this.coinConfig = configForCoin(poolConfig.coin)
  }

  onNewPoolStats(poolStats: PoolStats) {
    this.poolStats.next(poolStats)
  }

  onNewPoolHistoricalStats(poolHistoricalStats: PoolHistoricalStat[]) {
    this.poolHistoricalStats.next(poolHistoricalStats)
  }

  onNewAccountsStats(accountStats: AccountStats<OgTopAccount>) {
    if (accountStats.topAccounts) {
      accountStats.topAccounts.forEach(account => {
        (account as any).pendingRounded = (new BigNumber(account.pending)).decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber()
        if (account.collateral) {
          (account as any).collateralRounded = (new BigNumber(account.collateral)).decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber()
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

  public async getAccounts({ page, limit}: { page: number, limit: number}) {
    return this.api.getAccountList({ page, limit })
  }

  getAccount({ accountIdentifier, bustCache = false }) {
    return this.api.getAccount({ accountIdentifier, bustCache })
  }

  getAccountHarvesters({ accountIdentifier, bustCache }) {
    return this.api.getAccountHarvesters({ accountIdentifier, bustCache })
  }

  getAccountHistoricalStats(accountIdentifier: string) {
    return this.api.getAccountHistoricalStats(accountIdentifier)
  }

  public getAccountWonBlocks(accountIdentifier: string) {
    return this.api.getAccountWonBlocks(accountIdentifier)
  }

  public getAccountPayouts(accountIdentifier: string) {
    return this.api.getAccountPayouts(accountIdentifier)
  }

  public async getHarvesterStats(harvesterId: string) {
    return this.api.getHarvesterStats(harvesterId)
  }

  public async getHarvesterProofTimes(harvesterId: string) {
    return this.api.getHarvesterProofTimes(harvesterId)
  }

  public async getClientVersions() {
    return this.api.getClientVersions()
  }

  public async authenticate({ accountIdentifier, message, signature }) {
    return this.requestWithError(this.api.authenticateAccount({ accountIdentifier, message, signature }))
  }

  public async authenticateWithToken({ accountIdentifier, token }) {
    return this.requestWithError(this.api.authenticateAccountWithToken({ accountIdentifier, token }))
  }

  public async generateLoginToken({ accountIdentifier, authToken }) {
    return this.requestWithError(this.api.generateLoginToken({ accountIdentifier, authToken }))
  }

  public async updateAccountName({ accountIdentifier, authToken, newName }) {
    return this.requestWithError(this.api.updateAccountName({ accountIdentifier, authToken, newName }))
  }

  public async updateHarvesterName({ accountIdentifier, authToken, harvesterPeerId, newName }) {
    return this.requestWithError(this.api.updateHarvesterName({ accountIdentifier, authToken, harvesterPeerId, newName }))
  }

  public async updateHarvesterNotificationSettings({ accountIdentifier, authToken, harvesterPeerId, notificationSettings }) {
    return this.requestWithError(this.api.updateHarvesterNotificationSettings({ accountIdentifier, authToken, harvesterPeerId, notificationSettings }))
  }

  public updatePayoutOptions({ accountIdentifier, authToken, minimumPayout, payoutMultiplesOf }) {
    return this.requestWithError(this.api.updatePayoutOptions({ accountIdentifier, authToken, minimumPayout, payoutMultiplesOf }))
  }

  public updateAccountDifficulty({ accountIdentifier, authToken, difficulty, isFixedDifficulty }) {
    return this.requestWithError(this.api.updateAccountDifficulty({ accountIdentifier, authToken, difficulty, isFixedDifficulty }))
  }

  public updateNotificationSettings({
    accountIdentifier,
    authToken,
    notificationSettings,
  }): Promise<unknown> {
    return this.requestWithError(this.api.updateNotificationSettings({ accountIdentifier, authToken, notificationSettings }))
  }

  public async leavePool({ accountIdentifier, authToken, leaveForEver }) {
    return this.requestWithError(this.api.leavePool({ accountIdentifier, authToken, leaveForEver }))
  }

  public async rejoinPool({ accountIdentifier, authToken }) {
    return this.requestWithError(this.api.rejoinPool({ accountIdentifier, authToken }))
  }

  private async requestWithError<T>(requestPromise: Promise<ApiResponse<T>>): Promise<T> {
    const result = await requestPromise
    if (isErrorResponse(result)) {
      throw new Error(this.snippetService.getSnippet(`api.error.${result.error}`))
    }

    return result
  }
}
