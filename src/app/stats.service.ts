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

  private poolConfig = new BehaviorSubject<any>({});
  private poolStats = new BehaviorSubject<any>({});
  private exchangeStats = new BehaviorSubject<any>({});

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
  }

  async onConnected() {
    await this.initStats();
  }

  get poolIdentifier() {
    return this.poolsProvider.poolIdentifier;
  }

  async initStats() {
    await this.subscribeToPools();
    this.websocketService.publish('init', this.poolIdentifier, ({ poolConfig, poolStats, exchangeStats }) => {
      this.onNewPoolConfig(poolConfig);
      this.onNewPoolStats(poolStats);
      this.onNewExchangeStats(exchangeStats);
    });
  }

  subscribeToPools() {
    return new Promise(resolve => this.websocketService.publish('subscribe', [this.poolIdentifier], resolve));
  }

  get poolConfigSubject() {
    return this.poolConfig;
  }

  get poolStatsSubject() {
    return this.poolStats;
  }

  get exchangeStatsSubject() {
    return this.exchangeStats;
  }

  onNewPoolConfig(poolConfig) {
    this.poolConfig.next(poolConfig);
  }

  onNewPoolStats(poolStats) {
    if (poolStats.topAccounts) {
      poolStats.topAccounts.forEach(account => {
        account.pendingRounded = (new BigNumber(account.pending)).decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber();
        if (account.collateral) {
          account.collateralRounded = (new BigNumber(account.collateral)).decimalPlaces(12, BigNumber.ROUND_FLOOR).toNumber();
        }
      });
    }
    this.poolStats.next(poolStats);
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
