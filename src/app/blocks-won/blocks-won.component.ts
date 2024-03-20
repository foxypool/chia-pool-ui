import {Component, Input, OnInit} from '@angular/core'
import {StatsService} from '../stats.service'
import * as moment from 'moment'
import Capacity from '../capacity'
import {SnippetService} from '../snippet.service'
import {faCubes, faRightLeft} from '@fortawesome/free-solid-svg-icons'
import {getEffortColor} from '../util'
import BigNumber from 'bignumber.js'
import {ConfigService} from '../config.service'
import {RecentlyWonBlock} from '../api/types/pool/reward-stats'
import {TransactionState} from '../api/types/transaction-state'
import {Observable} from 'rxjs'
import {map, shareReplay} from 'rxjs/operators'
import {RatesService} from '../rates.service'
import {DateFormatting} from '../date-formatting'

@Component({
  selector: 'app-blocks-won',
  templateUrl: './blocks-won.component.html',
  styleUrls: ['./blocks-won.component.scss']
})
export class BlocksWonComponent implements OnInit {
  @Input() limit: number|null = null

  public readonly faCubes = faCubes
  public readonly faRightLeft = faRightLeft
  public page = 1
  public pageSize = 25

  public recentlyWonBlocksLimited$: Observable<RecentlyWonBlock[]>
  public recentlyWonBlocksLimitedLength$: Observable<number>
  public readonly recentlyWonBlocks$: Observable<RecentlyWonBlock[]>
  public readonly numberOfBlocksWonInLast24h$: Observable<number>

  public constructor(
    public readonly statsService: StatsService,
    public readonly ratesService: RatesService,
    private readonly _snippetService: SnippetService,
    private readonly configService: ConfigService,
  ) {
    this.recentlyWonBlocks$ = this.statsService.rewardStats$.pipe(
      map(rewardStats => rewardStats.recentlyWonBlocks),
      shareReplay(1),
    )
    this.numberOfBlocksWonInLast24h$ = this.recentlyWonBlocks$.pipe(
      map(recentlyWonBlocks => {
        return recentlyWonBlocks
          .filter(wonBlock => moment(wonBlock.createdAt).isAfter(moment().subtract(1, 'day')))
          .length
      }),
      shareReplay(1),
    )
  }

  public ngOnInit() {
    this.recentlyWonBlocksLimited$ = this.recentlyWonBlocks$.pipe(
      map(recentlyWonBlocks => {
        if (!this.limit) {
          return recentlyWonBlocks
        }

        return recentlyWonBlocks.slice(0, this.limit)
      }),
      shareReplay(1),
    )
    this.recentlyWonBlocksLimitedLength$ = this.recentlyWonBlocksLimited$.pipe(map(recentlyWonBlocks => recentlyWonBlocks.length))
  }

  get snippetService(): SnippetService {
    return this._snippetService
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

  getBlockExplorerBlockLink(block) {
    return this.statsService.poolConfig?.blockExplorerBlockUrlTemplate.replace('#BLOCK#', block.height).replace('#HASH#', block.hash)
  }

  getBlockConfirms(block) {
    if (this.statsService.poolStats === undefined || this.statsService.poolConfig === undefined) {
      return 0
    }

    return Math.min(Math.max(this.statsService.poolStats.height - block.height - 1, 0), this.statsService.poolConfig.blockRewardDistributionDelay ?? 0)
  }

  getBlockProgress(round) {
    const confirms = this.getBlockConfirms(round)

    return (confirms / this.statsService.poolConfig?.blockRewardDistributionDelay ?? 1) * 100
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

  public getBlockDistributedLabel(block: RecentlyWonBlock): string {
    if (block.distributed) {
      return this.snippetService.getSnippet('blocks-won-component.distributed')
    }
    if (block.isRewardClaimed) {
      return this.snippetService.getSnippet('blocks-won-component.pending')
    }
    if ('rewardClaimTx' in block && block.rewardClaimTx?.state === TransactionState.inMempool) {
      return this.snippetService.getSnippet('blocks-won-component.in-mempool')
    }
    if ('rewardClaimTx' in block && block.rewardClaimTx?.state === TransactionState.confirmed) {
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

  public trackBy(index: number, block: RecentlyWonBlock): string {
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
