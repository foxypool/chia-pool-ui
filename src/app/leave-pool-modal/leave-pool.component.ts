import {Component} from '@angular/core'
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons'
import {AccountService} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'
import {PoolsProvider} from '../pools.provider'
import {OgAccount} from '../api/types/account/account'

@Component({
  selector: 'app-leave-pool',
  templateUrl: './leave-pool.component.html',
  styleUrls: ['./leave-pool.component.scss']
})
export class LeavePoolComponent {
  public leaveForEver = false
  public faCircleNotch = faCircleNotch

  private get account(): OgAccount|null {
    return this.accountService.account as OgAccount|null
  }

  public constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
    private readonly poolsProvider: PoolsProvider
  ) {}

  public get haveCollateral() {
    return this.account && this.account.collateral !== undefined
  }

  public async leaveThePool() {
    if (this.accountService.isAuthenticating) {
      return
    }
    let errorOccurred = false
    setTimeout(() => {
      if (errorOccurred) {
        return
      }
      this.toastService.showInfoToast(this.snippetService.getSnippet('leave-pool-modal.leaving-info-toast'), '', {
        timeOut: 15 * 1000,
      })
    }, 2 * 1000)
    try {
      await this.accountService.leavePool({ leaveForEver: this.leaveForEver })
      this.toastService.showSuccessToast(this.snippetService.getSnippet('leave-pool-modal.success'))
    } catch (err) {
      errorOccurred = true
      this.toastService.showErrorToast(err.message)
    }
  }

  public get leavePoolGuideUrl() {
    return `https://docs.foxypool.io/proof-of-spacetime/foxy-pool/pools/${this.poolsProvider.poolIdentifier}/getting-started/#leaving-the-pool`
  }
}
