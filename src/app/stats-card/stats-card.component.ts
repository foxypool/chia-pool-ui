import {Component} from '@angular/core'
import {StatsService} from '../stats.service'
import Capacity from '../capacity'
import {SnippetService} from '../snippet.service'
import {RatesService} from '../rates.service'
import {BigNumber} from 'bignumber.js'
import {getEffortColor} from '../util'
import {faInfoCircle} from '@fortawesome/free-solid-svg-icons'
import {Observable} from 'rxjs'
import {map, shareReplay} from 'rxjs/operators'

@Component({
  selector: 'app-stats-card',
  templateUrl: './stats-card.component.html',
  styleUrls: ['./stats-card.component.scss']
})
export class StatsCardComponent {
  public readonly faInfoCircle = faInfoCircle
  public readonly heightInfo$: Observable<string>

  public get areAccountStatsLoading(): boolean {
    return this.statsService.accountStats === undefined
  }

  public get areRewardStatsLoading(): boolean {
    return this.statsService.rewardStats === undefined
  }

  public get isPoolConfigLoading(): boolean {
    return this.statsService.poolConfig === undefined
  }

  public get arePoolStatsLoading(): boolean {
    return this.statsService.poolStats === undefined
  }

  public get dailyRewardPerPiB(): number {
    if (this.statsService.rewardStats === undefined) {
      return 0
    }

    return this.statsService.rewardStats.dailyRewardPerPiB
  }

  public get networkSpaceInTiB(): string {
    if (this.statsService.poolStats === undefined) {
      return '0'
    }

    return this.statsService.poolStats.networkSpaceInTiB
  }

  public get dailyRewardPerPiBFormatted(): string {
    return this.dailyRewardPerPiB.toFixed(2)
  }

  public get currentEffort(): BigNumber | null {
    if (this.isPoolConfigLoading || this.areRewardStatsLoading || this.areAccountStatsLoading) {
      return null
    }
    const rewardStats = this.statsService.rewardStats
    const accountStats = this.statsService.accountStats
    if (rewardStats.recentlyWonBlocks.length === 0 || accountStats.ecSum === 0) {
      return null
    }

    const lastWonBlockHeight = rewardStats.recentlyWonBlocks[0].height
    const passedBlocks = this.statsService.poolStats.height - lastWonBlockHeight
    const chanceToWinABlock = (new BigNumber(accountStats.ecSum)).dividedBy(1024).dividedBy(this.statsService.poolStats.networkSpaceInTiB)
    const blockCountFor100PercentEffort = new BigNumber(1).dividedBy(chanceToWinABlock)

    return (new BigNumber(passedBlocks)).dividedBy(blockCountFor100PercentEffort)
  }

  public get currentEffortFormatted(): string {
    const effort = this.currentEffort
    if (effort === null) {
      return 'N/A'
    }

    return `${effort.multipliedBy(100).toFixed(2)} %`
  }

  public get averageEffort(): BigNumber|null {
    if (this.statsService.rewardStats === undefined || this.statsService.rewardStats.averageEffort === null) {
      return null
    }

    return new BigNumber(this.statsService.rewardStats.averageEffort)
  }

  public get averageEffortFormatted(): string {
    const effort = this.averageEffort
    if (effort === null) {
      return 'N/A'
    }

    return `${effort.multipliedBy(100).toFixed(2)} %`
  }

  constructor(
    public readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
    public ratesService: RatesService,
  ) {
    this.heightInfo$ = this.statsService.poolStatsSubject.pipe(map(stats => stats?.height.toLocaleString('en') ?? 'N/A'), shareReplay(1))
  }

  public get snippetService(): SnippetService {
    return this._snippetService
  }

  public getFormattedCapacityFromTiB(capacityInTiB): string {
    return Capacity.fromTiB(capacityInTiB).toString()
  }

  public getFormattedCapacityFromGiB(capacityInGiB): string {
    return new Capacity(capacityInGiB).toString()
  }

  public getEffortColor(effort): string {
    return getEffortColor(effort)
  }
}
