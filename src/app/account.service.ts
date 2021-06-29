import { Injectable } from '@angular/core';

import {StatsService} from "./stats.service";
import {PoolsProvider} from "./pools.provider";
import {LocalStorageService} from './local-storage.service';
import {ToastService} from './toast.service';
import {BigNumber} from 'bignumber.js';
import {SnippetService} from './snippet.service';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  public static poolPublicKeyStorageKey = 'poolPublicKey';
  public static authTokenStorageKey = 'authToken';

  public account = null;
  public isLoading = false;
  public isAuthenticating = false;
  public isUpdatingAccount = false;
  public isLeavingPool = false;

  constructor(
    private statsService: StatsService,
    private poolsProvider: PoolsProvider,
    private localStorageService: LocalStorageService,
    private toastService: ToastService,
    private snippetService: SnippetService,
  ) {}

  async login({ poolPublicKey }) {
    poolPublicKey = poolPublicKey.trim();
    if (!poolPublicKey.startsWith('0x')) {
      poolPublicKey = `0x${poolPublicKey}`;
    }
    const account = await this.getAccount({ poolPublicKey });
    if (account === null) {
      this.toastService.showErrorToast(this.snippetService.getSnippet('account-service.login.error.invalid-farmer', poolPublicKey));
      return false;
    }
    this.localStorageService.setItem(AccountService.poolPublicKeyStorageKey, poolPublicKey);
    await this.updateAccount();
    this.toastService.showSuccessToast(this.snippetService.getSnippet('account-service.login.success'));

    return true;
  }

  logout() {
    this.removePoolPublicKey();
    this.removeAuthToken();
    this.account = null;
    this.toastService.showSuccessToast(this.snippetService.getSnippet('account-service.logout.success'));
  }

  get poolPublicKey() {
    return this.localStorageService.getItem(AccountService.poolPublicKeyStorageKey);
  }

  removePoolPublicKey() {
    this.localStorageService.removeItem(AccountService.poolPublicKeyStorageKey);
  }

  get havePoolPublicKey() {
    return !!this.poolPublicKey;
  }

  get haveAccount() {
    return this.account !== null;
  }

  async updateAccount() {
    this.account = await this.getAccount({ poolPublicKey: this.poolPublicKey });
    if (!this.haveAccount) {
      this.removePoolPublicKey();
      this.removeAuthToken();
    }
  }

  async getAccount({ poolPublicKey }) {
    this.isLoading = true;
    let account = null;
    try {
      account = await this.statsService.request({ event: 'account:fetch', data: { poolPublicKey } });
      if (account) {
        this.patchAccount(account);
      }
    } finally {
      this.isLoading = false;
    }

    return account;
  }

  patchAccount(account) {
    account.pendingRounded = (new BigNumber(account.pending)).decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber();
    if (account.collateral) {
      account.collateralRounded = (new BigNumber(account.collateral)).decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber();
    }
  }

  get authToken() {
    return this.localStorageService.getItem(AccountService.authTokenStorageKey);
  }

  get haveAuthToken() {
    return !!this.authToken;
  }

  removeAuthToken() {
    this.localStorageService.removeItem(AccountService.authTokenStorageKey);
  }

  async authenticate({ signature, message }) {
    if (!this.havePoolPublicKey) {
      return;
    }
    this.isAuthenticating = true;
    try {
      const { accessToken } = await this.statsService.requestWithError({
        event: 'authenticate',
        data: {
          poolPublicKey: this.poolPublicKey,
          signature,
          message,
        },
      });
      this.localStorageService.setItem(AccountService.authTokenStorageKey, accessToken);
    } finally {
      this.isAuthenticating = false;
    }
  }

  async updateName({ newName }) {
    if (!this.haveAuthToken) {
      return;
    }
    this.isUpdatingAccount = true;
    try {
      await this.statsService.requestWithError({
        event: 'account:update:name',
        data: {
          authToken: this.authToken,
          newName,
        },
      });
      await this.updateAccount();
    } finally {
      this.isUpdatingAccount = false;
    }
  }

  async leavePool({ leaveForEver }) {
    if (!this.haveAuthToken) {
      return;
    }
    this.isUpdatingAccount = true;
    this.isLeavingPool = true;
    try {
      await this.statsService.requestWithError({
        event: 'account:update:leave-pool',
        data: {
          authToken: this.authToken,
          leaveForEver,
        },
      });
      await this.updateAccount();
    } finally {
      this.isUpdatingAccount = false;
      this.isLeavingPool = false;
    }
  }

  async rejoinPool() {
    if (!this.haveAuthToken) {
      return;
    }
    this.isUpdatingAccount = true;
    try {
      await this.statsService.requestWithError({
        event: 'account:update:rejoin-pool',
        data: {
          authToken: this.authToken,
        },
      });
      await this.updateAccount();
    } catch (err) {
      this.toastService.showErrorToast(err.message);
    } finally {
      this.isUpdatingAccount = false;
    }
  }
}
