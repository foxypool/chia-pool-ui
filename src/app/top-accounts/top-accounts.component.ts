import {StatsService} from '../stats.service'
import {Component} from '@angular/core'
import Capacity from '../capacity'
import {SnippetService} from '../snippet.service'
import {faHdd} from '@fortawesome/free-regular-svg-icons'
import {map, shareReplay} from 'rxjs/operators'
import {Observable} from 'rxjs'
import {getAccountIdentifier} from '../api/types/account/top-account'

interface TopAccountFormatted {
  accountIdentifier: string
  name?: string
  payoutAddress: string
  pendingRounded: number
  collateralRounded?: number
  capacity: string
  capacityShare: string
}

@Component({
  selector: 'app-top-accounts',
  templateUrl: './top-accounts.component.html',
  styleUrls: ['./top-accounts.component.scss']
})
export class TopAccountsComponent {
  public readonly faHdd = faHdd

  public readonly topAccounts$: Observable<TopAccountFormatted[]>

  constructor(
    public readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
  ) {
    this.topAccounts$ = this.statsService.accountStats$.pipe(
      map(stats => stats.topAccounts.map(topAccount => ({
        accountIdentifier: getAccountIdentifier(topAccount),
        name: topAccount.name,
        payoutAddress: topAccount.payoutAddress,
        capacity: this.getFormattedCapacity(topAccount.ec),
        capacityShare: this.getEcShare(topAccount),
        pendingRounded: (topAccount as any).pendingRounded,
        collateralRounded: (topAccount as any).collateralRounded,
      }))),
      shareReplay()
    )
  }

  get snippetService(): SnippetService {
    return this._snippetService
  }

  private getFormattedCapacity(capacityInGiB): string {
    if (capacityInGiB === 0) {
      return this.snippetService.getSnippet('general.not-available.short')
    }

    return (new Capacity(capacityInGiB)).toString()
  }

  private getEcShare(account): string {
    if (!this.statsService.accountStats?.ecSum) {
      return '0'
    }

    return ((account.ec / this.statsService.accountStats.ecSum) * 100).toFixed(2)
  }

  public trackBy(index: number, account: TopAccountFormatted): string {
    return account.accountIdentifier
  }
}
