import {Injectable} from "@angular/core";
import {StatsService} from './stats.service';
import {LocalStorageService} from './local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class RatesService {
  public static selectedCurrencyStorageKey = 'selectedCurrency';

  public currencies = [];
  private rates = [];
  private isTestnet = false;
  private _selectedCurrency = null;

  constructor(
    private statsService: StatsService,
    private localStorageService: LocalStorageService
  ) {
    this.init();
  }

  init() {
    this._selectedCurrency = this.localStorageService.getItem(RatesService.selectedCurrencyStorageKey);
    if (!this.selectedCurrency) {
      this.selectedCurrency = 'usd';
    }

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
    const rate = this.rates[this.selectedCurrency];
    if (!rate) {
      return 0;
    }

    return value * rate;
  }

  getValuesInFiatFormatted(value) {
    const fiatAmount = this._getCoinValueAsFiat(value);
    const decimalPlaces = this._getDecimalPlaces(fiatAmount);

    return `${fiatAmount.toFixed(decimalPlaces)} ${this.selectedCurrency.toUpperCase()}`;
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

  get selectedCurrency(): any {
    return this._selectedCurrency;
  }

  set selectedCurrency(selectedCurrency: any) {
    this._selectedCurrency = selectedCurrency;
    this.localStorageService.setItem(RatesService.selectedCurrencyStorageKey, selectedCurrency);
  }
}
