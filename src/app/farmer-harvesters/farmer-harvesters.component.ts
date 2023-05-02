import {Component, OnDestroy, OnInit} from '@angular/core'
import {AccountService} from '../account.service'
import {Harvester} from '../types'
import {BehaviorSubject, Observable, Subscription} from 'rxjs'
import {faTractor} from '@fortawesome/free-solid-svg-icons'
import {skip} from 'rxjs/operators'

@Component({
  selector: 'app-farmer-harvesters',
  templateUrl: './farmer-harvesters.component.html',
  styleUrls: ['./farmer-harvesters.component.scss']
})
export class FarmerHarvestersComponent implements OnInit, OnDestroy {
  public page = 1
  public pageSize = 5
  public readonly faTractor = faTractor
  public readonly isLoading: Observable<boolean>
  public readonly harvesters: Observable<Harvester[]>
  private readonly isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject(true)
  private readonly harvestersSubject: BehaviorSubject<Harvester[]> = new BehaviorSubject<Harvester[]>([])
  private harvestersUpdateInterval?: number
  private readonly subscriptions: Subscription[] = [
    this.accountService.currentAccountIdentifier.pipe(skip(1)).subscribe(async () => {
      this.page = 1
      await this.updateHarvesters()
    })
  ]

  public constructor(private readonly accountService: AccountService) {
    this.harvesters = this.harvestersSubject.asObservable()
    this.isLoading = this.isLoadingSubject.asObservable()
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

  private async updateHarvesters(): Promise<void> {
    this.harvestersSubject.next(await this.accountService.getAccountHarvesters())
  }
}
