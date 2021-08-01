import {Component, Input, OnInit} from '@angular/core';
import {StatsService} from '../stats.service';
import * as moment from 'moment';
import Capacity from '../capacity';
import {SnippetService} from '../snippet.service';
import {faCubes} from "@fortawesome/free-solid-svg-icons";
import {LocalStorageService} from '../local-storage.service';

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
  public rewardStats:any = {};

  public faCubes = faCubes;
  public page = 1;
  public pageSize = 25;

  constructor(
    private statsService: StatsService,
    private _snippetService: SnippetService,
  ) {}

  get snippetService(): SnippetService {
    return this._snippetService;
  }

  ngOnInit() {
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig));
    this.statsService.poolStats.asObservable().subscribe((poolStats => this.poolStats = poolStats));
    this.statsService.rewardStats.asObservable().subscribe((rewardStats => this.rewardStats = rewardStats));
    this.statsService.exchangeStats.asObservable().subscribe((exchangeStats => this.exchangeStats = exchangeStats));
    this.poolConfig = this.statsService.poolConfig.getValue();
    this.poolStats = this.statsService.poolStats.getValue();
    this.rewardStats = this.statsService.rewardStats.getValue();
    this.exchangeStats = this.statsService.exchangeStats.getValue();
  }

  get dr() {
    return null;
  }

  set dr(dr) {}

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

  get recentlyWonBlocks() {
    let recentlyWonBlocks = this.recentlyWonBlocksUnfiltered;

    if (!this.limit) {
      return recentlyWonBlocks;
    }

    return recentlyWonBlocks.slice(0, this.limit);
  }

  get recentlyWonBlocksUnfiltered() {
    if (!this.rewardStats.recentlyWonBlocks) {
      return [];
    }

    let recentlyWonBlocks = this.rewardStats.recentlyWonBlocks;
    if (this.dr && this.distributionRatiosLength > 1) {
      recentlyWonBlocks = recentlyWonBlocks.filter(wonBlock => wonBlock.distributionRatio === this.dr);
    }

    return recentlyWonBlocks;
  }

  getBlockDate(block) {
    return moment(block.createdAt).format('YYYY-MM-DD HH:mm');
  }

  getFormattedCapacityFromTiB(capacityInTiB) {
    return Capacity.fromTiB(capacityInTiB).toString();
  }

  getBlocksWonLast24H() {
    return this.recentlyWonBlocksUnfiltered
      .filter(wonBlock => moment(wonBlock.createdAt).isAfter(moment().subtract(1, 'day')))
      .length;
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

  getBlockDistributedLabel(block) {
    if (block.distributed) {
      return this.snippetService.getSnippet('blocks-won-component.distributed');
    }
    if (block.isRewardClaimed) {
      return this.snippetService.getSnippet('blocks-won-component.pending');
    }

    return this.snippetService.getSnippet('blocks-won-component.unclaimed');
  }

  trackBy(index, block) {
    return block.hash;
  }
}
