import {Component, OnDestroy} from '@angular/core'
import {BehaviorSubject, combineLatest, Observable, Subscription, takeWhile} from 'rxjs'
import {faHdd} from '@fortawesome/free-regular-svg-icons'
import {distinctUntilChanged, filter, map, shareReplay} from 'rxjs/operators'
import {StatsService} from '../stats.service'
import Capacity from '../capacity'
import * as moment from 'moment'
import {ActivatedRoute, Router} from '@angular/router'
import {OgTopAccount} from '../api/types/account/top-account'

@Component({
  selector: 'app-farmer-list',
  templateUrl: './farmer-list.component.html',
  styleUrls: ['./farmer-list.component.scss']
})
export class FarmerListComponent implements OnDestroy {
  public readonly faHdd = faHdd
  public readonly limit = 15
  public isLoading: Observable<boolean>
  public isLoadingInitial: Observable<boolean>
  public hasNoAccounts: Observable<boolean>
  public accounts: Observable<Account[]>
  public page = 1
  public total = 0

  private readonly accountsSubject: BehaviorSubject<OgTopAccount[]> = new BehaviorSubject<OgTopAccount[]>([])
  private readonly isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true)

  private readonly subscriptions: Subscription[] = [
    this.route.queryParams.subscribe(params => {
      this.page = params.page ? parseInt(params.page, 10) : this.page
      void this.updateAccounts()
    }),
  ]

  public constructor(
    private readonly statsService: StatsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.accounts = combineLatest([
      this.accountsSubject,
      this.statsService.accountStats.pipe(map(stats => stats.ecSum), filter(ecSum => ecSum !== undefined), distinctUntilChanged()),
    ])
      .pipe(
        map(([accounts, ecSum]) => {
          return accounts.map((account): Account => {
            return {
              rank: account.rank ? `#${account.rank}` : 'N/A',
              name: account.name,
              poolPublicKey: account.poolPublicKey,
              payoutAddress: account.payoutAddress,
              ecShare: ((account.ec / ecSum) * 100).toFixed(2),
              ecFormatted: (new Capacity(account.ec)).toString(),
              joinedAtDuration: moment(account.rejoinedAt ? account.rejoinedAt : account.createdAt).fromNow(),
            }
          })
        }),
        shareReplay(),
      )
    this.isLoading = this.isLoadingSubject.pipe(shareReplay())
    this.hasNoAccounts = this.accountsSubject.pipe(map(accounts => accounts.length === 0), shareReplay())
    this.isLoadingInitial = this.isLoadingSubject.pipe(takeWhile(isLoading => isLoading, true), shareReplay())
  }

  public ngOnDestroy() {
    this.subscriptions.map(subscription => subscription.unsubscribe())
  }

  public async onPageChange() {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: this.page },
      queryParamsHandling: 'merge',
    })
  }

  private async updateAccounts() {
    this.isLoadingSubject.next(true)
    try {
      const accountListResponse = await this.statsService.getAccounts({ page: this.page, limit: this.limit })
      this.total = accountListResponse.total
      this.accountsSubject.next(accountListResponse.accounts)
    } finally {
      this.isLoadingSubject.next(false)
    }
  }

  public trackBy(index: number, account: Account): string {
    return account.poolPublicKey
  }
}

interface Account {
  rank: string
  name?: string
  payoutAddress: string
  poolPublicKey: string
  ecFormatted: string
  ecShare: string
  joinedAtDuration: string
}
