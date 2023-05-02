import {Component, OnDestroy} from '@angular/core'
import {StatsService} from '../stats.service'
import {SnippetService} from '../snippet.service'
import {PoolsProvider} from '../pools.provider'
import {AccountService} from '../account.service'
import {RatesService} from '../rates.service'
import {Router} from '@angular/router'
import {faSearch} from '@fortawesome/free-solid-svg-icons'
import {Subscription} from 'rxjs'

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnDestroy {

  private _poolConfig:any = {}
  private _poolStats:any = {}

  public isMenuCollapsed = true
  public accountSearchInput = ''
  public searchIcon = faSearch

  private readonly subscriptions: Subscription[] = [
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig)),
    this.statsService.poolStats.asObservable().subscribe((poolStats => this.poolStats = poolStats)),
  ]

  constructor(
    public accountService: AccountService,
    private readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
    private readonly poolsProvider: PoolsProvider,
    public ratesService: RatesService,
    private readonly router: Router,
  ) {}

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
  }

  get showLogoutButton(): boolean {
    if (!this.accountService.isMyFarmerPage) {
      return this.accountService.isAuthenticated
    }

    return this.accountService.havePoolPublicKey
  }

  toggleMenuCollapse() {
    this.isMenuCollapsed = !this.isMenuCollapsed
  }

  get snippetService(): SnippetService {
    return this._snippetService
  }

  async search() {
    this.accountSearchInput = this.accountSearchInput.trim()
    if (!this.accountSearchInput) {
      return
    }
    if (await this.accountService.doesAccountExist({ poolPublicKey: this.accountSearchInput })) {
      await this.router.navigate([`/farmer/${this.accountSearchInput}`])
      this.accountSearchInput = ''
    }
  }

  onTabButtonClick() {
    this.isMenuCollapsed = true
  }

  set poolConfig(poolConfig) {
    this._poolConfig = poolConfig
  }

  get poolConfig() {
    return this._poolConfig || {}
  }

  get poolStats() {
    return this._poolStats
  }

  set poolStats(value: any) {
    this._poolStats = value
  }

  get poolTitle() {
    if (this.poolConfig.poolName) {
      return this.poolConfig.poolName
    }
    if (!this.poolConfig.coin) {
      return 'Foxy-Pool'
    }

    return `Foxy-Pool ${this.poolConfig.coin}`
  }

  get poolUrl() {
    if (!this.poolConfig.poolUrl) {
      return ''
    }

    return this.poolConfig.poolUrl
  }

  get otherPools() {
    if (!this.poolUrl) {
      return []
    }

    return this.poolsProvider.pools.filter(pool => pool.url !== this.poolUrl)
  }

  getPool(index) {
    if (index < 0 || index >= this.otherPools.length) {
      return null
    }

    return this.otherPools[index]
  }
}
