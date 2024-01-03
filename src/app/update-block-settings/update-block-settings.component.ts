import { Component } from '@angular/core'
import {AccountService} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons'

@Component({
  selector: 'app-update-block-settings',
  templateUrl: './update-block-settings.component.html',
  styleUrls: ['./update-block-settings.component.scss']
})
export class UpdateBlockSettingsComponent {
  public faCircleNotch = faCircleNotch
  public ignoreDifferingFarmerRewardAddresses: boolean = false

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
  ) {
    this.ignoreDifferingFarmerRewardAddresses = this.currentIgnoreDifferingFarmerRewardAddresses
  }

  public get canUpdateSettings(): boolean {
    return !this.accountService.isUpdatingAccount && this.areValuesChanged
  }

  public async updateSettings(): Promise<void> {
    if (this.accountService.isUpdatingAccount) {
      return
    }
    try {
      await this.accountService.updateSettings({
        blocks: {
          ignoreDifferingFarmerRewardAddresses: this.ignoreDifferingFarmerRewardAddresses,
        },
      })
      this.toastService.showSuccessToast('Successfully saved the settings')
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  private get currentIgnoreDifferingFarmerRewardAddresses(): boolean {
    return this.accountService.account.settings?.blocks.ignoreDifferingFarmerRewardAddresses ?? false
  }

  private get areValuesChanged(): boolean {
    return this.ignoreDifferingFarmerRewardAddresses !== this.currentIgnoreDifferingFarmerRewardAddresses
  }
}
