import {Component} from '@angular/core'
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons'
import {AccountService, UpdateAccountSettingsOptions} from '../account.service'
import {ToastService} from '../toast.service'
import {SnippetService} from '../snippet.service'

@Component({
  selector: 'app-update-account',
  templateUrl: './update-account.component.html',
  styleUrls: ['./update-account.component.scss']
})
export class UpdateAccountComponent {
  public newName = null
  public newImageUrl?: string
  public faCircleNotch = faCircleNotch

  private get newImageUrlTrimmed(): string|undefined {
    const newImageUrl = this.newImageUrl?.trim()
    if (newImageUrl === '') {
      return undefined
    }

    return newImageUrl
  }

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
  ) {
    this.newName = this.accountService.account.name
    this.newImageUrl = this.accountService.account?.settings.profile?.imageUrl
  }

  get isNewNameValid(): boolean {
    return !this.newNameOrUndefined || this.newNameOrUndefined.length <= 64
  }

  public get isNewImageUrlValid(): boolean {
    if (this.newImageUrlTrimmed === undefined) {
      return true
    }

    let url: URL
    try {
      url = new URL(this.newImageUrlTrimmed)
    } catch (_) {
      return false
    }

    return url.protocol === 'https:' && this.newImageUrlTrimmed.length < 1024
  }

  get canUpdateAccount(): boolean {
    if (this.accountService.isUpdatingAccount) {
      return false
    }
    if (!this.isNewNameValid || !this.isNewImageUrlValid) {
      return false
    }
    if (this.accountService.account.name !== this.newNameOrUndefined) {
      return true
    }

    return this.accountService.account?.settings.profile?.imageUrl !== this.newImageUrlTrimmed
  }

  get newNameOrUndefined(): string|undefined {
    return this.newName ? this.newName.trim() : undefined
  }

  async updateAccount(): Promise<void> {
    if (this.accountService.isUpdatingAccount) {
      return
    }
    const updateOptions: UpdateAccountSettingsOptions = {}
    let willUpdateName = false
    const newName = this.newNameOrUndefined
    if (newName !== this.accountService.account?.name) {
      updateOptions.name = newName
      willUpdateName = true
    }
    let willUpdateImageUrl = false
    const newImageUrl = this.newImageUrlTrimmed
    if (newImageUrl !== this.accountService.account?.settings.profile?.imageUrl) {
      updateOptions.imageUrl = newImageUrl
      willUpdateImageUrl = true
    }
    try {
      await this.accountService.updateAccountSettings(updateOptions)
      if (willUpdateName) {
        if (newName) {
          this.toastService.showSuccessToast(this.snippetService.getSnippet('update-name-modal.update-success', newName))
        } else {
          this.toastService.showSuccessToast(this.snippetService.getSnippet('update-name-modal.remove-success'))
        }
      }
      if (willUpdateImageUrl) {
        if (newImageUrl) {
          this.toastService.showSuccessToast('Successfully updated the account image url')
        } else {
          this.toastService.showSuccessToast('Successfully removed the account image url')
        }
      }
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }
}
