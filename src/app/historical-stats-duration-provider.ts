import { Injectable } from '@angular/core'
import {BehaviorSubject, Observable} from 'rxjs'
import {HistoricalStatsDuration} from './api/types/historical-stats-duration'
import {distinctUntilChanged, shareReplay} from 'rxjs/operators'

@Injectable({
  providedIn: 'root'
})
export class HistoricalStatsDurationProvider {
  public get possibleDurations(): HistoricalStatsDuration[] {
    return ['1d', '7d', '30d']
  }

  public get selectedDuration(): HistoricalStatsDuration {
    return this.selectedDurationRelay.getValue()
  }

  public set selectedDuration(duration: HistoricalStatsDuration) {
    this.selectedDurationRelay.next(duration)
  }

  public readonly selectedDuration$: Observable<HistoricalStatsDuration>
  private readonly selectedDurationRelay: BehaviorSubject<HistoricalStatsDuration> = new BehaviorSubject<HistoricalStatsDuration>('1d')

  public constructor() {
    this.selectedDuration$ = this.selectedDurationRelay.pipe(distinctUntilChanged(), shareReplay(1))
  }
}
