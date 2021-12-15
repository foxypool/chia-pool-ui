import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Subscription} from 'rxjs';
import {distinctUntilChanged, skip} from 'rxjs/operators';

import {LocalStorageService} from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigService implements OnDestroy {
  private static selectedCurrencyStorageKey = 'selectedCurrency';
  private static wonBlockDateFormattingStorageKey = 'config:dateFormatting:wonBlock';
  private static payoutDateFormattingStorageKey = 'config:dateFormatting:payout';

  public selectedCurrencySubject = new BehaviorSubject<string>(
    this.localStorageService.getItem(ConfigService.selectedCurrencyStorageKey) || 'usd'
  );
  public wonBlockDateFormattingSubject = new BehaviorSubject<DateFormatting>(
    DateFormatting[this.localStorageService.getItem(ConfigService.wonBlockDateFormattingStorageKey) || 'fixed']
  );
  public payoutDateFormattingSubject = new BehaviorSubject<DateFormatting>(
    DateFormatting[this.localStorageService.getItem(ConfigService.payoutDateFormattingStorageKey) || 'fixed']
  );

  private subscriptions: Subscription[] = [
    this.selectedCurrencySubject
      .pipe(skip(1), distinctUntilChanged())
      .subscribe(selectedCurrency =>
          this.localStorageService.setItem(ConfigService.selectedCurrencyStorageKey, selectedCurrency)
      ),
    this.wonBlockDateFormattingSubject
      .pipe(skip(1), distinctUntilChanged())
      .subscribe(wonBlockDateFormatting =>
        this.localStorageService.setItem(ConfigService.wonBlockDateFormattingStorageKey, wonBlockDateFormatting)
      ),
    this.payoutDateFormattingSubject
      .pipe(skip(1), distinctUntilChanged())
      .subscribe(payoutDateFormatting =>
        this.localStorageService.setItem(ConfigService.payoutDateFormattingStorageKey, payoutDateFormatting)
      ),
  ];

  constructor(private localStorageService: LocalStorageService) {}

  public get selectedCurrency(): string {
    return this.selectedCurrencySubject.getValue();
  }

  public set selectedCurrency(selectedCurrency: string) {
    this.selectedCurrencySubject.next(selectedCurrency);
  }

  public get wonBlockDateFormatting(): DateFormatting {
    return this.wonBlockDateFormattingSubject.getValue();
  }

  public set wonBlockDateFormatting(dateFormatting: DateFormatting) {
    this.wonBlockDateFormattingSubject.next(dateFormatting);
  }

  public get payoutDateFormatting(): DateFormatting {
    return this.payoutDateFormattingSubject.getValue();
  }

  public set payoutDateFormatting(dateFormatting: DateFormatting) {
    this.payoutDateFormattingSubject.next(dateFormatting);
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe());
  }
}

export enum DateFormatting {
  fixed = 'fixed',
  relative = 'relative',
}
