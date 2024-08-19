import { Injectable } from '@angular/core'

import {StatsService} from './stats.service'
import {PoolsProvider, PoolType} from './pools.provider'
import {LocalStorageService} from './local-storage.service'
import {ToastService} from './toast.service'
import {SnippetService} from './snippet.service'
import * as Sentry from '@sentry/angular-ivy'
import {BehaviorSubject, Observable} from 'rxjs'
import {distinctUntilChanged, filter, map, shareReplay} from 'rxjs/operators'
import {AccountHistoricalStat} from './api/types/account/account-historical-stat'
import {LoginTokenResult} from './api/types/auth/login-token-result'
import {
  Account,
  AccountDifficultySettings,
  AccountNotificationSettings,
  AccountSettings,
  getAccountIdentifier
} from './api/types/account/account'
import {AccountWonBlock} from './api/types/account/account-won-block'
import {makeAccountIdentifierName} from './util'
import {HistoricalStatsDuration} from './api/types/historical-stats-duration'
import {HistoricalStatsDurationProvider} from './historical-stats-duration-provider'
import {AccountPartialList} from './api/types/account/account-partial'
import {Harvester} from './api/types/harvester/harvester'
import {AccountPayout, AccountPayouts} from './api/types/account/account-payout'
import {AccountBalanceChangeList} from './api/types/account/account-balance-change'

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  public static poolPublicKeyStorageKey = 'poolPublicKey'
  public static singletonGenesisStorageKey = 'singletonGenesis'
  public static accountIdentifierStorageKey = 'accountIdentifier'
  public static authTokenStorageKey = (accountIdentifier: string): string => `authToken:${accountIdentifier}`

  public readonly isLoading$: Observable<boolean>
  public readonly haveAccount$: Observable<boolean>
  public readonly haveAccountIdentifier$: Observable<boolean>
  public readonly accountIdentifier$: Observable<string|null>
  public currentAccountIdentifier: Observable<string>
  public accountSubject = new BehaviorSubject<Account|null>(null)
  public accountHistoricalStats = new BehaviorSubject<AccountHistoricalStat[]>([])
  public accountWonBlocks = new BehaviorSubject<AccountWonBlock[]>([])
  public accountPayouts = new BehaviorSubject<AccountPayout[]>([])
  public isAuthenticating = false
  public isUpdatingAccount = false
  public isLeavingPool = false
  public isMyFarmerAccount = true

  public get account(): Account|null {
    return this.accountSubject.getValue()
  }

  public set account(account: Account|null) {
    this.accountSubject.next(account)
  }

  public get accountIdentifier(): string|null {
    return this.accountIdentifierSubject.getValue()
  }

  public set accountIdentifier(value: string|null) {
    this.accountIdentifierSubject.next(value)
    if (value !== null) {
      Sentry.setUser({ id: value })
    } else {
      Sentry.setUser(null)
    }
  }

  public get accountIdentifierFromLocalStorage(): string|null {
    return this.localStorageService.getItem(AccountService.accountIdentifierStorageKey)
  }

  public get haveAccountIdentifier(): boolean {
    return !!this.accountIdentifier
  }

  public get haveAccount(): boolean {
    return this.account !== null
  }

  public get haveAuthToken(): boolean {
    return !!this.authToken
  }

  public get isAuthenticated(): boolean {
    return this.haveAccountIdentifier && this.haveAuthToken
  }

  public get isExternalAccountIdentifier(): boolean {
    return this.accountIdentifier !== this.accountIdentifierFromLocalStorage
  }

  private readonly accountIdentifierSubject: BehaviorSubject<string|null> = new BehaviorSubject<string|null>(null)
  private readonly isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)

  private set isLoading(isLoading: boolean) {
    this.isLoadingSubject.next(isLoading)
  }

  private get authToken(): string|null {
    return this.localStorageService.getItem(AccountService.authTokenStorageKey(this.accountIdentifier))
  }

  constructor(
    private readonly statsService: StatsService,
    private readonly poolsProvider: PoolsProvider,
    private readonly localStorageService: LocalStorageService,
    private readonly toastService: ToastService,
    private readonly snippetService: SnippetService,
    private readonly historicalStatsDurationProvider: HistoricalStatsDurationProvider,
  ) {
    this.accountIdentifier$ = this.accountIdentifierSubject.pipe(distinctUntilChanged(), shareReplay(1))
    this.haveAccountIdentifier$ = this.accountIdentifier$.pipe(map(identifier => identifier !== null), distinctUntilChanged(), shareReplay(1))
    this.haveAccount$ = this.accountSubject.pipe(map(account => account !== null), distinctUntilChanged(), shareReplay(1))
    this.isLoading$ = this.isLoadingSubject.pipe(distinctUntilChanged(), shareReplay(1))
    this.migrateLegacyConfig()
    this.accountIdentifier = this.accountIdentifierFromLocalStorage
    this.currentAccountIdentifier = this.accountSubject
      .asObservable()
      .pipe(
        filter(account => account !== null),
        map(account => getAccountIdentifier(account)),
        distinctUntilChanged(),
        shareReplay(1),
      )
  }

  async login({ accountIdentifier }): Promise<boolean> {
    const account = await this.getAccount({ accountIdentifier })
    if (account === null) {
      this.toastService.showErrorToast(makeInvalidFarmerErrorMessage(this.poolsProvider.pool.type, accountIdentifier))
      return false
    }
    this.setAccountIdentifierInLocalStorage(accountIdentifier)
    this.accountIdentifier = accountIdentifier
    await this.updateAccount()
    await Promise.all([
      this.updateAccountHistoricalStats(),
      this.updateAccountWonBlocks(),
    ])
    this.toastService.showSuccessToast(this.snippetService.getSnippet('account-service.login.success'))

    return true
  }

  async loginUsingToken({ accountIdentifier, token }): Promise<void> {
    const account = await this.getAccount({ accountIdentifier })
    if (account === null) {
      this.toastService.showErrorToast(makeInvalidFarmerErrorMessage(this.poolsProvider.pool.type, accountIdentifier))
      return
    }
    this.setAccountIdentifierInLocalStorage(accountIdentifier)
    this.accountIdentifier = accountIdentifier

    await this.updateAccount()
    await Promise.all([
      this.updateAccountHistoricalStats(),
      this.updateAccountWonBlocks(),
    ])

    try {
      await this.authenticateWithToken({ token })
      this.toastService.showSuccessToast('Successfully authenticated')
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  private async authenticateWithToken({ token }) {
    if (!this.haveAccountIdentifier) {
      return
    }
    this.isAuthenticating = true
    try {
      const { accessToken } = await this.statsService.authenticateWithToken({
        accountIdentifier: this.accountIdentifier,
        token,
      })
      this.setAuthTokenInLocalStorage(accessToken)
    } finally {
      this.isAuthenticating = false
    }
  }

  async doesAccountExist({ accountIdentifier }) {
    const account = await this.getAccount({ accountIdentifier })
    if (account === null) {
      this.toastService.showErrorToast(makeInvalidFarmerErrorMessage(this.poolsProvider.pool.type, accountIdentifier))

      return false
    }

    return true
  }

  logout(): void {
    this.removeAuthTokenFromLocalStorage()
    if (!this.isExternalAccountIdentifier) {
      this.removeAccountIdentifierFromLocalStorage()
      this.clearStats()
    }
    this.toastService.showSuccessToast(this.snippetService.getSnippet('account-service.logout.success'))
  }

  clearStats(): void {
    this.accountIdentifier = null
    this.account = null
    this.accountHistoricalStats.next([])
    this.accountWonBlocks.next([])
  }

  removeAccountIdentifierFromLocalStorage(): void {
    this.localStorageService.removeItem(AccountService.accountIdentifierStorageKey)
  }

  private setAccountIdentifierInLocalStorage(accountIdentifier: string) {
    this.localStorageService.setItem(AccountService.accountIdentifierStorageKey, accountIdentifier)
  }

  setAuthTokenInLocalStorage(authToken: string): void {
    this.localStorageService.setItem(AccountService.authTokenStorageKey(this.accountIdentifier), authToken)
  }

  removeAuthTokenFromLocalStorage(): void {
    this.localStorageService.removeItem(AccountService.authTokenStorageKey(this.accountIdentifier))
  }

  async updateAccount({ bustCache = false } = {}) {
    this.account = await this.getAccount({ accountIdentifier: this.accountIdentifier, bustCache })
    if (!this.haveAccount) {
      if (this.isMyFarmerAccount) {
        this.removeAuthTokenFromLocalStorage()
        this.removeAccountIdentifierFromLocalStorage()
      }
      this.accountHistoricalStats.next([])
      this.accountWonBlocks.next([])
      this.toastService.showErrorToast(makeInvalidFarmerErrorMessage(this.poolsProvider.pool.type, this.accountIdentifier))
    }
  }

  async updateAccountHistoricalStats() {
    this.accountHistoricalStats.next(await this.getAccountHistoricalStats({ accountIdentifier: this.accountIdentifier, duration: this.historicalStatsDurationProvider.selectedDuration }))
  }

  async updateAccountWonBlocks() {
    this.accountWonBlocks.next(await this.getAccountWonBlocks({ accountIdentifier: this.accountIdentifier }))
  }

  private async getAccount({ accountIdentifier, bustCache = false }): Promise<Account|null> {
    this.isLoading = true
    let account: Account|null = null
    try {
      account = await this.statsService.getAccount({ accountIdentifier, bustCache })
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        account = null
      } else {
        throw err
      }
    } finally {
      this.isLoading = false
    }

    return account
  }

  async getAccountHarvesters({ bustCache = false }) {
    this.isLoading = true
    let accountHarvesters: Harvester[] = []
    try {
      accountHarvesters = await this.statsService.getAccountHarvesters({ accountIdentifier: this.accountIdentifier, bustCache })
    } finally {
      this.isLoading = false
    }

    return accountHarvesters
  }

  public async getAccountPartials({ page, limit }) {
    this.isLoading = true
    let accountPartials: AccountPartialList
    try {
      accountPartials = await this.statsService.getAccountPartials({ accountIdentifier: this.accountIdentifier, page, limit })
    } finally {
      this.isLoading = false
    }

    return accountPartials
  }

  public async getAccountBalanceChanges({ page, limit }) {
    this.isLoading = true
    let accountBalanceChanges: AccountBalanceChangeList
    try {
      accountBalanceChanges = await this.statsService.getAccountBalanceChanges({ accountIdentifier: this.accountIdentifier, page, limit })
    } finally {
      this.isLoading = false
    }

    return accountBalanceChanges
  }

  async getAccountHistoricalStats({ accountIdentifier, duration }: { accountIdentifier: string, duration: HistoricalStatsDuration }): Promise<AccountHistoricalStat[]> {
    this.isLoading = true
    let accountHistoricalStats = []
    try {
      accountHistoricalStats = await this.statsService.getAccountHistoricalStats({ accountIdentifier, duration })
    } finally {
      this.isLoading = false
    }

    return accountHistoricalStats
  }

  private async getAccountWonBlocks({ accountIdentifier }) {
    this.isLoading = true
    let accountWonBlocks = []
    try {
      accountWonBlocks = await this.statsService.getAccountWonBlocks(accountIdentifier)
    } finally {
      this.isLoading = false
    }

    return accountWonBlocks
  }

  public async getAccountPayouts({ page, limit }: { page: number, limit: number }): Promise<AccountPayouts> {
    this.isLoading = true
    let accountPayouts: AccountPayouts
    try {
      accountPayouts = await this.statsService.getAccountPayouts({
        accountIdentifier: this.accountIdentifier,
        page,
        limit,
      })
    } finally {
      this.isLoading = false
    }

    return accountPayouts
  }

  async authenticate({ signature, message }) {
    if (!this.haveAccountIdentifier) {
      return
    }
    this.isAuthenticating = true
    try {
      const { accessToken } = await this.statsService.authenticate({
        accountIdentifier: this.accountIdentifier,
        signature,
        message,
      })
      this.setAuthTokenInLocalStorage(accessToken)
    } finally {
      this.isAuthenticating = false
    }
  }

  async updateAccountSettings(options: UpdateAccountSettingsOptions) {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      if ('name' in options) {
          await this.statsService.updateAccountName({
            accountIdentifier: this.accountIdentifier,
            authToken: this.authToken,
            newName: options.name,
          })
      }
      if ('imageUrl' in options) {
        await this.statsService.updateSettings({
          accountIdentifier: this.accountIdentifier,
          authToken: this.authToken,
          partialSettings: {
            profile: { imageUrl: options.imageUrl ?? null },
          },
        })
      }
      await this.updateAccount({ bustCache: true })
    } finally {
      this.isUpdatingAccount = false
    }
  }

  public async updateRewardOptions(options: UpdateAccountRewardOptions) {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      if ('newDistributionRatio' in options) {
        await this.statsService.updateAccountDistributionRatio({
          accountIdentifier: this.accountIdentifier,
          authToken: this.authToken,
          newDistributionRatio: options.newDistributionRatio,
        })
      }
      await this.updateAccount({ bustCache: true })
    } finally {
      this.isUpdatingAccount = false
    }
  }

  public async generateLoginToken(): Promise<LoginTokenResult> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated')
    }

    return this.statsService.generateLoginToken({
      accountIdentifier: this.accountIdentifier,
      authToken: this.authToken,
    })
  }

  public async updateHarvesterName({ harvesterPeerId, newName }): Promise<void> {
    if (!this.isAuthenticated) {
      return
    }
    await this.statsService.updateHarvesterName({
      accountIdentifier: this.accountIdentifier,
      authToken: this.authToken,
      harvesterPeerId,
      newName,
    })
  }

  async leavePool({ leaveForEver }) {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    this.isLeavingPool = true
    try {
      await this.statsService.leavePool({
        accountIdentifier: this.accountIdentifier,
        authToken: this.authToken,
        leaveForEver,
      })
      await this.updateAccount({ bustCache: true })
    } finally {
      this.isUpdatingAccount = false
      this.isLeavingPool = false
    }
  }

  async rejoinPool() {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      await this.statsService.rejoinPool({
        accountIdentifier: this.accountIdentifier,
        authToken: this.authToken,
      })
      await this.updateAccount({ bustCache: true })
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    } finally {
      this.isUpdatingAccount = false
    }
  }

  public async updatePayoutOptions({ newMinimumPayout, newPayoutMultiplesOf }) {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      await this.statsService.updatePayoutOptions({
        accountIdentifier: this.accountIdentifier,
        authToken: this.authToken,
        minimumPayout: newMinimumPayout,
        payoutMultiplesOf: newPayoutMultiplesOf,
      })
      await this.updateAccount({ bustCache: true })
    } finally {
      this.isUpdatingAccount = false
    }
  }

  public async updateIntegrations({ chiaDashboardShareKey }: { chiaDashboardShareKey?: string }) {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      await this.statsService.updateIntegrations({
        accountIdentifier: this.accountIdentifier,
        authToken: this.authToken,
        chiaDashboardShareKey,
      })
      await this.updateAccount({ bustCache: true })
    } finally {
      this.isUpdatingAccount = false
    }
  }

  public async updateDifficulty({ accountDifficulty, accountDifficultySettings }: UpdateDifficultySettingsOptions): Promise<void> {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      if (accountDifficulty !== undefined) {
        await this.statsService.updateAccountDifficulty({
          accountIdentifier: this.accountIdentifier,
          authToken: this.authToken,
          difficulty: accountDifficulty.difficulty,
          isFixedDifficulty: accountDifficulty.isFixedDifficulty,
        })
      }
      if (accountDifficultySettings !== undefined) {
        await this.statsService.updateSettings({
          accountIdentifier: this.accountIdentifier,
          authToken: this.authToken,
          partialSettings: {
            difficulty: accountDifficultySettings,
          },
        })
      }
      await this.updateAccount({ bustCache: true })
    } finally {
      this.isUpdatingAccount = false
    }
  }

  public async updateNotificationSettings(notificationSettings: AccountNotificationSettings): Promise<void> {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      await this.statsService.updateNotificationSettings({
        accountIdentifier: this.accountIdentifier,
        authToken: this.authToken,
        notificationSettings,
      })
      await this.updateAccount({ bustCache: true })
    } finally {
      this.isUpdatingAccount = false
    }
  }

  public async updateSettings(partialSettings: Partial<AccountSettings>): Promise<void> {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      await this.statsService.updateSettings({
        accountIdentifier: this.accountIdentifier,
        authToken: this.authToken,
        partialSettings,
      })
      await this.updateAccount({ bustCache: true })
    } finally {
      this.isUpdatingAccount = false
    }
  }

  public async updateHarvesterNotificationSettings({ harvesterPeerId, notificationSettings }): Promise<void> {
    if (!this.isAuthenticated) {
      return
    }
    await this.statsService.updateHarvesterNotificationSettings({
      accountIdentifier: this.accountIdentifier,
      authToken: this.authToken,
      harvesterPeerId,
      notificationSettings,
    })
  }

  public async deleteHarvester(harvesterPeerId: string): Promise<void> {
    if (!this.isAuthenticated) {
      return
    }
    await this.statsService.deleteHarvester({
      accountIdentifier: this.accountIdentifier,
      authToken: this.authToken,
      harvesterPeerId,
    })
  }

  private migrateLegacyConfig() {
    const legacyPoolPublicKey = this.localStorageService.getItem(AccountService.poolPublicKeyStorageKey)
    if (legacyPoolPublicKey !== null) {
      this.setAccountIdentifierInLocalStorage(legacyPoolPublicKey)
      this.localStorageService.removeItem(AccountService.poolPublicKeyStorageKey)
    }
    const legacyLauncherId = this.localStorageService.getItem(AccountService.singletonGenesisStorageKey)
    if (legacyLauncherId !== null) {
      this.setAccountIdentifierInLocalStorage(legacyLauncherId)
      this.localStorageService.removeItem(AccountService.singletonGenesisStorageKey)
    }
    const legacyAuthToken = this.localStorageService.getItem('authToken')
    if (legacyAuthToken) {
      this.localStorageService.setItem(AccountService.authTokenStorageKey(this.accountIdentifierFromLocalStorage), legacyAuthToken)
      this.localStorageService.removeItem('authToken')
    }
  }
}

function makeInvalidFarmerErrorMessage(poolType: PoolType, accountIdentifier: string): string {
  return `Could not find farmer for ${makeAccountIdentifierName(poolType)} "${accountIdentifier}"`
}

export interface UpdateAccountSettingsOptions {
  name?: string
  imageUrl?: string
}

export interface UpdateAccountRewardOptions {
  newDistributionRatio?: string
}

export interface UpdateDifficultySettingsOptions {
  accountDifficulty?: {
    difficulty: number
    isFixedDifficulty: boolean
  }
  accountDifficultySettings?: AccountDifficultySettings
}
