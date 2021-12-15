import {StatsService} from '../stats.service';
import {Component, OnDestroy, OnInit} from '@angular/core';
import Capacity from '../capacity';
import {SnippetService} from '../snippet.service';
import {faHdd} from '@fortawesome/free-regular-svg-icons';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-top-accounts',
  templateUrl: './top-accounts.component.html',
  styleUrls: ['./top-accounts.component.scss']
})
export class TopAccountsComponent implements OnDestroy {

  private _poolConfig:any = {};
  private _poolStats:any = {};
  public accountStats:any = {};

  public faHdd = faHdd;

  private subscriptions: Subscription[] = [
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig)),
    this.statsService.poolStats.asObservable().subscribe((poolStats => this.poolStats = poolStats)),
    this.statsService.accountStats.asObservable().subscribe((accountStats => this.accountStats = accountStats)),
  ];

  constructor(
    private statsService: StatsService,
    private _snippetService: SnippetService,
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

  getFormattedCapacity(capacityInGiB) {
    if (capacityInGiB === 0) {
      return this.snippetService.getSnippet('general.not-available.short');
    }

    return (new Capacity(capacityInGiB)).toString();
  }

  get topAccounts() {
    return this.accountStats.topAccounts || [];
  }

  getEcShare(account) {
    if (!this.accountStats.ecSum) {
      return 0;
    }

    return ((account.ec / this.accountStats.ecSum) * 100).toFixed(2);
  }

  trackBy(index, account) {
    return account.payoutAddress;
  }
}
