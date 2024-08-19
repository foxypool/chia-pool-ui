import {Component, Input, OnDestroy, OnInit} from '@angular/core'
import {faMoneyCheckAlt, faExchangeAlt} from '@fortawesome/free-solid-svg-icons'
import * as moment from 'moment'
import {EChartsOption} from 'echarts'
import BigNumber from 'bignumber.js'

import {SnippetService} from '../snippet.service'
import {ConfigService} from '../config.service'
import {CsvExporter} from '../csv-exporter'
import {BehaviorSubject, combineLatest, Observable, Subscription, takeWhile} from 'rxjs'
import {distinctUntilChanged, map, shareReplay, skip} from 'rxjs/operators'
import {CoinConfig} from '../coin-config'
import {RatesService} from '../rates.service'
import {StatsService} from '../stats.service'
import {ThemeProvider} from '../theme-provider'
import {AccountPayout} from '../api/types/account/account-payout'
import {TransactionState} from '../api/types/transaction-state'
import {DateFormatting, formatDate} from '../date-formatting'
import {AccountService} from '../account.service'
import {AccountPayoutChartDurationProvider, durationInDays} from '../account-payout-chart-duration-provider'

@Component({
  selector: 'app-farmer-payout-history',
  templateUrl: './farmer-payout-history.component.html',
  styleUrls: ['./farmer-payout-history.component.scss']
})
export class FarmerPayoutHistoryComponent implements OnInit, OnDestroy {
  @Input() coinConfig: CoinConfig
  @Input() payoutDateFormattingObservable: Observable<DateFormatting>
  @Input() selectedCurrencyObservable: Observable<string>

  public get pageSize(): number {
    return this._pageSize
  }

  public set pageSize(value: number) {
    this._pageSize = value
    if (this._pageSize > this.payoutsSubject.getValue().length && this.page > 1) {
      this.page = 1
    }
    void this.updatePayouts()
  }

  public page = 1
  public total = 0
  public showItemsPerPageSelection: Observable<boolean>
  public payouts$: Observable<FormattedAccountPayout[]>
  public readonly pageSizes: number[] = [
    7,
    14,
    30,
  ]

  public readonly isLoading$: Observable<boolean>
  public readonly isLoadingInitial$: Observable<boolean>
  public readonly isLoadingChartInitial$: Observable<boolean>
  public readonly isExportingCsv$: Observable<boolean>
  public readonly hasPayouts$: Observable<boolean>
  public readonly hasChartPayouts$: Observable<boolean>

  public faMoneyCheck = faMoneyCheckAlt
  public faExchangeAlt = faExchangeAlt
  public chartOptions: EChartsOption = {
    grid: {
      left: 45,
      top: 30,
      right: 10,
      bottom: 20,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          formatter: params => {
            if (params.axisDimension === 'x') {
              return moment(params.value).format('YYYY-MM-DD')
            }

            return (params.value as number).toFixed(2)
          },
        },
      },
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: '{MMM} {dd}',
      },
    },
    yAxis: [{
      type: 'value',
      name: this.snippetService.getSnippet('farmer-payout-history-component.chart.amount.name'),
      splitLine: {
        show: false,
      },
    }],
    series: [{
      data: [],
      type: 'bar',
      color: '#037ffc',
      name: this.snippetService.getSnippet('farmer-payout-history-component.chart.amount.name'),
    }],
  }
  public chartUpdateOptions: EChartsOption

  public get exportCsvButtonClasses(): string {
    return this.themeProvider.isDarkTheme ? 'btn-outline-info' : 'btn-info'
  }

  private get chartPayoutLimit(): number {
    return durationInDays(this.accountPayoutChartDurationProvider.selectedDuration)
  }

  private readonly isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject(true)
  private readonly isLoadingChartSubject: BehaviorSubject<boolean> = new BehaviorSubject(true)
  private readonly isExportingCsv: BehaviorSubject<boolean> = new BehaviorSubject(false)
  private readonly payoutsSubject: BehaviorSubject<AccountPayout[]> = new BehaviorSubject<AccountPayout[]>([])
  private readonly chartPayoutsSubject: BehaviorSubject<AccountPayout[]> = new BehaviorSubject<AccountPayout[]>([])
  private payoutsUpdateInterval?: ReturnType<typeof setInterval>
  private readonly subscriptions: Subscription[] = [
    this.accountService.currentAccountIdentifier.pipe(skip(1)).subscribe(async () => {
      this.page = 1
      await this.updateAllPayouts()
    }),
    this.accountPayoutChartDurationProvider.selectedDuration$.pipe(skip(1)).subscribe(async _ => {
      await this.updateChartPayouts()
    }),
  ]
  private _pageSize = 7

  constructor(
    public readonly snippetService: SnippetService,
    public readonly statsService: StatsService,
    private readonly configService: ConfigService,
    private readonly csvExporter: CsvExporter,
    private readonly ratesService: RatesService,
    private readonly themeProvider: ThemeProvider,
    private readonly accountService: AccountService,
    private readonly accountPayoutChartDurationProvider: AccountPayoutChartDurationProvider,
  ) {
    this.isExportingCsv$ = this.isExportingCsv.asObservable()
    this.isLoading$ = this.isLoadingSubject.asObservable()
    this.isLoadingInitial$ = this.isLoadingSubject.pipe(takeWhile(isLoading => isLoading, true), shareReplay(1))
    this.hasPayouts$ = this.payoutsSubject.pipe(
      map(payouts => payouts.length > 0),
      distinctUntilChanged(),
      shareReplay(1),
    )
    this.hasChartPayouts$ = this.chartPayoutsSubject.pipe(
      map(payouts => payouts.length > 0),
      distinctUntilChanged(),
      shareReplay(1),
    )
    this.isLoadingChartInitial$ = this.isLoadingChartSubject.pipe(takeWhile(isLoading => isLoading, true), shareReplay(1))
  }

  public async exportCsv(): Promise<void> {
    this.isExportingCsv.next(true)
    try {
      const allPayouts = await this.accountService.getAccountPayouts({ page: 1, limit: 3650 }) // last 10 years

      this.csvExporter.export(`payouts-${moment().format('YYYY-MM-DD')}.csv`, [
        'Date',
        'Coin',
        'Amount',
        'Value (Now)',
        'Value (At receipt)',
        'State',
      ], allPayouts.payouts.map(payout => {
        const amountFiatNow = this.ratesService.getFiatAmount(payout.amount)
        const amountFiatAtReceipt = this.ratesService.getHistoricalFiatAmount(payout.amount, payout.historicalRate)

        return [
          moment(payout.createdAt).format('YYYY-MM-DD HH:mm'),
          payout.coinId,
          payout.amount,
          amountFiatNow?.toString(),
          amountFiatAtReceipt?.toString(),
          payout.state,
        ]
      }))
    } finally {
      this.isExportingCsv.next(false)
    }
  }

  public async ngOnInit(): Promise<void> {
    this.payouts$ = combineLatest([
      this.payoutsSubject.asObservable(),
      this.payoutDateFormattingObservable,
      this.selectedCurrencyObservable,
      this.statsService.exchangeStats$,
    ])
      .pipe(
        map(([accountPayouts, payoutDateFormatting]) => {
          return accountPayouts.map(accountPayout => {
            const amount = parseFloat(accountPayout.amount) || 0

            return {
              coinId: accountPayout.coinId,
              amountFormatted: (new BigNumber(accountPayout.amount))
                .decimalPlaces(this.coinConfig.decimalPlaces, BigNumber.ROUND_FLOOR)
                .toString(),
              fiatAmountNowFormatted: this.ratesService.getValuesInFiatFormatted(amount),
              fiatAmountAtReceiptFormatted: this.ratesService.getValueInHistoricalFiatFormatted(amount, accountPayout.historicalRate),
              state: this.getFormattedPaymentState(accountPayout.state),
              formattedPayoutDate: formatDate(moment(accountPayout.createdAt), payoutDateFormatting),
              blockExplorerUrl: this.getBlockExplorerCoinLink(accountPayout.coinId),
            }
          })
        }),
        shareReplay(1),
      )
    this.showItemsPerPageSelection = this.payouts$.pipe(
      map(payouts => payouts.length > 0),
      distinctUntilChanged(),
      shareReplay(1),
    )
    this.subscriptions.push(
      this.chartPayoutsSubject.subscribe(payouts => this.chartUpdateOptions = this.makeChartUpdateOptions(payouts)),
    )
    this.payoutsUpdateInterval = setInterval(this.updateAllPayouts.bind(this), 10 * 60 * 1001)
    await this.updateAllPayouts()
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
    if (this.payoutsUpdateInterval !== undefined) {
      clearInterval(this.payoutsUpdateInterval)
    }
  }

  public trackPayoutById(index: number, payout: FormattedAccountPayout): string {
    return payout.coinId
  }

  public async onPageChange() {
    await this.updatePayouts()
  }

  private async updatePayouts(): Promise<void> {
    this.isLoadingSubject.next(true)
    try {
      const { payouts, total } = await this.accountService.getAccountPayouts({ page: this.page, limit: this.pageSize })
      this.payoutsSubject.next(payouts)
      this.total = total
    } finally {
      this.isLoadingSubject.next(false)
    }
  }

  private async updateChartPayouts(): Promise<void> {
    this.isLoadingChartSubject.next(true)
    try {
      const { payouts } = await this.accountService.getAccountPayouts({ page: 1, limit: this.chartPayoutLimit })
      this.chartPayoutsSubject.next(payouts)
    } finally {
      this.isLoadingChartSubject.next(false)
    }
  }

  private async updateAllPayouts() {
    await Promise.all([
      this.updatePayouts(),
      this.updateChartPayouts(),
    ])
  }

  private getBlockExplorerCoinLink(coinId: string): string|undefined {
    if (!this.statsService.poolConfig?.blockExplorerCoinUrlTemplate) {
      return
    }

    return this.statsService.poolConfig.blockExplorerCoinUrlTemplate.replace('#COIN#', coinId.ensureHexPrefix())
  }

  private getFormattedPaymentState(payoutState: TransactionState): string {
    switch (payoutState) {
      case TransactionState.inMempool:
        return this.snippetService.getSnippet('payouts-component.in-mempool')
      case TransactionState.confirmed:
        return this.snippetService.getSnippet('payouts-component.confirmed')
    }
  }

  public toggleDateFormatting(): void {
    if (this.configService.payoutDateFormatting === DateFormatting.fixed) {
      this.configService.payoutDateFormatting = DateFormatting.relative
    } else {
      this.configService.payoutDateFormatting = DateFormatting.fixed
    }
  }

  private makeChartUpdateOptions(payouts: AccountPayout[]): EChartsOption {
    return {
      tooltip: {
        formatter: params => `<strong>${params[0].value[1]} ${this.statsService.poolConfig?.ticker}</strong>`,
      },
      series: [{
        data: payouts.map(payout => ({
          value: [payout.createdAt, (new BigNumber(payout.amount)).toNumber()],
        })),
      }],
    }
  }
}

interface FormattedAccountPayout {
  coinId: string,
  amountFormatted: string,
  fiatAmountNowFormatted: string,
  fiatAmountAtReceiptFormatted: string,
  state: string,
  formattedPayoutDate: string,
  blockExplorerUrl?: string,
}
