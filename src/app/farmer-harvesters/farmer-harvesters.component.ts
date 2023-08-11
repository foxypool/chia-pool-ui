import {Component, OnDestroy, OnInit} from '@angular/core'
import {AccountService} from '../account.service'
import {BehaviorSubject, Observable, Subscription} from 'rxjs'
import {faTractor} from '@fortawesome/free-solid-svg-icons'
import {distinctUntilChanged, map, shareReplay, skip} from 'rxjs/operators'
import { Harvester } from '../api/types/harvester/harvester'

@Component({
  selector: 'app-farmer-harvesters',
  templateUrl: './farmer-harvesters.component.html',
  styleUrls: ['./farmer-harvesters.component.scss']
})
export class FarmerHarvestersComponent implements OnInit, OnDestroy {
  public get pageSize(): number {
    return this._pageSize
  }

  public set pageSize(value: number) {
    this._pageSize = value
    if (this._pageSize > this.harvestersSubject.getValue().length && this.page > 1) {
      this.page = 1
    }
  }

  public page = 1
  public readonly pageSizes: number[] = [
    5,
    10,
    15,
    20,
    25,
    50,
  ]
  public readonly showItemsPerPageSelection: Observable<boolean>
  public readonly faTractor = faTractor
  public readonly isLoading: Observable<boolean>
  public readonly harvesters: Observable<Harvester[]>
  private readonly isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject(true)
  private readonly harvestersSubject: BehaviorSubject<Harvester[]> = new BehaviorSubject<Harvester[]>([])
  private harvestersUpdateInterval?: ReturnType<typeof setInterval>
  private _pageSize = 5
  private readonly subscriptions: Subscription[] = [
    this.accountService.currentAccountIdentifier.pipe(skip(1)).subscribe(async () => {
      this.page = 1
      await this.updateHarvesters()
    })
  ]

  public constructor(private readonly accountService: AccountService) {
    this.harvesters = this.harvestersSubject.asObservable()
    this.isLoading = this.isLoadingSubject.asObservable()
    this.showItemsPerPageSelection = this.harvesters.pipe(
      map(harvesters => harvesters.length > 0),
      distinctUntilChanged(),
      shareReplay(),
    )
  }

  public async ngOnInit(): Promise<void> {
    this.harvestersUpdateInterval = setInterval(this.updateHarvesters.bind(this), 3 * 60 * 1000)
    await this.updateHarvesters()
    this.isLoadingSubject.next(false)
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
    if (this.harvestersUpdateInterval !== undefined) {
      clearInterval(this.harvestersUpdateInterval)
    }
  }

  public trackBy(index: number, harvester: Harvester): string {
    return harvester._id
  }

  public async updateHarvesters({ bustCache = false } = {}): Promise<void> {
    this.harvestersSubject.next(await this.accountService.getAccountHarvesters({ bustCache }))
  }
}
