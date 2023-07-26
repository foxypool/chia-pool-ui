import {Component} from '@angular/core'
import {StatsService} from '../stats.service'
import {SnippetService} from '../snippet.service'
import {PoolsProvider} from '../pools.provider'
import {AccountService} from '../account.service'
import {RatesService} from '../rates.service'
import {Router} from '@angular/router'
import {faSearch} from '@fortawesome/free-solid-svg-icons'
import {makeAccountIdentifierName} from '../util'

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  public isMenuCollapsed = true
  public accountSearchInput = ''
  public searchIcon = faSearch
  public readonly accountSearchInputPlaceholder: string = makeAccountIdentifierName(this.poolsProvider.pool.type)

  constructor(
    public accountService: AccountService,
    public readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
    private readonly poolsProvider: PoolsProvider,
    public ratesService: RatesService,
    private readonly router: Router,
  ) {}

  public isLinkActive(url: string): boolean {
    const queryParamsIndex = this.router.url.indexOf('?')
    const baseUrl = queryParamsIndex === -1 ? this.router.url : this.router.url.slice(0, queryParamsIndex)

    return baseUrl === url
  }

  get showLogoutButton(): boolean {
    if (!this.accountService.isMyFarmerPage) {
      return this.accountService.isAuthenticated
    }

    return this.accountService.haveAccountIdentifier
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
    if (await this.accountService.doesAccountExist({ accountIdentifier: this.accountSearchInput })) {
      await this.router.navigate([`/farmer/${this.accountSearchInput}`])
      this.accountSearchInput = ''
    }
  }

  onTabButtonClick() {
    this.isMenuCollapsed = true
  }

  public get poolTitle(): string {
    if (this.statsService.poolConfig?.poolName) {
      return this.statsService.poolConfig.poolName
    }
    if (this.statsService.poolConfig?.coin) {
      return `Foxy-Pool ${this.statsService.poolConfig.coin}`
    }

    return 'Foxy-Pool'
  }

  get poolUrl() {
    if (!this.statsService.poolConfig?.poolUrl) {
      return ''
    }

    return this.statsService.poolConfig.poolUrl
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
