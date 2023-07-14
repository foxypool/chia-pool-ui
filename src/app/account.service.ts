import { Injectable } from '@angular/core'

import {StatsService} from './stats.service'
import {PoolsProvider} from './pools.provider'
import {LocalStorageService} from './local-storage.service'
import {ToastService} from './toast.service'
import {BigNumber} from 'bignumber.js'
import {SnippetService} from './snippet.service'
import * as Sentry from '@sentry/angular-ivy'
import {BehaviorSubject, Observable} from 'rxjs'
import {WonBlock} from './farmer-won-blocks/farmer-won-blocks.component'
import {AccountPayout} from './farmer-payout-history/farmer-payout-history.component'
import {distinctUntilChanged, filter, map, shareReplay} from 'rxjs/operators'
import {AccountHistoricalStat} from './api/types/account/account-historical-stat'
import {LoginTokenResult} from './api/types/auth/login-token-result'
import {AccountNotificationSettings, OgAccount} from './api/types/account/account'

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  public static poolPublicKeyStorageKey = 'poolPublicKey'
  public static authTokenStorageKey = (poolPublicKey: string): string => `authToken:${poolPublicKey}`

  public currentAccountIdentifier: Observable<string>
  public accountSubject = new BehaviorSubject<any>(null)
  public accountHistoricalStats = new BehaviorSubject<AccountHistoricalStat[]>([])
  public accountWonBlocks = new BehaviorSubject<WonBlock[]>([])
  public accountPayouts = new BehaviorSubject<AccountPayout[]>([])
  public isLoading = false
  public isAuthenticating = false
  public isUpdatingAccount = false
  public isLeavingPool = false
  public isMyFarmerPage = true

  private _poolPublicKey: string = null

  constructor(
    private readonly statsService: StatsService,
    private readonly poolsProvider: PoolsProvider,
    private readonly localStorageService: LocalStorageService,
    private readonly toastService: ToastService,
    private readonly snippetService: SnippetService,
  ) {
    this.migrateLegacyConfig()
    this.poolPublicKey = this.poolPublicKeyFromLocalStorage
    this.currentAccountIdentifier = this.accountSubject
      .asObservable()
      .pipe(
        filter(account => account !== null),
        map(account => account.poolPublicKey),
        distinctUntilChanged(),
        shareReplay(),
      )
  }

  get account(): OgAccount|null {
    return this.accountSubject.getValue()
  }

  set account(account: any) {
    this.accountSubject.next(account)
  }

  get poolPublicKey(): string {
    return this._poolPublicKey
  }

  set poolPublicKey(value: string) {
    this._poolPublicKey = value
    if (value) {
      Sentry.setUser({ id: value })
    } else {
      Sentry.setUser(null)
    }
  }

  get poolPublicKeyFromLocalStorage(): string {
    return this.localStorageService.getItem(AccountService.poolPublicKeyStorageKey)
  }

  get authToken(): string {
    return this.localStorageService.getItem(AccountService.authTokenStorageKey(this.poolPublicKey))
  }

  async login({ poolPublicKey }): Promise<boolean> {
    poolPublicKey = poolPublicKey.trim()
    if (!poolPublicKey.startsWith('0x')) {
      poolPublicKey = `0x${poolPublicKey}`
    }
    const account = await this.getAccount({ accountIdentifier: poolPublicKey })
    if (account === null) {
      this.toastService.showErrorToast(this.snippetService.getSnippet('account-service.login.error.invalid-farmer', poolPublicKey))
      return false
    }
    this.setPoolPublicKeyInLocalStorage(poolPublicKey)
    this.poolPublicKey = poolPublicKey
    await this.updateAccount()
    await Promise.all([
      this.updateAccountHistoricalStats(),
      this.updateAccountWonBlocks(),
      this.updateAccountPayouts(),
    ])
    this.toastService.showSuccessToast(this.snippetService.getSnippet('account-service.login.success'))

    return true
  }

  async loginUsingToken({ accountIdentifier, token }): Promise<void> {
    const account = await this.getAccount({ accountIdentifier })
    if (account === null) {
      this.toastService.showErrorToast(this.snippetService.getSnippet('account-service.login.error.invalid-farmer', accountIdentifier))
      return
    }
    this.setPoolPublicKeyInLocalStorage(accountIdentifier)
    this.poolPublicKey = accountIdentifier

    await this.updateAccount()
    await Promise.all([
      this.updateAccountHistoricalStats(),
      this.updateAccountWonBlocks(),
      this.updateAccountPayouts(),
    ])

    try {
      await this.authenticateWithToken({ token })
      this.toastService.showSuccessToast('Successfully authenticated')
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  private async authenticateWithToken({ token }) {
    if (!this.havePoolPublicKey) {
      return
    }
    this.isAuthenticating = true
    try {
      const { accessToken } = await this.statsService.authenticateWithToken({
        accountIdentifier: this.poolPublicKey,
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
      this.toastService.showErrorToast(this.snippetService.getSnippet('account-service.login.error.invalid-farmer', accountIdentifier))

      return false
    }

    return true
  }

  logout(): void {
    this.removeAuthTokenFromLocalStorage()
    if (!this.isExternalPoolPublicKey) {
      this.removePoolPublicKeyFromLocalStorage()
      this.clearStats()
    }
    this.toastService.showSuccessToast(this.snippetService.getSnippet('account-service.logout.success'))
  }

  clearStats(): void {
    this.poolPublicKey = null
    this.account = null
    this.accountHistoricalStats.next([])
    this.accountWonBlocks.next([])
    this.accountPayouts.next([])
  }

  removePoolPublicKeyFromLocalStorage(): void {
    this.localStorageService.removeItem(AccountService.poolPublicKeyStorageKey)
  }

  setPoolPublicKeyInLocalStorage(poolPublicKey: string): void {
    this.localStorageService.setItem(AccountService.poolPublicKeyStorageKey, poolPublicKey)
  }

  setAuthTokenInLocalStorage(authToken: string): void {
    this.localStorageService.setItem(AccountService.authTokenStorageKey(this.poolPublicKey), authToken)
  }

  removeAuthTokenFromLocalStorage(): void {
    this.localStorageService.removeItem(AccountService.authTokenStorageKey(this.poolPublicKey))
  }

  get havePoolPublicKey(): boolean {
    return !!this.poolPublicKey
  }

  get haveAccount(): boolean {
    return this.account !== null
  }

  get haveAuthToken(): boolean {
    return !!this.authToken
  }

  get isAuthenticated(): boolean {
    return this.havePoolPublicKey && this.haveAuthToken
  }

  get isExternalPoolPublicKey(): boolean {
    return this.poolPublicKey !== this.poolPublicKeyFromLocalStorage
  }

  async updateAccount({ bustCache = false } = {}) {
    this.account = await this.getAccount({ accountIdentifier: this.poolPublicKey, bustCache })
    if (!this.haveAccount) {
      if (this.isMyFarmerPage) {
        this.removeAuthTokenFromLocalStorage()
        this.removePoolPublicKeyFromLocalStorage()
      }
      this.accountHistoricalStats.next([])
      this.accountWonBlocks.next([])
      this.accountPayouts.next([])
      this.toastService.showErrorToast(this.snippetService.getSnippet('account-service.login.error.invalid-farmer', this.poolPublicKey))
    }
  }

  async updateAccountHistoricalStats() {
    this.accountHistoricalStats.next(await this.getAccountHistoricalStats({ accountIdentifier: this.poolPublicKey }))
  }

  async updateAccountWonBlocks() {
    this.accountWonBlocks.next(await this.getAccountWonBlocks({ accountIdentifier: this.poolPublicKey }))
  }

  async updateAccountPayouts() {
    this.accountPayouts.next(await this.getAccountPayouts({ accountIdentifier: this.poolPublicKey }))
  }

  async getAccount({ accountIdentifier, bustCache = false }) {
    this.isLoading = true
    let account = null
    try {
      account = await this.statsService.getAccount({ accountIdentifier, bustCache })
      if (account) {
        this.patchAccount(account)
      }
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
    let accountHarvesters = []
    try {
      accountHarvesters = await this.statsService.getAccountHarvesters({ accountIdentifier: this.poolPublicKey, bustCache })
    } finally {
      this.isLoading = false
    }

    return accountHarvesters
  }

  async getAccountHistoricalStats({ accountIdentifier }): Promise<AccountHistoricalStat[]> {
    this.isLoading = true
    let accountHistoricalStats = []
    try {
      accountHistoricalStats = await this.statsService.getAccountHistoricalStats(accountIdentifier)
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

  private async getAccountPayouts({ accountIdentifier }) {
    this.isLoading = true
    let accountPayouts = []
    try {
      accountPayouts = await this.statsService.getAccountPayouts(accountIdentifier)
    } finally {
      this.isLoading = false
    }

    return accountPayouts
  }

  patchAccount(account): void {
    account.pendingBN = new BigNumber(account.pending)
    account.pendingRounded = account.pendingBN.decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber()
    if (account.collateral) {
      account.collateralBN = new BigNumber(account.collateral)
      account.collateralRounded = account.collateralBN.decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber()
    }
  }

  async authenticate({ signature, message }) {
    if (!this.havePoolPublicKey) {
      return
    }
    this.isAuthenticating = true
    try {
      const { accessToken } = await this.statsService.authenticate({
        accountIdentifier: this.poolPublicKey,
        signature,
        message,
      })
      this.setAuthTokenInLocalStorage(accessToken)
    } finally {
      this.isAuthenticating = false
    }
  }

  async updateName({ newName }) {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      await this.statsService.updateAccountName({
        accountIdentifier: this.poolPublicKey,
        authToken: this.authToken,
        newName,
      })
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
      accountIdentifier: this.poolPublicKey,
      authToken: this.authToken,
    })
  }

  public async updateHarvesterName({ harvesterPeerId, newName }): Promise<void> {
    if (!this.isAuthenticated) {
      return
    }
    await this.statsService.updateHarvesterName({
      accountIdentifier: this.poolPublicKey,
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
        accountIdentifier: this.poolPublicKey,
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
        accountIdentifier: this.poolPublicKey,
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
        accountIdentifier: this.poolPublicKey,
        authToken: this.authToken,
        minimumPayout: newMinimumPayout,
        payoutMultiplesOf: newPayoutMultiplesOf,
      })
      await this.updateAccount({ bustCache: true })
    } finally {
      this.isUpdatingAccount = false
    }
  }

  public async updateDifficulty({ difficulty, isFixedDifficulty }): Promise<void> {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      await this.statsService.updateAccountDifficulty({
        accountIdentifier: this.poolPublicKey,
        authToken: this.authToken,
        difficulty,
        isFixedDifficulty,
      })
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
        accountIdentifier: this.poolPublicKey,
        authToken: this.authToken,
        notificationSettings,
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
      accountIdentifier: this.poolPublicKey,
      authToken: this.authToken,
      harvesterPeerId,
      notificationSettings,
    })
  }

  private migrateLegacyConfig() {
    const legacyAuthToken = this.localStorageService.getItem('authToken')
    if (legacyAuthToken) {
      this.localStorageService.setItem(AccountService.authTokenStorageKey(this.poolPublicKeyFromLocalStorage), legacyAuthToken)
      this.localStorageService.removeItem('authToken')
    }
  }
}
