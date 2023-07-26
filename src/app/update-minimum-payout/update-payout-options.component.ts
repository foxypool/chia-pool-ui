import {Component} from '@angular/core'
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons'
import {BigNumber} from 'bignumber.js'
import {AccountService} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'
import {StatsService} from '../stats.service'

@Component({
  selector: 'app-update-payout-options',
  templateUrl: './update-payout-options.component.html',
  styleUrls: ['./update-payout-options.component.scss']
})
export class UpdatePayoutOptionsComponent {
  public faCircleNotch = faCircleNotch
  private _newMinimumPayout?: BigNumber
  private _newPayoutMultiplesOf?: BigNumber

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
    private readonly statsService: StatsService,
  ) {
    this.newMinimumPayout = this.accountService.account?.minimumPayout
    this.newPayoutMultiplesOf = this.accountService.account?.payoutMultiplesOf
  }

  public get poolConfigMinimumPayout(): number {
    return this.statsService.poolConfig?.minimumPayout ?? 0.01
  }

  public get ticker(): string|undefined {
    return this.statsService.poolConfig?.ticker
  }

  public async updatePayoutOptions() {
    if (this.accountService.isUpdatingAccount) {
      return
    }
    try {
      const newMinimumPayout = this.newMinimumPayoutString
      const newPayoutMultiplesOf = this.newPayoutMultiplesOfString
      await this.accountService.updatePayoutOptions({ newMinimumPayout, newPayoutMultiplesOf })
      this.toastService.showSuccessToast('Successfully saved the payout settings')
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  public get isValidMinimumPayout(): boolean {
    if (this._newMinimumPayout === undefined) {
      return true
    }

    return !this._newMinimumPayout.isNaN() && this._newMinimumPayout.isGreaterThanOrEqualTo(this.poolConfigMinimumPayout)
  }

  public get isValidPayoutMultiplesOf(): boolean {
    if (this._newPayoutMultiplesOf === undefined) {
      return true
    }

    return !this._newPayoutMultiplesOf.isNaN() && this._newPayoutMultiplesOf.isGreaterThanOrEqualTo(this.poolConfigMinimumPayout)
  }

  public get newMinimumPayout(): number|undefined {
    return this._newMinimumPayout?.toNumber()
  }

  public set newMinimumPayout(value: number|string|undefined|null) {
    this._newMinimumPayout = value ? new BigNumber(value) : undefined
  }

  public get newPayoutMultiplesOf(): number|undefined {
    return this._newPayoutMultiplesOf?.toNumber()
  }

  public set newPayoutMultiplesOf(value: number|string|undefined|null) {
    this._newPayoutMultiplesOf = value ? new BigNumber(value) : undefined
  }

  private get newMinimumPayoutString(): string|undefined {
    return this._newMinimumPayout?.toString()
  }

  private get newPayoutMultiplesOfString(): string|undefined {
    return this._newPayoutMultiplesOf?.toString()
  }

  private get isNewMinimumPayout(): boolean {
    return this.accountService.account?.minimumPayout !== this.newMinimumPayoutString
  }

  private get isNewPayoutMultiplesOf(): boolean {
    return this.accountService.account?.payoutMultiplesOf !== this.newPayoutMultiplesOfString
  }

  public get canUpdatePayoutOptions(): boolean {
    if (this.accountService.isUpdatingAccount) {
      return false
    }
    if (!this.isValidMinimumPayout || !this.isValidPayoutMultiplesOf) {
      return false
    }

    return this.isNewMinimumPayout || this.isNewPayoutMultiplesOf
  }
}
