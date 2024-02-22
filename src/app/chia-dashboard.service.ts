import {Injectable, OnDestroy} from '@angular/core'
import {
  ChiaDashboardApi,
} from './integrations/chia-dashboard-api/api'
import {AccountService} from './account.service'
import {combineLatest, distinctUntilChanged, map, BehaviorSubject, Observable, Subscription} from 'rxjs'
import {Satellite} from './integrations/chia-dashboard-api/types/satellite'
import {TtlCache} from './ttl-cache'
import {sleep} from './util'
import {tap} from 'rxjs/operators'

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

  private readonly cache: TtlCache = new TtlCache(1.5 * 60)
  private readonly api: ChiaDashboardApi = new ChiaDashboardApi()
  private updateSatellitesInterval?: ReturnType<typeof setInterval>
  private retryCounter: number = 0

  private readonly subscriptions: Subscription[] = [
    this.accountService.accountSubject
      .pipe(
        map(account => account?.integrations?.chiaDashboardShareKey),
        distinctUntilChanged(),
        tap(shareKey => this.api.shareKey = shareKey),
      )
      .subscribe(this.updateSatellites.bind(this)),
  ]

  public constructor(private readonly accountService: AccountService) {
    this.satellites$ = this.satellitesSubject.pipe(distinctUntilChanged())
    this.isInitialLoading$ = combineLatest([
      this.isLoadingSubject.pipe(distinctUntilChanged()),
      this.satellitesSubject.pipe(distinctUntilChanged()),
    ]).pipe(map(([isLoading, satellites]) => isLoading && satellites === undefined))
    this.updateSatellitesInterval = setInterval(this.updateSatellites.bind(this),  1.5 * 60 * 1000)
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
    if (this.updateSatellitesInterval !== undefined) {
      clearInterval(this.updateSatellitesInterval)
      this.updateSatellitesInterval = undefined
    }
  }

  private async updateSatellites() {
    if (this.api.shareKey === undefined) {
      this.satellitesSubject.next(undefined)

      return
    }

    const cacheKey = `${this.api.shareKey}:satellites`
    const cachedSatellites = this.cache.get<Satellite[]>(cacheKey)
    if (cachedSatellites !== undefined) {
      this.satellitesSubject.next(cachedSatellites)

      return
    }

    // Wait for next tick, so that false is available in retries
    await sleep(0)
    if (this.isLoadingSubject.getValue()) {
      return
    }

    this.isLoadingSubject.next(true)
    try {
      this.satellitesSubject.next(await this.api.getSatellites())
      this.retryCounter = 0
    } catch (err) {
      if (this.retryCounter > 3) {
        return
      }
      this.retryCounter += 1
      await sleep(5 * 1000)

      return this.updateSatellites()
    } finally {
      this.isLoadingSubject.next(false)
    }
    this.cache.set(cacheKey, this.satellites)
  }
}
