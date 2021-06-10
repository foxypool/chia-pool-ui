import { Component, OnInit } from '@angular/core';
import {StatsService} from '../stats.service';
import {SnippetService} from '../snippet.service';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit {

  private _poolConfig:any = {};

  constructor(
    private statsService: StatsService,
    private _snippetService: SnippetService
  ) {}

  get snippetService(): SnippetService {
    return this._snippetService;
  }

  ngOnInit() {
    this.statsService.poolConfigSubject.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig));
    this.poolConfig = this.statsService.poolConfigSubject.getValue();
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
}
