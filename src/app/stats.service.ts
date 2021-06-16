import { Injectable } from '@angular/core';
import {WebsocketService} from './websocket.service';
import {BehaviorSubject} from 'rxjs';
import {PoolsProvider} from "./pools.provider";
import {BigNumber} from "bignumber.js";
import {SnippetService} from './snippet.service';

@Injectable({
  providedIn: 'root'
})
export class StatsService {

  public poolConfig = new BehaviorSubject<any>({});
  public poolStats = new BehaviorSubject<any>({});
  public accountStats = new BehaviorSubject<any>({});
  public rewardStats = new BehaviorSubject<any>({});
  public lastPayouts = new BehaviorSubject<any>(null);
  public exchangeStats = new BehaviorSubject<any>({});

  private websocketService: WebsocketService;

  constructor(
    private poolsProvider: PoolsProvider,
    private snippetService: SnippetService,
  ) {
    this.connect();
  }

  connect() {
    this.websocketService = new WebsocketService(this.poolsProvider.apiUrl);
    this.websocketService.subscribe('connect', this.onConnected.bind(this));
    this.websocketService.subscribe('pool-stats-updated', (_, poolStats) => this.onNewPoolStats(poolStats));
    this.websocketService.subscribe('exchange-stats-updated', (_, exchangeStats) => this.onNewExchangeStats(exchangeStats));
    this.websocketService.subscribe('account-stats-updated', (_, accountStats) => this.onNewAccountsStats(accountStats));
    this.websocketService.subscribe('reward-stats-updated', (_, rewardStats) => this.onNewRewardStats(rewardStats));
    this.websocketService.subscribe('last-payouts-updated', (_, lastPayouts) => this.onNewLastPayouts(lastPayouts));
  }

  async onConnected() {
    await this.initStats();
  }

  get poolIdentifier() {
    return this.poolsProvider.poolIdentifier;
  }

  async initStats() {
    await this.subscribeToPools();
    this.websocketService.publish('init', this.poolIdentifier, ({
      poolConfig,
      poolStats,
      exchangeStats,
      accountStats,
      rewardStats,
      lastPayouts,
    }) => {
      this.onNewPoolConfig(poolConfig);
      this.onNewPoolStats(poolStats);
      this.onNewAccountsStats(accountStats);
      this.onNewRewardStats(rewardStats);
      this.onNewLastPayouts(lastPayouts);
      this.onNewExchangeStats(exchangeStats);
    });
  }

  subscribeToPools() {
    return new Promise(resolve => this.websocketService.publish('subscribe', [this.poolIdentifier], resolve));
  }

  onNewPoolConfig(poolConfig) {
    this.poolConfig.next(poolConfig);
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

  getWebsocketService() {
    return this.websocketService;
  }

  async request({ event, data }) {
    return new Promise(resolve => this.websocketService.publish(event, this.poolIdentifier, data, resolve));
  }

  async requestWithError({ event, data }) {
    const result:any = await this.request({ event, data });
    if (result && result.error) {
      throw new Error(this.snippetService.getSnippet(`api.error.${result.error}`));
    }

    return result;
  }
}
