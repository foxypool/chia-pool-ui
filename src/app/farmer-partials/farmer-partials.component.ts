import {Component, OnDestroy, OnInit} from '@angular/core'
import {BehaviorSubject, Observable, Subscription, takeWhile} from 'rxjs'
import {Harvester} from '../api/types/harvester/harvester'
import {distinctUntilChanged, map, shareReplay, skip} from 'rxjs/operators'
import {AccountService} from '../account.service'
import {AccountPartial} from '../api/types/account/account-partial'
import {faBarsStaggered, faExchangeAlt} from '@fortawesome/free-solid-svg-icons'
import {ConfigService} from '../config.service'
import * as moment from 'moment/moment'
import {DateFormatting} from '../date-formatting'

@Component({
  selector: 'app-farmer-partials',
  templateUrl: './farmer-partials.component.html',
  styleUrl: './farmer-partials.component.scss'
})
export class FarmerPartialsComponent implements OnInit, OnDestroy {
  public get pageSize(): number {
    return this._pageSize
  }

  public set pageSize(value: number) {
    this._pageSize = value
    if (this._pageSize > this.partialsSubject.getValue().length && this.page > 1) {
      this.page = 1
    }
    void this.updatePartials()
  }

  public page = 1
  public total = 0
  public readonly pageSizes: number[] = [
    5,
    10,
    15,
    20,
    25,
    50,
  ]
  public readonly showItemsPerPageSelection: Observable<boolean>
  public readonly isLoading: Observable<boolean>
  public readonly isLoadingInitial: Observable<boolean>
  public readonly partials: Observable<AccountPartial[]>
  protected readonly faBarsStaggered = faBarsStaggered
  private readonly isLoadingSubject: BehaviorSubject<boolean> = new BehaviorSubject(true)
  private readonly partialsSubject: BehaviorSubject<AccountPartial[]> = new BehaviorSubject<AccountPartial[]>([])
  private harvestersUpdateInterval?: ReturnType<typeof setInterval>
  private partialsUpdateInterval?: ReturnType<typeof setInterval>
  private _pageSize = 10
  private readonly subscriptions: Subscription[] = [
    this.accountService.currentAccountIdentifier.pipe(skip(1)).subscribe(async () => {
      this.page = 1
      await Promise.all([
        this.updateHarvesters(),
        this.updatePartials(),
      ])
    })
  ]
  private readonly harvestersById: Map<string, Harvester> = new Map<string, Harvester>()

  public constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
  ) {
    this.partials = this.partialsSubject.asObservable()
    this.isLoading = this.isLoadingSubject.asObservable()
    this.showItemsPerPageSelection = this.partials.pipe(
      map(partials => partials.length > 0),
      distinctUntilChanged(),
      shareReplay(1),
    )
    this.isLoadingInitial = this.isLoadingSubject.pipe(takeWhile(isLoading => isLoading, true), shareReplay(1))
  }

  public async ngOnInit(): Promise<void> {
    this.harvestersUpdateInterval = setInterval(this.updateHarvesters.bind(this), 3 * 60 * 1000)
    await this.updateHarvesters()
    this.partialsUpdateInterval = setInterval(this.updatePartials.bind(this), 60 * 1000)
    await this.updatePartials()
    this.isLoadingSubject.next(false)
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
    if (this.harvestersUpdateInterval !== undefined) {
      clearInterval(this.harvestersUpdateInterval)
    }
    if (this.partialsUpdateInterval !== undefined) {
      clearInterval(this.partialsUpdateInterval)
    }
  }

  public toggleDateFormatting(): void {
    if (this.configService.partialDateFormatting === DateFormatting.fixed) {
      this.configService.partialDateFormatting = DateFormatting.relative
    } else {
      this.configService.partialDateFormatting = DateFormatting.fixed
    }
  }

  public getPartialDate(partial: AccountPartial): string {
    if (this.configService.partialDateFormatting === DateFormatting.fixed) {
      return moment(partial.receivedAt).format('YYYY-MM-DD HH:mm:ss')
    } else {
      return moment(partial.receivedAt).fromNow()
    }
  }

  public getPartialHarvesterName(partial: AccountPartial): string {
    const harvester = this.harvestersById.get(partial.harvester)
    if (harvester === undefined) {
      return partial.harvester
    }

    return harvester.name ?? harvester.peerId.stripHexPrefix().slice(0, 10)
  }

  public getProofTimeColor(proofTimeInSeconds: number): string {
    if (proofTimeInSeconds < 9) {
      return '#46cf76'
    }
    if (proofTimeInSeconds < 17) {
      return '#b9a44c'
    }
    if (proofTimeInSeconds < 25) {
      return '#ffaa00'
    }

    return '#ff4d4d'
  }

  public async onPageChange() {
    await this.updatePartials()
  }

  public trackBy(index: number, partial: AccountPartial): string {
    return partial.receivedAt
  }

  private async updateHarvesters({ bustCache = false } = {}): Promise<void> {
    const harvesters = await this.accountService.getAccountHarvesters({ bustCache })
    harvesters.forEach(harvester => {
      this.harvestersById.set(harvester._id, harvester)
    })
  }

  private async updatePartials(): Promise<void> {
    this.isLoadingSubject.next(true)
    try {
      const { partials, total } = await this.accountService.getAccountPartials({ page: this.page, limit: this.pageSize })
      this.partialsSubject.next(partials)
      this.total = total
    } finally {
      this.isLoadingSubject.next(false)
    }
  }

  protected readonly faExchangeAlt = faExchangeAlt
}
