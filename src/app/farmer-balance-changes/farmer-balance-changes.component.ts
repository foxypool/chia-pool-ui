import {Component, Input, OnDestroy, OnInit} from '@angular/core'
import {BehaviorSubject, combineLatest, Observable, share, Subscription, takeWhile} from 'rxjs'
import {distinctUntilChanged, map, shareReplay, skip} from 'rxjs/operators'
import {AccountService} from '../account.service'
import {
  faBarsStaggered,
  faCoins,
  faExchangeAlt,
  faHandHoldingDollar,
  faHandshake,
  faTrophy
} from '@fortawesome/free-solid-svg-icons'
import {ConfigService} from '../config.service'
import * as moment from 'moment'
import {AccountBalanceChange, AccountBalanceChangeType} from '../api/types/account/account-balance-change'
import {FaIconComponent} from '@fortawesome/angular-fontawesome'
import {AsyncPipe, NgForOf, NgIf} from '@angular/common'
import {NgbPagination, NgbPaginationNumber, NgbTooltip} from '@ng-bootstrap/ng-bootstrap'
import {FormsModule} from '@angular/forms'
import BigNumber from 'bignumber.js'
import {StatsService} from '../stats.service'
import {CoinConfig} from '../coin-config'
import {RatesService} from '../rates.service'
import {DateFormatting, formatDate} from '../date-formatting'
import {LoadingStateComponent} from '../loading-state/loading-state.component'
import {EmptyStateComponent} from '../empty-state/empty-state.component'

@Component({
  selector: 'app-farmer-balance-changes',
  templateUrl: './farmer-balance-changes.component.html',
  standalone: true,
  imports: [
    FaIconComponent,
    AsyncPipe,
    NgForOf,
    NgIf,
    NgbPagination,
    NgbPaginationNumber,
    FormsModule,
    LoadingStateComponent,
    EmptyStateComponent,
    NgbTooltip,
  ],
  styleUrl: './farmer-balance-changes.component.scss'
})
export class FarmerBalanceChangesComponent implements OnInit, OnDestroy {
  @Input() coinConfig: CoinConfig
  @Input() selectedCurrencyObservable: Observable<string>

  public get pageSize(): number {
    return this._pageSize
  }

  public set pageSize(value: number) {
    this._pageSize = value
    if (this._pageSize > this.balanceChangesSubject.getValue().length && this.page > 1) {
      this.page = 1
    }
    void this.updateBalanceChanges()
  }

  public page = 1
  public total = 0
  public showItemsPerPageSelection: Observable<boolean>
  public balanceChanges: Observable<FormattedAccountBalanceChange[]>
  public readonly pageSizes: number[] = [
    5,
    10,
    15,
    20,
    25,
    50,
  ]
  public readonly isLoading: Observable<boolean>
  public readonly isLoadingInitial: Observable<boolean>
  protected readonly faBarsStaggered = faBarsStaggered
  private readonly isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject(true)
  private readonly balanceChangesSubject: BehaviorSubject<AccountBalanceChange[]> = new BehaviorSubject<AccountBalanceChange[]>([])
  private balanceChangesUpdateInterval?: ReturnType<typeof setInterval>
  private _pageSize = 10
  private readonly subscriptions: Subscription[] = [
    this.accountService.currentAccountIdentifier.pipe(skip(1)).subscribe(async () => {
      this.page = 1
      await this.updateBalanceChanges()
    })
  ]

  public constructor(
    protected readonly statsService: StatsService,
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
    private readonly ratesService: RatesService,
  ) {
    this.isLoading = this.isLoadingSubject.asObservable()
    this.isLoadingInitial = this.isLoadingSubject.pipe(takeWhile(isLoading => isLoading, true), shareReplay(1))
  }

  public async ngOnInit(): Promise<void> {
    this.balanceChanges = combineLatest([
      this.balanceChangesSubject.asObservable(),
      this.configService.balanceChangeDateFormattingSubject.asObservable(),
      this.selectedCurrencyObservable,
      this.statsService.exchangeStats$,
    ])
      .pipe(
        map(([balanceChanges, balanceChangeDateFormatting]) => {
          return balanceChanges.map(balanceChange => {
            const amount = parseFloat(balanceChange.amount) || 0

            return {
              type: balanceChange.type,
              amountFormatted: (new BigNumber(balanceChange.amount))
                .decimalPlaces(this.coinConfig.decimalPlaces, BigNumber.ROUND_FLOOR)
                .toString(),
              fiatAmountNowFormatted: this.ratesService.getValuesInFiatFormatted(amount),
              fiatAmountAtReceiptFormatted: this.ratesService.getValueInHistoricalFiatFormatted(amount, balanceChange.historicalRate),
              formattedDate: formatDate(moment(balanceChange.createdAt), balanceChangeDateFormatting),
              createdAt: balanceChange.createdAt,
              meta: balanceChange.meta,
            }
          })
        }),
        share(),
      )
    this.showItemsPerPageSelection = this.balanceChanges.pipe(
      map(balanceChanges => balanceChanges.length > 0),
      distinctUntilChanged(),
      shareReplay(1),
    )

    this.balanceChangesUpdateInterval = setInterval(this.updateBalanceChanges.bind(this), 5 * 60 * 1001)
    await this.updateBalanceChanges()
    this.isLoadingSubject.next(false)
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
    if (this.balanceChangesUpdateInterval !== undefined) {
      clearInterval(this.balanceChangesUpdateInterval)
    }
  }

  public toggleDateFormatting(): void {
    if (this.configService.balanceChangeDateFormatting === DateFormatting.fixed) {
      this.configService.balanceChangeDateFormatting = DateFormatting.relative
    } else {
      this.configService.balanceChangeDateFormatting = DateFormatting.fixed
    }
  }

  public async onPageChange() {
    await this.updateBalanceChanges()
  }

  public trackBy(index: number, balanceChange: FormattedAccountBalanceChange): string {
    return balanceChange.createdAt
  }

  private async updateBalanceChanges(): Promise<void> {
    this.isLoadingSubject.next(true)
    try {
      const { balanceChanges, total } = await this.accountService.getAccountBalanceChanges({ page: this.page, limit: this.pageSize })
      this.balanceChangesSubject.next(balanceChanges)
      this.total = total
    } finally {
      this.isLoadingSubject.next(false)
    }
  }

  protected readonly faExchangeAlt = faExchangeAlt
  protected readonly AccountBalanceChangeType = AccountBalanceChangeType
  protected readonly faHandshake = faHandshake
  protected readonly faTrophy = faTrophy
  protected readonly faCoins = faCoins
  protected readonly faHandHoldingDollar = faHandHoldingDollar
}

interface FormattedAccountBalanceChange<Meta = unknown> {
  type: AccountBalanceChangeType
  amountFormatted: string
  fiatAmountNowFormatted: string
  fiatAmountAtReceiptFormatted: string
  formattedDate: string
  createdAt: string
  meta?: Meta
}
