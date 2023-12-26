import {Component} from '@angular/core'
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons'
import {AccountService, UpdateAccountSettingsOptions} from '../account.service'
import {ToastService} from '../toast.service'
import {SnippetService} from '../snippet.service'
import {AsyncValidatorFn, FormBuilder} from '@angular/forms'
import {debounceTime, switchMap} from 'rxjs'
import {distinctUntilChanged, first, map} from 'rxjs/operators'
import {fromPromise} from 'rxjs/internal/observable/innerFrom'
import axios from 'axios'

@Component({
  selector: 'app-update-account',
  templateUrl: './update-account.component.html',
  styleUrls: ['./update-account.component.scss']
})
export class UpdateAccountComponent {
  public newName = null
  public isValidatingImageUrl: boolean = false
  public readonly faCircleNotch = faCircleNotch
  public readonly imageUrlForm = this.formBuilder.group({
    imageUrl: [
      this.accountService.account?.settings.profile?.imageUrl,
      {
        asyncValidators: [
          this.makeImageUrlValidator(),
        ],
        updateOn: 'change',
      },
    ],
  })

  public get newImageUrl(): string|undefined {
    const value = this.imageUrlForm.controls['imageUrl'].getRawValue()
    if (value === null || value === undefined) {
      return undefined
    }
    const trimmedValue = value.trim()

    return trimmedValue === '' ? undefined : trimmedValue
  }

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
    private readonly formBuilder: FormBuilder,
  ) {
    this.newName = this.accountService.account.name
  }

  get isNewNameValid(): boolean {
    return !this.newNameOrUndefined || this.newNameOrUndefined.length <= 64
  }

  get canUpdateAccount(): boolean {
    if (this.accountService.isUpdatingAccount) {
      return false
    }
    if (!this.isNewNameValid || (this.imageUrlForm.dirty && !this.imageUrlForm.valid)) {
      return false
    }
    if (this.accountService.account.name !== this.newNameOrUndefined) {
      return true
    }

    return this.accountService.account?.settings.profile?.imageUrl !== this.newImageUrl
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
    const newImageUrl = this.newImageUrl
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

  private makeImageUrlValidator(): AsyncValidatorFn {
    return control => control.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => fromPromise(this.isValidImageUrl(value))),
      map((isValid: boolean) => (isValid ? null : { invalid: true })),
      first(),
    )
  }

  private async isValidImageUrl(imageUrl: string|null|undefined): Promise<boolean> {
    if (imageUrl === null || imageUrl === undefined) {
      return true
    }
    imageUrl = imageUrl.trim()
    if (imageUrl === '') {
      return true
    }

    this.isValidatingImageUrl = true
    try {
      const url = new URL(imageUrl)

      if (url.protocol !== 'https:' || imageUrl.length >= 1024) {
        return false
      }
      await axios.get(imageUrl)

      return true
    } catch (_) {
      return false
    } finally {
      this.isValidatingImageUrl = false
    }
  }
}
