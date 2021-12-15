import {Injectable} from '@angular/core';
import {StatsService} from './stats.service';
import {ConfigService} from './config.service';

@Injectable({
  providedIn: 'root',
})
export class RatesService {
  public currencies = [];
  private rates = [];
  private isTestnet = false;

  constructor(
    private statsService: StatsService,
    private configService: ConfigService
  ) {
    const poolConfig = this.statsService.poolConfig.getValue();
    if (poolConfig && poolConfig.isTestnet !== undefined) {
      this.isTestnet = poolConfig.isTestnet;
    }
    this.statsService.poolConfig.asObservable().subscribe(poolConfig => {
      this.isTestnet = poolConfig.isTestnet;
    });

    const exchangeStats = this.statsService.exchangeStats.getValue();
    if (exchangeStats && exchangeStats.rates) {
      this.rates = exchangeStats.rates;
    }
    if (exchangeStats && exchangeStats.currencies) {
      this.currencies = exchangeStats.currencies;
    }
    this.statsService.exchangeStats.asObservable().subscribe(exchangeStats => {
      this.rates = exchangeStats.rates;
      this.currencies = exchangeStats.currencies;
    });
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

  getValuesInFiatFormatted(value) {
    const fiatAmount = this._getCoinValueAsFiat(value);
    const decimalPlaces = this._getDecimalPlaces(fiatAmount);

    return `${fiatAmount.toFixed(decimalPlaces)} ${this.configService.selectedCurrency.toUpperCase()}`;
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
