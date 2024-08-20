import { Injectable } from '@angular/core'
import {BehaviorSubject, Observable} from 'rxjs'
import {distinctUntilChanged, shareReplay} from 'rxjs/operators'

@Injectable({
  providedIn: 'root'
})
export class AccountPayoutChartSizeProvider {
  public get possibleSizes(): AccountPayoutChartSize[] {
    return [30, 90, 180, 360]
  }

  public get selectedSize(): AccountPayoutChartSize {
    return this.selectedSizeRelay.getValue()
  }

  public set selectedSize(size: AccountPayoutChartSize) {
    this.selectedSizeRelay.next(size)
  }

  public readonly selectedSize$: Observable<AccountPayoutChartSize>
  private readonly selectedSizeRelay: BehaviorSubject<AccountPayoutChartSize> = new BehaviorSubject<AccountPayoutChartSize>(30)

  public constructor() {
    this.selectedSize$ = this.selectedSizeRelay.pipe(distinctUntilChanged(), shareReplay(1))
  }
}

export type AccountPayoutChartSize = 30 | 90 | 180 | 360
