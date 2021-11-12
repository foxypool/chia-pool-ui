import { Component, OnInit } from '@angular/core';
import {StatsService} from '../stats.service';
import {SnippetService} from '../snippet.service';
import {PoolsProvider} from '../pools.provider';
import {AccountService} from '../account.service';
import {RatesService} from '../rates.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {

  private _poolConfig:any = {};
  private _poolStats:any = {};

  public isMenuCollapsed = true;

  constructor(
    public accountService: AccountService,
    private statsService: StatsService,
    private _snippetService: SnippetService,
    private poolsProvider: PoolsProvider,
    public ratesService: RatesService,
  ) {}

  get showLogoutButton(): boolean {
    if (!this.accountService.isMyFarmerPage) {
      return this.accountService.isAuthenticated;
    }

    return this.accountService.havePoolPublicKey;
  }

  toggleMenuCollapse() {
    this.isMenuCollapsed = !this.isMenuCollapsed;
  }

  get snippetService(): SnippetService {
    return this._snippetService;
  }

  ngOnInit() {
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig));
    this.statsService.poolStats.asObservable().subscribe((poolStats => this.poolStats = poolStats));
    this.poolConfig = this.statsService.poolConfig.getValue();
    this.poolStats = this.statsService.poolStats.getValue();
  }

  onTabButtonClick() {
    this.isMenuCollapsed = true
  }

  set poolConfig(poolConfig) {
    this._poolConfig = poolConfig;
  }

  get poolConfig() {
    return this._poolConfig || {};
  }

  get poolStats() {
    return this._poolStats;
  }

  set poolStats(value: any) {
    this._poolStats = value;
  }

  get poolTitle() {
    if (this.poolConfig.poolName) {
      return this.poolConfig.poolName;
    }
    if (!this.poolConfig.coin) {
      return 'Foxy-Pool';
    }

    return `Foxy-Pool ${this.poolConfig.coin}`;
  }

  get poolUrl() {
    if (!this.poolConfig.poolUrl) {
      return '';
    }

    return this.poolConfig.poolUrl;
  }

  get otherPools() {
    if (!this.poolUrl) {
      return [];
    }

    return this.poolsProvider.pools.filter(pool => pool.url !== this.poolUrl);
  }

  getPool(index) {
    if (index < 0 || index >= this.otherPools.length) {
      return null;
    }

    return this.otherPools[index];
  }
}
