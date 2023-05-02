import {Component, Input, OnDestroy} from '@angular/core'
import {StatsService} from '../stats.service'
import * as moment from 'moment'
import Capacity from '../capacity'
import {SnippetService} from '../snippet.service'
import {faCubes, faExchangeAlt, faRightLeft} from '@fortawesome/free-solid-svg-icons'
import {getEffortColor} from '../util'
import BigNumber from 'bignumber.js'
import {ConfigService, DateFormatting} from '../config.service'
import {Subscription} from 'rxjs'

@Component({
  selector: 'app-blocks-won',
  templateUrl: './blocks-won.component.html',
  styleUrls: ['./blocks-won.component.scss']
})
export class BlocksWonComponent implements OnDestroy {

  @Input() limit: number|null = null
  private _poolConfig:any = {}
  private _poolStats:any = {}
  public rewardStats:any = {}

  public faCubes = faCubes
  public faRightLeft = faRightLeft
  public page = 1
  public pageSize = 25

  private readonly subscriptions: Subscription[] = [
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig)),
    this.statsService.poolStats.asObservable().subscribe((poolStats => this.poolStats = poolStats)),
    this.statsService.rewardStats.asObservable().subscribe((rewardStats => this.rewardStats = rewardStats)),
  ]

  constructor(
    private readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
    private readonly configService: ConfigService,
  ) {}

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
  }

  get snippetService(): SnippetService {
    return this._snippetService
  }

  get dr() {
    return null
  }

  get distributionRatios() {
    if (!this.poolStats || !this.poolStats.distributionRatios) {
      return []
    }

    return this.poolStats.distributionRatios
  }

  get distributionRatiosWithNull() {
    return [null].concat(this.distributionRatios)
  }

  get distributionRatiosLength() {
    return this.distributionRatios.length
  }

  set poolConfig(poolConfig) {
    this._poolConfig = poolConfig
  }

  get poolConfig() {
    return this._poolConfig
  }

  set poolStats(stats) {
    this._poolStats = stats
  }

  get poolStats() {
    return this._poolStats
  }

  get recentlyWonBlocks() {
    const recentlyWonBlocks = this.recentlyWonBlocksUnfiltered

    if (!this.limit) {
      return recentlyWonBlocks
    }

    return recentlyWonBlocks.slice(0, this.limit)
  }

  get recentlyWonBlocksUnfiltered() {
    if (!this.rewardStats.recentlyWonBlocks) {
      return []
    }

    let recentlyWonBlocks = this.rewardStats.recentlyWonBlocks
    if (this.dr && this.distributionRatiosLength > 1) {
      recentlyWonBlocks = recentlyWonBlocks.filter(wonBlock => wonBlock.distributionRatio === this.dr)
    }

    return recentlyWonBlocks
  }

  getBlockDate(block): string {
    if (this.configService.wonBlockDateFormatting === DateFormatting.fixed) {
      return moment(block.createdAt).format('YYYY-MM-DD HH:mm')
    } else {
      return moment(block.createdAt).fromNow()
    }
  }

  getFormattedCapacityFromTiB(capacityInTiB) {
    return Capacity.fromTiB(capacityInTiB).toString()
  }

  getBlocksWonLast24H() {
    return this.recentlyWonBlocksUnfiltered
      .filter(wonBlock => moment(wonBlock.createdAt).isAfter(moment().subtract(1, 'day')))
      .length
  }

  getBlockExplorerBlockLink(block) {
    return this.poolConfig.blockExplorerBlockUrlTemplate.replace('#BLOCK#', block.height).replace('#HASH#', block.hash)
  }

  getBlockConfirms(block) {
    if (!this.poolStats.height) {
      return 0
    }

    return Math.min(Math.max(this.poolStats.height - block.height - 1, 0), this.poolConfig.blockRewardDistributionDelay)
  }

  getBlockProgress(round) {
    const confirms = this.getBlockConfirms(round)

    return (confirms / this.poolConfig.blockRewardDistributionDelay) * 100
  }

  getBlockProgressType(block) {
    const blockProgress = this.getBlockProgress(block)

    if (blockProgress >= 66) {
      return 'success'
    }
    if (blockProgress >= 33) {
      return 'primary'
    }

    return 'secondary'
  }

  getBlockDistributedLabel(block) {
    if (block.distributed) {
      return this.snippetService.getSnippet('blocks-won-component.distributed')
    }
    if (block.isRewardClaimed) {
      return this.snippetService.getSnippet('blocks-won-component.pending')
    }

    return this.snippetService.getSnippet('blocks-won-component.unclaimed')
  }

  getBlockEffort(block) {
    if (block.effort === null || block.effort === undefined) {
      return 'N/A'
    }

    return `${(block.effort * 100).toFixed(2)} %`
  }

  getEffortColor(block) {
    const effort = block.effort
    if (effort === null || effort === undefined) {
      return ''
    }

    return getEffortColor(new BigNumber(effort))
  }

  trackBy(index, block) {
    return block.hash
  }

  public toggleDateFormatting(): void {
    if (this.configService.wonBlockDateFormatting === DateFormatting.fixed) {
      this.configService.wonBlockDateFormatting = DateFormatting.relative
    } else {
      this.configService.wonBlockDateFormatting = DateFormatting.fixed
    }
  }
}
