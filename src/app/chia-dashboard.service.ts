import {Injectable, OnDestroy} from '@angular/core'
import {
  ChiaDashboardApi,
  getBestChiaDashboardApiBaseUrl
} from './integrations/chia-dashboard-api/api'
import {AccountService} from './account.service'
import {combineLatest, distinctUntilChanged, map, BehaviorSubject, Observable, Subscription} from 'rxjs'
import {Satellite} from './integrations/chia-dashboard-api/types/satellite'
import {TtlCache} from './ttl-cache'

@Injectable({
  providedIn: 'root'
})
export class ChiaDashboardService implements OnDestroy {
  public get satellites(): Satellite[]|undefined {
    return this.satellitesSubject.getValue()
  }

  public readonly isInitialLoading$: Observable<boolean>
  public readonly satellites$: Observable<Satellite[]|undefined>
  private readonly satellitesSubject: BehaviorSubject<Satellite[]|undefined> = new BehaviorSubject<Satellite[]|undefined>(undefined)
  private readonly isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)

  private readonly cache: TtlCache = new TtlCache(60)
  private api?: ChiaDashboardApi
  private bestBaseUrl?: string
  private updateSatellitesInterval?: ReturnType<typeof setInterval>

  private readonly subscriptions: Subscription[] = [
    this.accountService.accountSubject
      .pipe(
        map(account => account?.integrations?.chiaDashboardShareKey),
        distinctUntilChanged(),
      )
      .subscribe(this.updateApi.bind(this)),
  ]

  public constructor(private readonly accountService: AccountService) {
    this.satellites$ = this.satellitesSubject.pipe(distinctUntilChanged())
    this.isInitialLoading$ = combineLatest([
      this.isLoadingSubject.pipe(distinctUntilChanged()),
      this.satellitesSubject.pipe(distinctUntilChanged()),
    ]).pipe(map(([isLoading, satellites]) => isLoading && satellites === undefined))
    this.updateSatellitesInterval = setInterval(this.updateSatellites.bind(this), 60 * 1000)
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
    if (this.updateSatellitesInterval !== undefined) {
      clearInterval(this.updateSatellitesInterval)
      this.updateSatellitesInterval = undefined
    }
  }

  private async updateApi(shareKey?: string) {
    if (shareKey === undefined) {
      this.api = undefined
      void this.updateSatellites()

      return
    }
    this.isLoadingSubject.next(true)
    const baseUrl = this.bestBaseUrl ?? await getBestChiaDashboardApiBaseUrl()
    this.isLoadingSubject.next(false)
    if (baseUrl === undefined) {
      this.api = undefined
      void this.updateSatellites()

      return
    }
    this.bestBaseUrl = baseUrl
    this.api = new ChiaDashboardApi(baseUrl, shareKey)
    await this.updateSatellites()
  }

  private async updateSatellites() {
    if (this.api === undefined) {
      this.satellitesSubject.next(undefined)

      return
    }

    const cacheKey = `${this.api.shareKey}:satellites`
    const cachedSatellites = this.cache.get<Satellite[]>(cacheKey)
    if (cachedSatellites !== undefined) {
      this.satellitesSubject.next(cachedSatellites)

      return
    }

    this.isLoadingSubject.next(true)
    try {
      this.satellitesSubject.next(await this.api.getSatellites())
    } finally {
      this.isLoadingSubject.next(false)
    }
    this.cache.set(cacheKey, this.satellites)
  }
}
