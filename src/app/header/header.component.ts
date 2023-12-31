import {Component} from '@angular/core'
import {StatsService} from '../stats.service'
import {SnippetService} from '../snippet.service'
import {PoolsProvider} from '../pools.provider'
import {AccountService} from '../account.service'
import {RatesService} from '../rates.service'
import {ActivatedRoute, Router} from '@angular/router'
import {faCircleNotch, faMoon, faSearch} from '@fortawesome/free-solid-svg-icons'
import {makeAccountIdentifierName, unifyAccountIdentifier} from '../util'
import {MyFarmerComponent} from '../my-farmer/my-farmer.component'
import {BehaviorSubject, Observable} from 'rxjs'
import {Theme, ThemeProvider} from '../theme-provider'
import {faSun} from '@fortawesome/free-regular-svg-icons'

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  public isMenuCollapsed = true
  public accountSearchInput = ''
  public readonly accountSearchInputPlaceholder: string = makeAccountIdentifierName(this.poolsProvider.pool.type)
  public readonly isSearchingAccount$: Observable<boolean>

  public get showJoinPoolButton(): boolean {
    return this.accountService.accountIdentifierFromLocalStorage === null
  }

  public get joinPoolUrl(): string {
    return `https://docs.foxypool.io/proof-of-spacetime/foxy-pool/pools/${this.poolsProvider.poolIdentifier}/getting-started/`
  }

  public get showMoonInThemeSwitcher(): boolean {
    return !this.isDarkTheme
  }

  public set showMoonInThemeSwitcher(showMoon: boolean) {
    this.isDarkTheme = !showMoon
  }

  public get navbarClasses(): string {
    return this.isDarkTheme ? 'navbar-dark' : 'navbar-light'
  }

  protected readonly searchIcon = faSearch
  protected readonly faCircleNotch = faCircleNotch
  protected readonly faSun = faSun
  protected readonly faMoon = faMoon

  private get isDarkTheme(): boolean {
    return this.themeProvider.isDarkTheme
  }

  private set isDarkTheme(shouldBeDarkTheme: boolean) {
    this.themeProvider.theme = shouldBeDarkTheme ? Theme.dark : Theme.light
  }

  private readonly isSearchingAccount: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)

  constructor(
    public accountService: AccountService,
    public readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
    private readonly poolsProvider: PoolsProvider,
    public ratesService: RatesService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly themeProvider: ThemeProvider,
  ) {
    this.isSearchingAccount$ = this.isSearchingAccount.asObservable()
  }

  public isLinkActive(url: string): boolean {
    const queryParamsIndex = this.router.url.indexOf('?')
    const baseUrl = queryParamsIndex === -1 ? this.router.url : this.router.url.slice(0, queryParamsIndex)

    return baseUrl === url
  }

  public get showLogoutButton(): boolean {
    if (!this.isCurrentlyOnMyFarmerPage) {
      return false
    }
    if (!this.accountService.isMyFarmerAccount) {
      return this.accountService.isAuthenticated
    }

    return this.accountService.haveAccountIdentifier || this.accountService.accountIdentifierFromLocalStorage !== null
  }

  private get isCurrentlyOnMyFarmerPage(): boolean {
    return this.route.firstChild?.component === MyFarmerComponent
  }

  toggleMenuCollapse() {
    this.isMenuCollapsed = !this.isMenuCollapsed
  }

  get snippetService(): SnippetService {
    return this._snippetService
  }

  public async search() {
    this.accountSearchInput = this.accountSearchInput.trim()
    if (!this.accountSearchInput) {
      return
    }
    const accountIdentifier = unifyAccountIdentifier(this.accountSearchInput, this.poolsProvider.pool.type)
    this.isSearchingAccount.next(true)
    try {
      const accountExists = await this.accountService.doesAccountExist({ accountIdentifier })
      if (accountExists) {
        await this.router.navigate([`/farmer/${accountIdentifier}`])
        this.accountSearchInput = ''
      }
    } finally {
      this.isSearchingAccount.next(false)
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
