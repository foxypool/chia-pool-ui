import {Component, OnDestroy, OnInit} from '@angular/core';
import {StatsService} from '../stats.service';
import {SnippetService} from '../snippet.service';
import {PoolsProvider} from '../pools.provider';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnDestroy {

  private _poolConfig:any = {};

  private subscriptions: Subscription[] = [
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig)),
  ];

  constructor(
    public statsService: StatsService,
    private _snippetService: SnippetService,
    private poolsProvider: PoolsProvider,
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
