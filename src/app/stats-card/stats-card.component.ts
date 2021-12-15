import {Component, OnDestroy, OnInit} from '@angular/core';
import {interval, Observable, Subscription} from 'rxjs';
import {StatsService} from '../stats.service';
import * as moment from 'moment';
import Capacity from '../capacity';
import {SnippetService} from '../snippet.service';
import {RatesService} from '../rates.service';
import BigNumber from 'bignumber.js';
import {getEffortColor} from '../util';
import {faInfoCircle} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-stats-card',
  templateUrl: './stats-card.component.html',
  styleUrls: ['./stats-card.component.scss']
})
export class StatsCardComponent implements OnDestroy {
  public faInfoCircle = faInfoCircle;

  private _poolConfig:any = {};
  private _poolStats:any = {};
  public accountStats:any = {};
  public rewardStats:any = {};

  private subscriptions: Subscription[] = [
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig)),
    this.statsService.poolStats.asObservable().subscribe((poolStats => this.poolStats = poolStats)),
    this.statsService.accountStats.asObservable().subscribe((accountStats => this.accountStats = accountStats)),
    this.statsService.rewardStats.asObservable().subscribe((rewardStats => this.rewardStats = rewardStats)),
  ];

  constructor(
    private statsService: StatsService,
    private _snippetService: SnippetService,
    public ratesService: RatesService,
  ) {}

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe());
  }

  get snippetService(): SnippetService {
    return this._snippetService;
  }

  set poolConfig(poolConfig) {
    this._poolConfig = poolConfig;
  }

  get poolConfig() {
    return this._poolConfig;
  }

  set poolStats(stats) {
    this._poolStats = stats;
  }

  get poolStats() {
    return this._poolStats;
  }

  get accountStatsLoading() {
    return this.accountStats.accountsWithShares === undefined;
  }

  get rewardStatsLoading() {
    return this.rewardStats.dailyRewardPerPiB === undefined;
  }

  get poolConfigLoading() {
    return this.poolConfig.ticker === undefined;
  }

  get poolStatsLoading() {
    return this.poolStats.networkSpaceInTiB === undefined;
  }

  getFormattedCapacityFromTiB(capacityInTiB) {
    return Capacity.fromTiB(capacityInTiB).toString();
  }

  getFormattedCapacityFromGiB(capacityInGiB) {
    return new Capacity(capacityInGiB).toString();
  }

  get dailyRewardPerPiB() {
    if (!this.rewardStats || !this.rewardStats.dailyRewardPerPiB) {
      return 0;
    }

    return this.rewardStats.dailyRewardPerPiB || 0;
  }

  get dailyRewardPerPiBFormatted() {
    return this.dailyRewardPerPiB.toFixed(2);
  }

  get networkSpaceInTiB() {
    if (!this.poolStats || !this.poolStats.networkSpaceInTiB) {
      return 0;
    }

    return this.poolStats.networkSpaceInTiB;
  }

  get currentEffort(): BigNumber | null {
    if (!this.rewardStats.recentlyWonBlocks || this.rewardStats.recentlyWonBlocks.length === 0 || !this.poolStats.networkSpaceInTiB || !this.poolStats.height || !this.accountStats.ecSum) {
      return null;
    }

    const lastWonBlockHeight = this.rewardStats.recentlyWonBlocks[0].height;
    const passedBlocks = this.poolStats.height - lastWonBlockHeight;
    const chanceToWinABlock = (new BigNumber(this.accountStats.ecSum)).dividedBy(1024).dividedBy(this.poolStats.networkSpaceInTiB);
    const blockCountFor100PercentEffort = new BigNumber(1).dividedBy(chanceToWinABlock);

    return (new BigNumber(passedBlocks)).dividedBy(blockCountFor100PercentEffort);
  }

  get currentEffortFormatted() {
    const effort = this.currentEffort;
    if (effort === null) {
      return 'N/A';
    }

    return `${effort.multipliedBy(100).toFixed(2)} %`;
  }

  get averageEffort() {
    if (this.rewardStats.averageEffort === undefined || this.rewardStats.averageEffort === null) {
      return null;
    }

    return new BigNumber(this.rewardStats.averageEffort);
  }

  get averageEffortFormatted() {
    const effort = this.averageEffort;
    if (effort === null) {
      return 'N/A';
    }

    return `${effort.multipliedBy(100).toFixed(2)} %`;
  }

  getEffortColor(effort) {
    return getEffortColor(effort);
  }
}
