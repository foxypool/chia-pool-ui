import {Injectable} from '@angular/core'
import {BehaviorSubject, Observable} from 'rxjs'
import * as moment from 'moment'

import {PoolsProvider, PoolType} from './pools.provider'
import {SnippetService} from './snippet.service'
import {configForCoin} from './coin-config'
import {OgApi} from './api/og-api'
import {PoolConfig} from './api/types/pool/pool-config'
import {PoolStats} from './api/types/pool/pool-stats'
import {PoolHistoricalStat} from './api/types/pool/pool-historical-stat'
import {AccountStats} from './api/types/account/account-stats'
import {ApiResponse, isErrorResponse} from './api/types/api-response'
import {filter, map, shareReplay} from 'rxjs/operators'
import {RewardStats} from './api/types/pool/reward-stats'
import {Payout} from './api/types/pool/payout'
import {RateStats} from './api/types/pool/rate-stats'
import {NftApi} from './api/nft-api'
import {Account} from './api/types/account/account'
import {HistoricalStatsDuration} from './api/types/historical-stats-duration'

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  public coinConfig = configForCoin('CHIA')

  public readonly ticker$: Observable<string>

  public get poolConfig(): PoolConfig | undefined {
    return this.poolConfigSubject.getValue()
  }

  public readonly poolConfig$: Observable<PoolConfig>
  public readonly poolConfigSubject: BehaviorSubject<PoolConfig | undefined> = new BehaviorSubject<PoolConfig | undefined>(undefined)

  public get poolStats(): PoolStats | undefined {
    return this.poolStatsSubject.getValue()
  }

  public readonly poolStats$: Observable<PoolStats>
  public readonly poolStatsSubject: BehaviorSubject<PoolStats | undefined> = new BehaviorSubject<PoolStats | undefined>(undefined)

  public readonly poolHistoricalStatsSubject: BehaviorSubject<PoolHistoricalStat[]> = new BehaviorSubject<PoolHistoricalStat[]>([])

  public get accountStats(): AccountStats | undefined {
    return this.accountStatsSubject.getValue()
  }

  public readonly accountStats$: Observable<AccountStats>
  public readonly accountStatsSubject: BehaviorSubject<AccountStats | undefined> = new BehaviorSubject<AccountStats | undefined>(undefined)

  public get rewardStats(): RewardStats | undefined {
    return this.rewardStatsSubject.getValue()
  }

  public readonly rewardStats$: Observable<RewardStats>
  public readonly rewardStatsSubject: BehaviorSubject<RewardStats | undefined> = new BehaviorSubject<RewardStats | undefined>(undefined)

  public get recentPayouts(): Payout[] | undefined {
    return this.recentPayoutsSubject.getValue()
  }

  public readonly recentPayouts$: Observable<Payout[]>
  public readonly recentPayoutsSubject: BehaviorSubject<Payout[] | undefined> = new BehaviorSubject<Payout[] | undefined>(undefined)

  public readonly exchangeStats$: Observable<RateStats>
  public readonly exchangeStatsSubject: BehaviorSubject<RateStats|undefined> = new BehaviorSubject<RateStats|undefined>(undefined)
  private readonly api: OgApi|NftApi

  constructor(
    private readonly snippetService: SnippetService,
    poolsProvider: PoolsProvider,
  ) {
    this.poolConfig$ = this.poolConfigSubject.pipe(filter((poolConfig): poolConfig is PoolConfig => poolConfig !== undefined), shareReplay())
    this.ticker$ = this.poolConfig$.pipe(map(poolConfig => poolConfig.ticker), shareReplay())
    this.poolStats$ = this.poolStatsSubject.pipe(filter((poolStats): poolStats is PoolStats => poolStats !== undefined), shareReplay())
    this.accountStats$ = this.accountStatsSubject.pipe(filter((accountStats): accountStats is AccountStats => accountStats !== undefined), shareReplay())
    this.rewardStats$ = this.rewardStatsSubject.pipe(filter((rewardStats): rewardStats is RewardStats => rewardStats !== undefined), shareReplay())
    this.recentPayouts$ = this.recentPayoutsSubject.pipe(filter((recentPayouts): recentPayouts is Payout[] => recentPayouts !== undefined), shareReplay())
    this.exchangeStats$ = this.exchangeStatsSubject.pipe(filter((exchangeStats): exchangeStats is RateStats => exchangeStats !== undefined), shareReplay())
    if (poolsProvider.pool.type === PoolType.og) {
      this.api = new OgApi(poolsProvider.poolIdentifier)
    } else if (poolsProvider.pool.type === PoolType.nft) {
      this.api = new NftApi(poolsProvider.poolIdentifier)
    } else {
      throw new Error(`No api available for type ${poolsProvider.pool.type}`)
    }
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
    this.poolConfigSubject.next(poolConfig)
    this.coinConfig = configForCoin(poolConfig.coin)
  }

  onNewPoolStats(poolStats: PoolStats) {
    this.poolStatsSubject.next(poolStats)
  }

  onNewPoolHistoricalStats(poolHistoricalStats: PoolHistoricalStat[]) {
    this.poolHistoricalStatsSubject.next(poolHistoricalStats)
  }

  onNewAccountsStats(accountStats: AccountStats) {
    this.accountStatsSubject.next(accountStats)
  }

  onNewRewardStats(rewardStats: RewardStats) {
    this.rewardStatsSubject.next(rewardStats)
  }

  onNewLastPayouts(lastPayouts: Payout[]) {
    this.recentPayoutsSubject.next(lastPayouts)
  }

  onNewExchangeStats(exchangeStats: RateStats) {
    this.exchangeStatsSubject.next(exchangeStats)
  }

  public async getAccounts({ page, limit}: { page: number, limit: number}) {
    return this.api.getAccountList({ page, limit })
  }

  public async getAccount({ accountIdentifier, bustCache = false }): Promise<Account> {
    return this.api.getAccount({ accountIdentifier, bustCache })
  }

  getAccountHarvesters({ accountIdentifier, bustCache }) {
    return this.api.getAccountHarvesters({ accountIdentifier, bustCache })
  }

  getAccountHistoricalStats({ accountIdentifier, duration }: { accountIdentifier: string, duration: HistoricalStatsDuration }) {
    return this.api.getAccountHistoricalStats({ accountIdentifier, duration })
  }

  public getAccountWonBlocks(accountIdentifier: string) {
    return this.api.getAccountWonBlocks(accountIdentifier)
  }

  public getAccountPayouts(accountIdentifier: string) {
    return this.api.getAccountPayouts(accountIdentifier)
  }

  public async getHarvesterStats({ harvesterId, duration }: { harvesterId: string, duration: HistoricalStatsDuration }) {
    return this.api.getHarvesterStats({ harvesterId, duration })
  }

  public async getHarvesterProofTimes({ harvesterId, duration }: { harvesterId: string, duration: HistoricalStatsDuration }) {
    return this.api.getHarvesterProofTimes({ harvesterId, duration })
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

  public async deleteHarvester({ accountIdentifier, authToken, harvesterPeerId }) {
    return this.requestWithError(this.api.deleteHarvester({ accountIdentifier, authToken, harvesterPeerId }))
  }

  public updatePayoutOptions({ accountIdentifier, authToken, minimumPayout, payoutMultiplesOf }) {
    return this.requestWithError(this.api.updatePayoutOptions({ accountIdentifier, authToken, minimumPayout, payoutMultiplesOf }))
  }

  public updateIntegrations({ accountIdentifier, authToken, chiaDashboardShareKey }) {
    return this.requestWithError(this.api.updateIntegrations({ accountIdentifier, authToken, chiaDashboardShareKey }))
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

  public updateSettings({
    accountIdentifier,
    authToken,
    partialSettings,
  }): Promise<unknown> {
    return this.requestWithError(this.api.updateSettings({ accountIdentifier, authToken, partialSettings }))
  }

  public async leavePool({ accountIdentifier, authToken, leaveForEver }) {
    return this.requestWithError((this.api as OgApi).leavePool({ accountIdentifier, authToken, leaveForEver }))
  }

  public async rejoinPool({ accountIdentifier, authToken }) {
    return this.requestWithError((this.api as OgApi).rejoinPool({ accountIdentifier, authToken }))
  }

  private async requestWithError<T>(requestPromise: Promise<ApiResponse<T>>): Promise<T> {
    const result = await requestPromise
    if (isErrorResponse(result)) {
      throw new Error(this.snippetService.getSnippet(`api.error.${result.error}`))
    }

    return result
  }
}
