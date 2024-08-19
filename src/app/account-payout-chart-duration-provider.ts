import { Injectable } from '@angular/core'
import {BehaviorSubject, Observable} from 'rxjs'
import {distinctUntilChanged, shareReplay} from 'rxjs/operators'

@Injectable({
  providedIn: 'root'
})
export class AccountPayoutChartDurationProvider {
  public get possibleDurations(): AccountPayoutChartDuration[] {
    return ['1m', '3m', '6m', '1y']
  }

  public get selectedDuration(): AccountPayoutChartDuration {
    return this.selectedDurationRelay.getValue()
  }

  public set selectedDuration(duration: AccountPayoutChartDuration) {
    this.selectedDurationRelay.next(duration)
  }

  public readonly selectedDuration$: Observable<AccountPayoutChartDuration>
  private readonly selectedDurationRelay: BehaviorSubject<AccountPayoutChartDuration> = new BehaviorSubject<AccountPayoutChartDuration>('1m')

  public constructor() {
    this.selectedDuration$ = this.selectedDurationRelay.pipe(distinctUntilChanged(), shareReplay(1))
  }
}

export type AccountPayoutChartDuration = '1m' | '3m' | '6m' | '1y'
export function durationInDays(duration: AccountPayoutChartDuration): number {
  switch (duration) {
    case '1m': return 30
    case '3m': return 90
    case '6m': return 180
    case '1y': return 365
  }
}
