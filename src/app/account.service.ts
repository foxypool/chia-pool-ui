import { Injectable } from '@angular/core'

import {StatsService} from './stats.service'
import {PoolsProvider} from './pools.provider'
import {LocalStorageService} from './local-storage.service'
import {ToastService} from './toast.service'
import {SnippetService} from './snippet.service'
import * as Sentry from '@sentry/angular-ivy'
import {BehaviorSubject, Observable} from 'rxjs'
import {AccountPayout} from './farmer-payout-history/farmer-payout-history.component'
import {distinctUntilChanged, filter, map, shareReplay} from 'rxjs/operators'
import {AccountHistoricalStat} from './api/types/account/account-historical-stat'
import {LoginTokenResult} from './api/types/auth/login-token-result'
import {Account, AccountNotificationSettings, getAccountIdentifier} from './api/types/account/account'
import {AccountWonBlock} from './api/types/account/account-won-block'

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  public static poolPublicKeyStorageKey = 'poolPublicKey'
  public static accountIdentifierStorageKey = 'accountIdentifier'
  public static authTokenStorageKey = (accountIdentifier: string): string => `authToken:${accountIdentifier}`

  public currentAccountIdentifier: Observable<string>
  public accountSubject = new BehaviorSubject<Account|null>(null)
  public accountHistoricalStats = new BehaviorSubject<AccountHistoricalStat[]>([])
  public accountWonBlocks = new BehaviorSubject<AccountWonBlock[]>([])
  public accountPayouts = new BehaviorSubject<AccountPayout[]>([])
  public isLoading = false
  public isAuthenticating = false
  public isUpdatingAccount = false
  public isLeavingPool = false
  public isMyFarmerPage = true

  private _accountIdentifier: string = null

  constructor(
    private readonly statsService: StatsService,
    private readonly poolsProvider: PoolsProvider,
    private readonly localStorageService: LocalStorageService,
    private readonly toastService: ToastService,
    private readonly snippetService: SnippetService,
  ) {
    this.migrateLegacyConfig()
    this.accountIdentifier = this.accountIdentifierFromLocalStorage
    this.currentAccountIdentifier = this.accountSubject
      .asObservable()
      .pipe(
        filter(account => account !== null),
        map(account => getAccountIdentifier(account)),
        distinctUntilChanged(),
        shareReplay(),
      )
  }

  get account(): Account|null {
    return this.accountSubject.getValue()
  }

  set account(account: Account|null) {
    this.accountSubject.next(account)
  }

  public get accountIdentifier(): string {
    return this._accountIdentifier
  }

  public set accountIdentifier(value: string) {
    this._accountIdentifier = value
    if (value) {
      Sentry.setUser({ id: value })
    } else {
      Sentry.setUser(null)
    }
  }

  public get accountIdentifierFromLocalStorage(): string|null {
    return this.localStorageService.getItem(AccountService.accountIdentifierStorageKey)
  }

  private get authToken(): string|null {
    return this.localStorageService.getItem(AccountService.authTokenStorageKey(this.accountIdentifier))
  }

  async login({ accountIdentifier }): Promise<boolean> {
    const account = await this.getAccount({ accountIdentifier })
    if (account === null) {
      this.toastService.showErrorToast(this.snippetService.getSnippet('account-service.login.error.invalid-farmer', accountIdentifier))
      return false
    }
    this.setAccountIdentifierInLocalStorage(accountIdentifier)
    this.accountIdentifier = accountIdentifier
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
    this.setAccountIdentifierInLocalStorage(accountIdentifier)
    this.accountIdentifier = accountIdentifier

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
      this.toastService.showErrorToast(this.snippetService.getSnippet('account-service.login.error.invalid-farmer', accountIdentifier))

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
    this.accountPayouts.next([])
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

  public get haveAccountIdentifier(): boolean {
    return !!this.accountIdentifier
  }

  get haveAccount(): boolean {
    return this.account !== null
  }

  get haveAuthToken(): boolean {
    return !!this.authToken
  }

  get isAuthenticated(): boolean {
    return this.haveAccountIdentifier && this.haveAuthToken
  }

  public get isExternalAccountIdentifier(): boolean {
    return this.accountIdentifier !== this.accountIdentifierFromLocalStorage
  }

  async updateAccount({ bustCache = false } = {}) {
    this.account = await this.getAccount({ accountIdentifier: this.accountIdentifier, bustCache })
    if (!this.haveAccount) {
      if (this.isMyFarmerPage) {
        this.removeAuthTokenFromLocalStorage()
        this.removeAccountIdentifierFromLocalStorage()
      }
      this.accountHistoricalStats.next([])
      this.accountWonBlocks.next([])
      this.accountPayouts.next([])
      this.toastService.showErrorToast(this.snippetService.getSnippet('account-service.login.error.invalid-farmer', this.accountIdentifier))
    }
  }

  async updateAccountHistoricalStats() {
    this.accountHistoricalStats.next(await this.getAccountHistoricalStats({ accountIdentifier: this.accountIdentifier }))
  }

  async updateAccountWonBlocks() {
    this.accountWonBlocks.next(await this.getAccountWonBlocks({ accountIdentifier: this.accountIdentifier }))
  }

  async updateAccountPayouts() {
    this.accountPayouts.next(await this.getAccountPayouts({ accountIdentifier: this.accountIdentifier }))
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
    let accountHarvesters = []
    try {
      accountHarvesters = await this.statsService.getAccountHarvesters({ accountIdentifier: this.accountIdentifier, bustCache })
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

  async updateName({ newName }) {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      await this.statsService.updateAccountName({
        accountIdentifier: this.accountIdentifier,
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

  public async updateDifficulty({ difficulty, isFixedDifficulty }): Promise<void> {
    if (!this.isAuthenticated) {
      return
    }
    this.isUpdatingAccount = true
    try {
      await this.statsService.updateAccountDifficulty({
        accountIdentifier: this.accountIdentifier,
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
        accountIdentifier: this.accountIdentifier,
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
      accountIdentifier: this.accountIdentifier,
      authToken: this.authToken,
      harvesterPeerId,
      notificationSettings,
    })
  }

  private migrateLegacyConfig() {
    const legacyPoolPublicKey = this.localStorageService.getItem(AccountService.poolPublicKeyStorageKey)
    if (legacyPoolPublicKey !== null) {
      this.setAccountIdentifierInLocalStorage(legacyPoolPublicKey)
      this.localStorageService.removeItem(AccountService.poolPublicKeyStorageKey)
    }
    const legacyAuthToken = this.localStorageService.getItem('authToken')
    if (legacyAuthToken) {
      this.localStorageService.setItem(AccountService.authTokenStorageKey(this.accountIdentifierFromLocalStorage), legacyAuthToken)
      this.localStorageService.removeItem('authToken')
    }
  }
}
