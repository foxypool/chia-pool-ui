import {Component, Input, OnDestroy, OnInit} from '@angular/core'
import {faMoneyCheckAlt, faExchangeAlt} from '@fortawesome/free-solid-svg-icons'
import * as moment from 'moment'
import {EChartsOption} from 'echarts'
import BigNumber from 'bignumber.js'

import {SnippetService} from '../snippet.service'
import {ConfigService, DateFormatting} from '../config.service'
import {CsvExporter} from '../csv-exporter'
import {BehaviorSubject, combineLatest, Observable, Subscription} from 'rxjs'
import {map} from 'rxjs/operators'
import {CoinConfig} from '../coin-config'
import {RatesService} from '../rates.service'
import {Moment} from 'moment'
import {StatsService} from '../stats.service'
import {ThemeProvider} from '../theme-provider'

@Component({
  selector: 'app-farmer-payout-history',
  templateUrl: './farmer-payout-history.component.html',
  styleUrls: ['./farmer-payout-history.component.scss']
})
export class FarmerPayoutHistoryComponent implements OnInit, OnDestroy {
  @Input() payouts: BehaviorSubject<AccountPayout[]>
  @Input() isLoading = false
  @Input() coinConfig: CoinConfig
  @Input() payoutDateFormattingObservable: Observable<DateFormatting>
  @Input() selectedCurrencyObservable: Observable<string>

  public page = 1
  public pageSize = 7
  public payoutsObservable: Observable<FormattedAccountPayout[]>
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

  private readonly subscriptions: Subscription[] = []

  constructor(
    public readonly snippetService: SnippetService,
    public readonly statsService: StatsService,
    private readonly configService: ConfigService,
    private readonly csvExporter: CsvExporter,
    private readonly ratesService: RatesService,
    private readonly themeProvider: ThemeProvider,
  ) {}

  public exportCsv(): void {
    this.csvExporter.export(`payouts-${moment().format('YYYY-MM-DD')}.csv`, [
      'Date',
      'Coin',
      'Amount',
      'State',
    ], this.payouts.getValue().map(payout => ([
      moment(payout.createdAt).format('YYYY-MM-DD HH:mm'),
      payout.coinId,
      payout.amount,
      payout.state,
    ])))
  }

  public ngOnInit(): void {
    this.payoutsObservable = combineLatest([
      this.payouts.asObservable(),
      this.payoutDateFormattingObservable,
      this.selectedCurrencyObservable,
      this.statsService.exchangeStats$,
    ])
      .pipe(map(([accountPayouts, payoutDateFormatting]) => {
        return accountPayouts.map(accountPayout => {
          return {
            coinId: accountPayout.coinId,
            amountFormatted: (new BigNumber(accountPayout.amount))
              .decimalPlaces(this.coinConfig.decimalPlaces, BigNumber.ROUND_FLOOR)
              .toString(),
            fiatAmountFormatted: this.ratesService.getValuesInFiatFormatted(parseFloat(accountPayout.amount) || 0),
            state: this.getFormattedPaymentState(accountPayout.state),
            formattedPayoutDate: this.formatDate(moment(accountPayout.createdAt), payoutDateFormatting),
            blockExplorerUrl: this.getBlockExplorerCoinLink(accountPayout.coinId),
          }
        })
      }))
    this.subscriptions.push(
      this.payouts.subscribe(payouts => this.chartUpdateOptions = this.makeChartUpdateOptions(payouts)),
    )
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
  }

  public trackPayoutById(index: number, payout: FormattedAccountPayout): string {
    return payout.coinId
  }

  private formatDate(date: Moment, dateFormatting: DateFormatting): string {
    switch (dateFormatting) {
      case DateFormatting.fixed:
        return date.format('YYYY-MM-DD HH:mm')
      case DateFormatting.relative:
        return date.fromNow()
    }
  }

  private getBlockExplorerCoinLink(coinId: string): string|undefined {
    if (!this.statsService.poolConfig?.blockExplorerCoinUrlTemplate) {
      return
    }

    return this.statsService.poolConfig.blockExplorerCoinUrlTemplate.replace('#COIN#', coinId.ensureHexPrefix())
  }

  private getFormattedPaymentState(payoutState: AccountPayoutState): string {
    switch (payoutState) {
      case AccountPayoutState.inMempool:
        return this.snippetService.getSnippet('payouts-component.in-mempool')
      case AccountPayoutState.confirmed:
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

enum AccountPayoutState {
  inMempool = 'IN_MEMPOOL',
  confirmed = 'CONFIRMED',
}

export interface AccountPayout {
  coinId: string,
  amount: string,
  state: AccountPayoutState,
  createdAt: Date,
}

interface FormattedAccountPayout {
  coinId: string,
  amountFormatted: string,
  fiatAmountFormatted: string,
  state: string,
  formattedPayoutDate: string,
  blockExplorerUrl?: string,
}
