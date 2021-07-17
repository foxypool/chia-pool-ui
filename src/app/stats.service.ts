import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {PoolsProvider} from "./pools.provider";
import {BigNumber} from "bignumber.js";
import {SnippetService} from './snippet.service';
import {configForCoin} from './coin-config';
import {ApiService} from './api.service';

@Injectable({
  providedIn: 'root'
})
export class StatsService {

  public poolConfig = new BehaviorSubject<any>({});
  public coinConfig = configForCoin('CHIA');
  public poolStats = new BehaviorSubject<any>({});
  public accountStats = new BehaviorSubject<any>({});
  public rewardStats = new BehaviorSubject<any>({});
  public lastPayouts = new BehaviorSubject<any>(null);
  public exchangeStats = new BehaviorSubject<any>({});

  private apiService: ApiService;

  constructor(
    private poolsProvider: PoolsProvider,
    private snippetService: SnippetService,
  ) {
    this.init();
  }

  init() {
    this.apiService = new ApiService(this.poolsProvider.apiUrl);
    this.initStats();
    setInterval(this.updatePoolConfig.bind(this), 60 * 60 * 1000);
    setInterval(this.updatePoolStats.bind(this), 31 * 1000);
    setInterval(this.updateAccountsStats.bind(this), 61 * 1000);
    setInterval(this.updateRewardStats.bind(this), 61 * 1000);
    setInterval(this.updateLastPayouts.bind(this), 5 * 61 * 1000);
    setInterval(this.updateExchangeStats.bind(this), 5 * 61 * 1000);
  }

  get poolIdentifier() {
    return this.poolsProvider.poolIdentifier;
  }

  async initStats() {
   await Promise.all([
      this.updatePoolConfig(),
      this.updatePoolStats(),
      this.updateAccountsStats(),
      this.updateRewardStats(),
      this.updateLastPayouts(),
      this.updateExchangeStats(),
    ]);
  }

  async updatePoolConfig() {
    this.onNewPoolConfig(await this.apiService.getPoolConfig({ poolIdentifier: this.poolIdentifier }));
  }

  async updatePoolStats() {
    this.onNewPoolStats(await this.apiService.getPoolStats({ poolIdentifier: this.poolIdentifier }));
  }

  async updateAccountsStats() {
    this.onNewAccountsStats(await this.apiService.getAccountsStats({ poolIdentifier: this.poolIdentifier }));
  }

  async updateRewardStats() {
    this.onNewRewardStats(await this.apiService.getRewardStats({ poolIdentifier: this.poolIdentifier }));
  }

  async updateLastPayouts() {
    this.onNewLastPayouts(await this.apiService.getLastPayouts({ poolIdentifier: this.poolIdentifier }));
  }

  async updateExchangeStats() {
    this.onNewExchangeStats(await this.apiService.getExchangeStats({ poolIdentifier: this.poolIdentifier }));
  }

  onNewPoolConfig(poolConfig) {
    this.poolConfig.next(poolConfig);
    this.coinConfig = configForCoin(poolConfig.coin);
  }

  onNewPoolStats(poolStats) {
    this.poolStats.next(poolStats);
  }

  onNewAccountsStats(accountStats) {
    if (accountStats.topAccounts) {
      accountStats.topAccounts.forEach(account => {
        account.pendingRounded = (new BigNumber(account.pending)).decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber();
        if (account.collateral) {
          account.collateralRounded = (new BigNumber(account.collateral)).decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber();
        }
      });
    }
    this.accountStats.next(accountStats);
  }

  onNewRewardStats(rewardStats) {
    this.rewardStats.next(rewardStats);
  }

  onNewLastPayouts(lastPayouts) {
    this.lastPayouts.next(lastPayouts);
  }

  onNewExchangeStats(exchangeStats) {
    this.exchangeStats.next(exchangeStats);
  }

  getAccount({ poolPublicKey}) {
    return this.apiService.getAccount({ poolIdentifier: this.poolIdentifier, poolPublicKey });
  }

  authenticate({ poolPublicKey, message, signature }): any {
    return this.requestWithError(this.apiService.authenticateAccount({ poolIdentifier: this.poolIdentifier, poolPublicKey, message, signature }));
  }

  async updateAccountName({ poolPublicKey, authToken, newName }) {
    return this.requestWithError(this.apiService.updateAccountName({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken, newName }));
  }

  updateAccountDistributionRatio({ poolPublicKey, authToken, newDistributionRatio }) {
    return this.requestWithError(this.apiService.updateAccountDistributionRatio({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken, newDistributionRatio }));
  }

  updateAccountMinimumPayout({ poolPublicKey, authToken, minimumPayout }) {
    return this.requestWithError(this.apiService.updateAccountMinimumPayout({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken, minimumPayout }));
  }

  leavePool({ poolPublicKey, authToken, leaveForEver }) {
    return this.requestWithError(this.apiService.leavePool({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken, leaveForEver }));
  }

  rejoinPool({ poolPublicKey, authToken }) {
    return this.requestWithError(this.apiService.rejoinPool({ poolIdentifier: this.poolIdentifier, poolPublicKey, authToken }));
  }

  async requestWithError(requestPromise) {
    const result:any = await requestPromise;
    if (result && result.error) {
      throw new Error(this.snippetService.getSnippet(`api.error.${result.error}`));
    }

    return result;
  }
}
