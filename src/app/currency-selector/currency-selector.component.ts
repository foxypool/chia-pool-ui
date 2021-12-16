import {Component} from '@angular/core';
import {ConfigService} from '../config.service';
import {RatesService} from '../rates.service';
import {StatsService} from '../stats.service';

@Component({
  selector: 'app-currency-selector',
  templateUrl: './currency-selector.component.html',
  styleUrls: ['./currency-selector.component.scss']
})
export class CurrencySelectorComponent {
  public rateForCurrencyFormatted = this.ratesService.makeObservableForFormattedFiatValue(1);

  constructor(
    public configService: ConfigService,
    public ratesService: RatesService,
    public statsService: StatsService,
  ) {}
}
