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

  public account = null;
  public isLoading = false;

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
    return !! this.poolPublicKey;
  }

  get haveAccount() {
    return this.account !== null;
  }

  async updateAccount() {
    this.account = await this.getAccount({ poolPublicKey: this.poolPublicKey });
    if (!this.haveAccount) {
      this.removePoolPublicKey();
    }
  }

  async getAccount({ poolPublicKey }) {
    this.isLoading = true;
    let account = null;
    try {
      account = await this.statsService.request({ event: 'get-account', data: { poolPublicKey } });
      this.patchAccount(account);
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
}
