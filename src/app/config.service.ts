import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Subscription} from 'rxjs';
import {distinctUntilChanged, skip} from 'rxjs/operators';

import {LocalStorageService} from './local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigService implements OnDestroy {
  private static selectedCurrencyStorageKey = 'selectedCurrency';

  public selectedCurrencySubject = new BehaviorSubject<string>(
    this.localStorageService.getItem(ConfigService.selectedCurrencyStorageKey) || 'usd'
  );

  private subscriptions: Subscription[] = [
    this.selectedCurrencySubject
      .pipe(skip(1), distinctUntilChanged())
      .subscribe(selectedCurrency =>
          this.localStorageService.setItem(ConfigService.selectedCurrencyStorageKey, selectedCurrency)
      ),
  ];

  constructor(private localStorageService: LocalStorageService) {}

  public get selectedCurrency(): string {
    return this.selectedCurrencySubject.getValue();
  }

  public set selectedCurrency(selectedCurrency: string) {
    this.selectedCurrencySubject.next(selectedCurrency);
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe());
  }
}
