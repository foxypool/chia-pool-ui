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
  constructor(
    public configService: ConfigService,
    public ratesService: RatesService,
    public statsService: StatsService,
  ) {}

  public get rateForCurrencyFormatted(): string {
    return this.ratesService.getValuesInFiatFormatted(1);
  }
}
