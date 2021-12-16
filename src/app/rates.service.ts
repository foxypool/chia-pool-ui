import {Injectable, OnDestroy} from '@angular/core';
import {StatsService} from './stats.service';
import {ConfigService} from './config.service';
import {combineLatest, Observable, Subscription} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class RatesService implements OnDestroy {
  public currencies = [];
  private rates = {};
  private isTestnet = false;

  private subscriptions: Subscription[] = [
    this.statsService.poolConfig.asObservable().subscribe(poolConfig => this.isTestnet = poolConfig.isTestnet),
    this.statsService.exchangeStats.asObservable().subscribe(exchangeStats => {
      this.rates = exchangeStats.rates;
      this.currencies = exchangeStats.currencies;
    }),
  ];

  constructor(
    private statsService: StatsService,
    private configService: ConfigService
  ) {}

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe());
  }

  _getCoinValueAsFiat(value) {
    if (!this.rates) {
      return 0;
    }
    if (!value) {
      return 0;
    }
    if (this.isTestnet) {
      return 0;
    }
    const rate = this.rates[this.configService.selectedCurrency];
    if (!rate) {
      return 0;
    }

    return value * rate;
  }

  public getValuesInFiatFormatted(value: number|null): string {
    const fiatAmount = this._getCoinValueAsFiat(value);
    const decimalPlaces = this._getDecimalPlaces(fiatAmount);

    return `${fiatAmount.toFixed(decimalPlaces)} ${this.configService.selectedCurrency.toUpperCase()}`;
  }

  public makeObservableForFormattedFiatValue(value: number): Observable<string> {
    return combineLatest([
      this.statsService.exchangeStats,
      this.configService.selectedCurrencySubject,
    ]).pipe(
      map(([exchangeStats]) => exchangeStats.rates),
      map(rates => {
        if (!rates) {
          return 0;
        }
        if (!value) {
          return 0;
        }
        if (this.isTestnet) {
          return 0;
        }
        const rate = rates[this.configService.selectedCurrency];
        if (!rate) {
          return 0;
        }

        return value * rate;
      }),
      distinctUntilChanged(),
      map(fiatAmount => {
        const decimalPlaces = this._getDecimalPlaces(fiatAmount);

        return `${fiatAmount.toFixed(decimalPlaces)} ${this.configService.selectedCurrency.toUpperCase()}`;
      }),
    );
  }

  _getDecimalPlaces(value) {
    if (value === 0) {
      return 0;
    }

    let decimalPlaces = 2;
    while (decimalPlaces < 6) {
      if (value > 0.1) {
        return decimalPlaces;
      }
      decimalPlaces += 1;
      value *= 10;
    }

    return decimalPlaces;
  }
}
