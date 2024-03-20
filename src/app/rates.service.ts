import {Injectable, OnDestroy} from '@angular/core'
import {StatsService} from './stats.service'
import {ConfigService} from './config.service'
import {combineLatest, Observable, Subscription} from 'rxjs'
import {distinctUntilChanged, map} from 'rxjs/operators'
import {BigNumber} from 'bignumber.js'
import {HistoricalRate} from './api/types/historical/historical-rate'

@Injectable({
  providedIn: 'root',
})
export class RatesService implements OnDestroy {
  public currencies = []
  private rates = {}
  private isTestnet = false

  private readonly subscriptions: Subscription[] = [
    this.statsService.poolConfig$.subscribe(poolConfig => this.isTestnet = poolConfig.isTestnet),
    this.statsService.exchangeStats$.subscribe(exchangeStats => {
      this.rates = exchangeStats.rates
      this.currencies = exchangeStats.currencies
    }),
  ]

  constructor(
    private readonly statsService: StatsService,
    private readonly configService: ConfigService
  ) {}

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
  }

  public getFiatAmount(value: string|number|null|undefined|BigNumber): BigNumber|undefined {
    if (this.isTestnet || value === undefined || value === null) {
      return
    }
    const rate = this.rates[this.configService.selectedCurrency]
    if (rate === undefined) {
      return
    }

    return (new BigNumber(value)).multipliedBy(rate)
  }

  public getHistoricalFiatAmount(value: string|number|null|undefined|BigNumber, historicalRate?: HistoricalRate): BigNumber|undefined {
    if (this.isTestnet || value === undefined || value === null || historicalRate === undefined) {
      return
    }
    const rate = historicalRate.rates[this.configService.selectedCurrency]
    if (rate === undefined) {
      return
    }

    return (new BigNumber(value)).multipliedBy(rate)
  }

  public getHistoricalOrCurrentFiatAmount(value: string|number|null|undefined|BigNumber, historicalRate?: HistoricalRate): BigNumber|undefined {
    if (this.isTestnet || value === undefined || value === null) {
      return
    }
    const ratesToUse = historicalRate !== undefined ? historicalRate.rates : this.rates
    let rate = ratesToUse[this.configService.selectedCurrency]
    if (rate === undefined && historicalRate !== undefined) {
      rate = this.rates[this.configService.selectedCurrency]
    }

    if (rate === undefined) {
      return
    }

    return (new BigNumber(value)).multipliedBy(rate)
  }

  public getValuesInFiatFormatted(value: string|number|null|undefined|BigNumber, historicalRate?: HistoricalRate): string {
    const fiatAmount = this.getHistoricalOrCurrentFiatAmount(value, historicalRate)
    if (fiatAmount === undefined) {
      return 'N/A'
    }
    const decimalPlaces = this.getDecimalPlaces(fiatAmount.toNumber())

    return `${fiatAmount.toFixed(decimalPlaces)} ${this.configService.selectedCurrency.toUpperCase()}`
  }

  public getValueInHistoricalFiatFormatted(value: string|number|null|undefined|BigNumber, historicalRate?: HistoricalRate): string {
    const fiatAmount = this.getHistoricalFiatAmount(value, historicalRate)
    if (fiatAmount === undefined) {
      return 'N/A'
    }
    const decimalPlaces = this.getDecimalPlaces(fiatAmount.toNumber())

    return `${fiatAmount.toFixed(decimalPlaces)} ${this.configService.selectedCurrency.toUpperCase()}`
  }

  public makeObservableForFormattedFiatValue(value: number): Observable<string> {
    return combineLatest([
      this.statsService.exchangeStats$,
      this.configService.selectedCurrencySubject,
    ]).pipe(
      map(([exchangeStats]) => exchangeStats.rates),
      map(rates => {
        if (!rates || this.isTestnet) {
          return 0
        }
        const rate = rates[this.configService.selectedCurrency]
        if (!rate) {
          return 0
        }

        return value * rate
      }),
      distinctUntilChanged(),
      map(fiatAmount => {
        const decimalPlaces = this.getDecimalPlaces(fiatAmount)

        return `${fiatAmount.toFixed(decimalPlaces)} ${this.configService.selectedCurrency.toUpperCase()}`
      }),
    )
  }

  private getDecimalPlaces(value: number): number {
    if (value === 0) {
      return 0
    }
    let absValue = Math.abs(value)

    let decimalPlaces = 2
    while (decimalPlaces < 6) {
      if (absValue > 0.1) {
        return decimalPlaces
      }
      decimalPlaces += 1
      absValue *= 10
    }

    return decimalPlaces
  }
}
