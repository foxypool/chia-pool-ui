import { Component } from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome'
import {FormsModule} from '@angular/forms'
import {NgIf} from '@angular/common'
import {AccountService, UpdateAccountRewardOptions} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'
import {faCircleNotch, faInfoCircle} from '@fortawesome/free-solid-svg-icons'
import {
  getDistributionRatioPartsFromString,
  isDistributionRatioPartValid,
  isValidDistributionRatio
} from '../distribution-ratio-util'

@Component({
  selector: 'app-update-reward-settings',
  standalone: true,
  imports: [
    FaIconComponent,
    FormsModule,
    NgIf,
  ],
  templateUrl: './update-reward-settings.component.html',
  styleUrl: './update-reward-settings.component.scss'
})
export class UpdateRewardSettingsComponent {
  public get blockWinnerRatio(): number {
    const [blockWinnerRatio] = getDistributionRatioPartsFromString(this.distributionRatio)

    return blockWinnerRatio
  }

  public set blockWinnerRatio(ratio: number) {
    this.isBlockWinnerRatioInvalid = !isDistributionRatioPartValid(ratio)
    if (this.isBlockWinnerRatioInvalid) {
      return
    }
    const roundedRatio = Math.round(ratio)
    this.distributionRatio = `${roundedRatio}-${100 - roundedRatio}`
    this.isHistoricalRatioInvalid = false
  }

  public get historicalRatio(): number {
    const [_, historicalRatio] = getDistributionRatioPartsFromString(this.distributionRatio)

    return historicalRatio
  }

  public set historicalRatio(ratio: number) {
    this.isHistoricalRatioInvalid = !isDistributionRatioPartValid(ratio)
    if (this.isHistoricalRatioInvalid) {
      return
    }
    const roundedRatio = Math.round(ratio)
    this.distributionRatio = `${100 - roundedRatio}-${roundedRatio}`
    this.isBlockWinnerRatioInvalid = false
  }

  public faCircleNotch = faCircleNotch
  public distributionRatio: string
  public isBlockWinnerRatioInvalid: boolean = false
  public isHistoricalRatioInvalid: boolean = false

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
  ) {
    this.distributionRatio = this.currentDistributionRatio
  }

  public get canUpdateSettings(): boolean {
    return !this.accountService.isUpdatingAccount && this.areValuesChanged && this.isValid
  }

  public async updateSettings(): Promise<void> {
    if (this.accountService.isUpdatingAccount) {
      return
    }
    const options: UpdateAccountRewardOptions = {}
    if (this.distributionRatio !== this.currentDistributionRatio) {
      options.newDistributionRatio = this.distributionRatio
    }
    try {
      await this.accountService.updateRewardOptions(options)
      let timeout = 1500
      let notificationText = 'Successfully saved the settings'
      if (options.newDistributionRatio !== undefined) {
        notificationText += ', the new DR will be applied after about 5 minutes'
        timeout = 10_000
      }
      this.toastService.showSuccessToast(notificationText, '', { timeOut: timeout })
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  public get isValidDistributionRatio(): boolean {
    return isValidDistributionRatio(this.distributionRatio)
  }

  private get isValid(): boolean {
    return this.isValidDistributionRatio && !this.isBlockWinnerRatioInvalid && !this.isHistoricalRatioInvalid
  }

  private get currentDistributionRatio(): string {
    return this.accountService.account.distributionRatio
  }

  private get areValuesChanged(): boolean {
    return this.distributionRatio !== this.currentDistributionRatio
  }

  protected readonly faInfoCircle = faInfoCircle
}
