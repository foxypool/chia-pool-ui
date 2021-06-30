import { Component, OnInit } from '@angular/core';
import {StatsService} from '../stats.service';
import {SnippetService} from '../snippet.service';
import {PoolsProvider} from '../pools.provider';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit {

  private _poolConfig:any = {};

  constructor(
    public statsService: StatsService,
    private _snippetService: SnippetService,
    private poolsProvider: PoolsProvider,
  ) {}

  get snippetService(): SnippetService {
    return this._snippetService;
  }

  ngOnInit() {
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig));
    this.poolConfig = this.statsService.poolConfig.getValue();
  }

  set poolConfig(poolConfig) {
    this._poolConfig = poolConfig;
  }

  get poolConfig() {
    return this._poolConfig;
  }

  get poolRatioString() {
    if (this.poolConfig.defaultDistributionRatio === undefined) {
      return '0-100';
    }

    return this.poolConfig.defaultDistributionRatio;
  }

  get historicalTimeInHours() {
    if (!this.poolConfig.historicalTimeInMinutes) {
      return 'N/A';
    }
    return Math.round(this.poolConfig.historicalTimeInMinutes / 60);
  }

  get docsGettingStartedUrl() {
    return `https://docs.foxypool.io/proof-of-spacetime/foxy-pool/pools/${this.poolsProvider.poolIdentifier}/getting-started/`;
  }
}
