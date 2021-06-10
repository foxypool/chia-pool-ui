import {StatsService} from '../stats.service';
import {Component, OnInit} from '@angular/core';
import Capacity from '../capacity';
import {SnippetService} from '../snippet.service';
import {faHdd} from "@fortawesome/free-regular-svg-icons";

@Component({
  selector: 'app-top-accounts',
  templateUrl: './top-accounts.component.html',
  styleUrls: ['./top-accounts.component.scss']
})
export class TopAccountsComponent implements OnInit {

  private _poolConfig:any = {};
  private _poolStats:any = {};
  private _exchangeStats:any = {};

  public faHdd = faHdd;

  constructor(
    private statsService: StatsService,
    private _snippetService: SnippetService,
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

  set exchangeStats(roundStats) {
    this._exchangeStats = roundStats;
  }

  get exchangeStats() {
    return this._exchangeStats;
  }

  getFormattedCapacity(capacityInGiB) {
    if (capacityInGiB === 0) {
      return this.snippetService.getSnippet('general.not-available.short');
    }

    return (new Capacity(capacityInGiB)).toString();
  }

  get topAccounts() {
    return this.poolStats.topAccounts || [];
  }
}
