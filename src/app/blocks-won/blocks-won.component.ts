import {Component, Input, OnInit} from '@angular/core';
import {StatsService} from '../stats.service';
import * as moment from 'moment';
import Capacity from '../capacity';
import {SnippetService} from '../snippet.service';
import {SettingsService} from "../settings.service";
import {faCubes} from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: 'app-blocks-won',
  templateUrl: './blocks-won.component.html',
  styleUrls: ['./blocks-won.component.scss']
})
export class BlocksWonComponent implements OnInit {

  @Input() limit: number|null = null;
  private _poolConfig:any = {};
  private _poolStats:any = {};
  private _exchangeStats:any = {};

  public faCubes = faCubes;

  constructor(
    private statsService: StatsService,
    private _snippetService: SnippetService,
    private settingsService: SettingsService
  ) {}

  get snippetService(): SnippetService {
    return this._snippetService;
  }

  ngOnInit() {
    this.statsService.poolConfigSubject.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig));
    this.statsService.poolStatsSubject.asObservable().subscribe((poolStats => this.poolStats = poolStats));
    this.statsService.exchangeStatsSubject.asObservable().subscribe((exchangeStats => this.exchangeStats = exchangeStats));
    this.poolConfig = this.statsService.poolConfigSubject.getValue();
    this.poolStats = this.statsService.poolStatsSubject.getValue();
    this.exchangeStats = this.statsService.exchangeStatsSubject.getValue();
  }

  get dr() {
    return this.settingsService.dr;
  }

  set dr(dr) {
    this.settingsService.dr = dr;
  }

  get distributionRatios() {
    if (!this.poolStats || !this.poolStats.distributionRatios) {
      return [];
    }

    return this.poolStats.distributionRatios;
  }

  get distributionRatiosWithNull() {
    return [null].concat(this.distributionRatios);
  }

  get distributionRatiosLength() {
    return this.distributionRatios.length;
  }

  set exchangeStats(value: any) {
    this._exchangeStats = value;
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

  get blocksWonLastDay() {
    let blocksWonLastDay = this.blocksWonLastDayUnfiltered;

    if (!this.limit) {
      return blocksWonLastDay;
    }

    return blocksWonLastDay.slice(0, this.limit);
  }

  get blocksWonLastDayUnfiltered() {
    if (!this._poolStats.blocksWonLastDay) {
      return [];
    }

    let blocksWonLastDay = this._poolStats.blocksWonLastDay;
    if (this.dr && this.distributionRatiosLength > 1) {
      blocksWonLastDay = blocksWonLastDay.filter(wonBlock => wonBlock.distributionRatio === this.dr);
    }

    return blocksWonLastDay;
  }

  getBlockDate(block) {
    return moment(block.createdAt).format('YYYY-MM-DD HH:mm');
  }

  getFormattedCapacityFromTiB(capacityInTiB) {
    return Capacity.fromTiB(capacityInTiB).toString();
  }

  getRoundsWonLast24H() {
    return this.blocksWonLastDayUnfiltered.length;
  }

  getBlockExplorerBlockLink(block) {
    return this.poolConfig.blockExplorerBlockUrlTemplate.replace('#BLOCK#', block.height).replace('#HASH#', block.hash);
  }

  getBlockConfirms(block) {
    if (!this.poolStats.height) {
      return 0;
    }

    return Math.min(Math.max(this.poolStats.height - block.height - 1, 0), this.poolConfig.blockRewardDistributionDelay);
  }

  getBlockProgress(round) {
    const confirms = this.getBlockConfirms(round);

    return (confirms / this.poolConfig.blockRewardDistributionDelay) * 100;
  }

  getBlockProgressType(block) {
    const blockProgress = this.getBlockProgress(block);

    if (blockProgress >= 66) {
      return 'success';
    }
    if (blockProgress >= 33) {
      return 'primary';
    }

    return 'secondary';
  }
}
