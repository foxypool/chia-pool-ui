import { Injectable } from '@angular/core';

import {StatsService} from './stats.service';
import {PoolsProvider} from './pools.provider';
import {LocalStorageService} from './local-storage.service';
import {ToastService} from './toast.service';
import {BigNumber} from 'bignumber.js';
import {SnippetService} from './snippet.service';
import * as Sentry from '@sentry/angular';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  public static poolPublicKeyStorageKey = 'poolPublicKey';
  public static authTokenStorageKey = (poolPublicKey: string): string => `authToken:${poolPublicKey}`;

  public account = null;
  public accountHistoricalStats = new BehaviorSubject<any[]>([]);
  public isLoading = false;
  public isAuthenticating = false;
  public isUpdatingAccount = false;
  public isLeavingPool = false;
  public isMyFarmerPage = true;

  private _poolPublicKey: string = null;

  constructor(
    private statsService: StatsService,
    private poolsProvider: PoolsProvider,
    private localStorageService: LocalStorageService,
    private toastService: ToastService,
    private snippetService: SnippetService,
  ) {
    this.migrateLegacyConfig();
    this.poolPublicKey = this.poolPublicKeyFromLocalStorage;
  }

  get poolPublicKey(): string {
    return this._poolPublicKey;
  }

  set poolPublicKey(value: string) {
    this._poolPublicKey = value;
    if (value) {
      Sentry.setUser({ id: value });
    } else {
      Sentry.setUser(null);
    }
  }

  get poolPublicKeyFromLocalStorage(): string {
    return this.localStorageService.getItem(AccountService.poolPublicKeyStorageKey);
  }

  get authToken(): string {
    return this.localStorageService.getItem(AccountService.authTokenStorageKey(this.poolPublicKey));
  }

  async login({ poolPublicKey }): Promise<boolean> {
    poolPublicKey = poolPublicKey.trim();
    if (!poolPublicKey.startsWith('0x')) {
      poolPublicKey = `0x${poolPublicKey}`;
    }
    const account = await this.getAccount({ poolPublicKey });
    if (account === null) {
      this.toastService.showErrorToast(this.snippetService.getSnippet('account-service.login.error.invalid-farmer', poolPublicKey));
      return false;
    }
    this.setPoolPublicKeyInLocalStorage(poolPublicKey);
    this.poolPublicKey = poolPublicKey;
    await this.updateAccount();
    await this.updateAccountHistoricalStats();
    this.toastService.showSuccessToast(this.snippetService.getSnippet('account-service.login.success'));

    return true;
  }

  async doesAccountExist({ poolPublicKey }) {
    const account = await this.getAccount({ poolPublicKey });
    if (account === null) {
      this.toastService.showErrorToast(this.snippetService.getSnippet('account-service.login.error.invalid-farmer', poolPublicKey));

      return false;
    }

    return true;
  }

  logout(): void {
    this.removeAuthTokenFromLocalStorage();
    if (!this.isExternalPoolPublicKey) {
      this.removePoolPublicKeyFromLocalStorage();
      this.clearStats();
    }
    this.toastService.showSuccessToast(this.snippetService.getSnippet('account-service.logout.success'));
  }

  clearStats(): void {
    this.poolPublicKey = null;
    this.account = null;
    this.accountHistoricalStats.next([]);
  }

  removePoolPublicKeyFromLocalStorage(): void {
    this.localStorageService.removeItem(AccountService.poolPublicKeyStorageKey);
  }

  setPoolPublicKeyInLocalStorage(poolPublicKey: string): void {
    this.localStorageService.setItem(AccountService.poolPublicKeyStorageKey, poolPublicKey);
  }

  setAuthTokenInLocalStorage(authToken: string): void {
    this.localStorageService.setItem(AccountService.authTokenStorageKey(this.poolPublicKey), authToken);
  }

  removeAuthTokenFromLocalStorage(): void {
    this.localStorageService.removeItem(AccountService.authTokenStorageKey(this.poolPublicKey));
  }

  get havePoolPublicKey(): boolean {
    return !!this.poolPublicKey;
  }

  get haveAccount(): boolean {
    return this.account !== null;
  }

  get haveAuthToken(): boolean {
    return !!this.authToken;
  }

  get isAuthenticated(): boolean {
    return this.havePoolPublicKey && this.haveAuthToken;
  }

  get isExternalPoolPublicKey(): boolean {
    return this.poolPublicKey !== this.poolPublicKeyFromLocalStorage;
  }

  async updateAccount() {
    this.account = await this.getAccount({ poolPublicKey: this.poolPublicKey });
    if (!this.haveAccount) {
      if (this.isMyFarmerPage) {
        this.removeAuthTokenFromLocalStorage();
        this.removePoolPublicKeyFromLocalStorage();
      }
      this.accountHistoricalStats.next([]);
      this.toastService.showErrorToast(this.snippetService.getSnippet('account-service.login.error.invalid-farmer', this.poolPublicKey));
    }
  }

  async updateAccountHistoricalStats() {
    this.accountHistoricalStats.next(await this.getAccountHistoricalStats({ poolPublicKey: this.poolPublicKey }));
  }

  async getAccount({ poolPublicKey }) {
    this.isLoading = true;
    let account = null;
    try {
      account = await this.statsService.getAccount({ poolPublicKey });
      if (account) {
        this.patchAccount(account);
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        account = null;
      } else {
        throw err;
      }
    } finally {
      this.isLoading = false;
    }

    return account;
  }

  async getAccountHistoricalStats({ poolPublicKey }) {
    this.isLoading = true;
    let accountHistoricalStats = [];
    try {
      accountHistoricalStats = await this.statsService.getAccountHistoricalStats({ poolPublicKey });
    } finally {
      this.isLoading = false;
    }

    return accountHistoricalStats;
  }

  patchAccount(account): void {
    account.pendingBN = new BigNumber(account.pending);
    account.pendingRounded = account.pendingBN.decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber();
    if (account.collateral) {
      account.collateralBN = new BigNumber(account.collateral);
      account.collateralRounded = account.collateralBN.decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber();
    }
  }

  async authenticate({ signature, message }) {
    if (!this.havePoolPublicKey) {
      return;
    }
    this.isAuthenticating = true;
    try {
      const { accessToken } = await this.statsService.authenticate({
        poolPublicKey: this.poolPublicKey,
        signature,
        message,
      });
      this.setAuthTokenInLocalStorage(accessToken);
    } finally {
      this.isAuthenticating = false;
    }
  }

  async updateName({ newName }) {
    if (!this.isAuthenticated) {
      return;
    }
    this.isUpdatingAccount = true;
    try {
      await this.statsService.updateAccountName({
        poolPublicKey: this.poolPublicKey,
        authToken: this.authToken,
        newName,
      });
      await this.updateAccount();
    } finally {
      this.isUpdatingAccount = false;
    }
  }

  async leavePool({ leaveForEver }) {
    if (!this.isAuthenticated) {
      return;
    }
    this.isUpdatingAccount = true;
    this.isLeavingPool = true;
    try {
      await this.statsService.leavePool({
        poolPublicKey: this.poolPublicKey,
        authToken: this.authToken,
        leaveForEver,
      });
      await this.updateAccount();
    } finally {
      this.isUpdatingAccount = false;
      this.isLeavingPool = false;
    }
  }

  async rejoinPool() {
    if (!this.isAuthenticated) {
      return;
    }
    this.isUpdatingAccount = true;
    try {
      await this.statsService.rejoinPool({
        poolPublicKey: this.poolPublicKey,
        authToken: this.authToken,
      });
      await this.updateAccount();
    } catch (err) {
      this.toastService.showErrorToast(err.message);
    } finally {
      this.isUpdatingAccount = false;
    }
  }

  async updateMinimumPayout({ newMinimumPayout }) {
    if (!this.isAuthenticated) {
      return;
    }
    this.isUpdatingAccount = true;
    try {
      await this.statsService.updateAccountMinimumPayout({
        poolPublicKey: this.poolPublicKey,
        authToken: this.authToken,
        minimumPayout: newMinimumPayout,
      });
      await this.updateAccount();
    } finally {
      this.isUpdatingAccount = false;
    }
  }

  private migrateLegacyConfig() {
    const legacyAuthToken = this.localStorageService.getItem('authToken');
    if (legacyAuthToken) {
      this.localStorageService.setItem(AccountService.authTokenStorageKey(this.poolPublicKeyFromLocalStorage), legacyAuthToken);
      this.localStorageService.removeItem('authToken');
    }
  }
}
