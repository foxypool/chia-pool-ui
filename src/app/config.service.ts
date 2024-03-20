import {Injectable, OnDestroy} from '@angular/core'
import {BehaviorSubject, Subscription} from 'rxjs'
import {distinctUntilChanged, skip} from 'rxjs/operators'

import {LocalStorageService} from './local-storage.service'
import {DateFormatting} from './date-formatting'

@Injectable({
  providedIn: 'root'
})
export class ConfigService implements OnDestroy {
  private static readonly selectedCurrencyStorageKey = 'selectedCurrency'
  private static readonly wonBlockDateFormattingStorageKey = 'config:dateFormatting:wonBlock'
  private static readonly payoutDateFormattingStorageKey = 'config:dateFormatting:payout'
  private static readonly rewardTimeIntervalStorageKey = 'config:rewardTimeInterval'
  private static readonly hideNewAccountInfoAlertStorageKey = 'config:hideNewAccountInfoAlert'
  private static readonly partialDateFormattingStorageKey = 'config:dateFormatting:partial'
  private static readonly balanceChangeDateFormattingStorageKey = 'config:dateFormatting:balanceChange'

  public selectedCurrencySubject = new BehaviorSubject<string>(
    this.localStorageService.getItem(ConfigService.selectedCurrencyStorageKey) || 'usd'
  )
  public wonBlockDateFormattingSubject = new BehaviorSubject<DateFormatting>(
    DateFormatting[this.localStorageService.getItem(ConfigService.wonBlockDateFormattingStorageKey) || DateFormatting.fixed]
  )
  public payoutDateFormattingSubject = new BehaviorSubject<DateFormatting>(
    DateFormatting[this.localStorageService.getItem(ConfigService.payoutDateFormattingStorageKey) || DateFormatting.fixed]
  )
  private readonly rewardTimeIntervalSubject: BehaviorSubject<TimeInterval> = new BehaviorSubject<TimeInterval>(
    TimeInterval[this.localStorageService.getItem(ConfigService.rewardTimeIntervalStorageKey)] ?? TimeInterval.daily
  )
  private readonly hideNewAccountInfoAlertSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(
    JSON.parse(this.localStorageService.getItem(ConfigService.hideNewAccountInfoAlertStorageKey) ?? 'false')
  )
  public readonly partialDateFormattingSubject = new BehaviorSubject<DateFormatting>(
    DateFormatting[this.localStorageService.getItem(ConfigService.partialDateFormattingStorageKey) || DateFormatting.fixed]
  )
  public readonly balanceChangeDateFormattingSubject = new BehaviorSubject<DateFormatting>(
    DateFormatting[this.localStorageService.getItem(ConfigService.balanceChangeDateFormattingStorageKey) || DateFormatting.fixed]
  )

  private readonly subscriptions: Subscription[] = [
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
    this.rewardTimeIntervalSubject
      .pipe(skip(1), distinctUntilChanged())
      .subscribe(rewardTimeInterval =>
        this.localStorageService.setItem(ConfigService.rewardTimeIntervalStorageKey, rewardTimeInterval)
      ),
    this.hideNewAccountInfoAlertSubject
      .pipe(skip(1), distinctUntilChanged())
      .subscribe(hideNewAccountInfoAlert =>
        this.localStorageService.setItem(ConfigService.hideNewAccountInfoAlertStorageKey, JSON.stringify(hideNewAccountInfoAlert))
      ),
    this.partialDateFormattingSubject
      .pipe(skip(1), distinctUntilChanged())
      .subscribe(partialDateFormatting =>
        this.localStorageService.setItem(ConfigService.partialDateFormattingStorageKey, partialDateFormatting)
      ),
    this.balanceChangeDateFormattingSubject
      .pipe(skip(1), distinctUntilChanged())
      .subscribe(balanceChangeDateFormatting =>
        this.localStorageService.setItem(ConfigService.balanceChangeDateFormattingStorageKey, balanceChangeDateFormatting)
      ),
  ]

  constructor(private readonly localStorageService: LocalStorageService) {}

  public get selectedCurrency(): string {
    return this.selectedCurrencySubject.getValue()
  }

  public set selectedCurrency(selectedCurrency: string) {
    this.selectedCurrencySubject.next(selectedCurrency)
  }

  public get wonBlockDateFormatting(): DateFormatting {
    return this.wonBlockDateFormattingSubject.getValue()
  }

  public set wonBlockDateFormatting(dateFormatting: DateFormatting) {
    this.wonBlockDateFormattingSubject.next(dateFormatting)
  }

  public get payoutDateFormatting(): DateFormatting {
    return this.payoutDateFormattingSubject.getValue()
  }

  public set payoutDateFormatting(dateFormatting: DateFormatting) {
    this.payoutDateFormattingSubject.next(dateFormatting)
  }

  public get rewardTimeInterval(): TimeInterval {
    return this.rewardTimeIntervalSubject.getValue()
  }

  public set rewardTimeInterval(timeInterval: TimeInterval) {
    this.rewardTimeIntervalSubject.next(timeInterval)
  }

  public get hideNewAccountInfoAlert(): boolean {
    return this.hideNewAccountInfoAlertSubject.getValue()
  }

  public set hideNewAccountInfoAlert(hideNewAccountInfoAlert: boolean) {
    this.hideNewAccountInfoAlertSubject.next(hideNewAccountInfoAlert)
  }

  public get partialDateFormatting(): DateFormatting {
    return this.partialDateFormattingSubject.getValue()
  }

  public set partialDateFormatting(dateFormatting: DateFormatting) {
    this.partialDateFormattingSubject.next(dateFormatting)
  }

  public get balanceChangeDateFormatting(): DateFormatting {
    return this.balanceChangeDateFormattingSubject.getValue()
  }

  public set balanceChangeDateFormatting(dateFormatting: DateFormatting) {
    this.balanceChangeDateFormattingSubject.next(dateFormatting)
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
  }
}

export enum TimeInterval {
  daily = 'daily',
  weekly = 'weekly',
  monthly = 'monthly',
}
