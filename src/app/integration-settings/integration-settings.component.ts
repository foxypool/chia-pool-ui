import { Component } from '@angular/core'
import {AccountService} from '../account.service'
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'
import {ToastService} from '../toast.service'
import {ChiaDashboardApi, getBestChiaDashboardApiBaseUrl} from '../integrations/chia-dashboard-api/api'
import {AsyncValidatorFn, FormBuilder} from '@angular/forms'
import {debounceTime, switchMap} from 'rxjs'
import {distinctUntilChanged, first, map} from 'rxjs/operators'
import {fromPromise} from 'rxjs/internal/observable/innerFrom'

@Component({
  selector: 'app-integration-settings',
  templateUrl: './integration-settings.component.html',
  styleUrls: ['./integration-settings.component.scss']
})
export class IntegrationSettingsComponent {
  public get newChiaDashboardShareKey(): string|undefined {
    const value = this.form.controls['chiaDashboardShareKey'].getRawValue()

    return value === '' ? undefined : value
  }

  public isValidatingShareKey: boolean = false

  public readonly form = this.formBuilder.group({
    chiaDashboardShareKey: [
      this.accountService.account?.integrations?.chiaDashboardShareKey,
      {
        asyncValidators: [
          this.makeShareKeyValidator(),
        ],
        updateOn: 'change',
      },
    ],
  })

  public get canUpdateIntegrations(): boolean {
    if (this.accountService.isUpdatingAccount) {
      return false
    }
    if (!this.form.valid || this.isValidatingShareKey) {
      return false
    }

    return this.isNewChiaDashboardShareKey
  }

  protected readonly faCircleNotch = faCircleNotch

  private get isNewChiaDashboardShareKey(): boolean {
    return this.accountService.account?.integrations?.chiaDashboardShareKey !== this.newChiaDashboardShareKey
  }

  public constructor(
    public readonly accountService: AccountService,
    private readonly toastService: ToastService,
    private readonly formBuilder: FormBuilder,
  ) {}

  public async updateIntegrations() {
    if (this.accountService.isUpdatingAccount) {
      return
    }
    try {
      const newChiaDashboardShareKey = this.newChiaDashboardShareKey
      await this.accountService.updateIntegrations({ chiaDashboardShareKey: newChiaDashboardShareKey })
      this.toastService.showSuccessToast('Successfully updated the integration settings')
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  private makeShareKeyValidator(): AsyncValidatorFn {
    return control => control.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => fromPromise(this.validateShareKey(value))),
      map((isValid: boolean) => (isValid ? null : { invalid: true })),
      first(),
    )
  }

  private async validateShareKey(shareKey: string|undefined): Promise<boolean> {
    shareKey = shareKey === '' ? undefined : shareKey
    if (shareKey === undefined) {
      return true
    }

    this.isValidatingShareKey = true
    try {
      const baseUrl = await getBestChiaDashboardApiBaseUrlMemoized()
      const api = new ChiaDashboardApi(baseUrl, shareKey)

      return await api.isValidShareKey()
    } finally {
      this.isValidatingShareKey = false
    }
  }
}

let bestApiBaseUrl: string|undefined
async function getBestChiaDashboardApiBaseUrlMemoized() {
  if (bestApiBaseUrl === undefined) {
    bestApiBaseUrl = await getBestChiaDashboardApiBaseUrl()
  }

  return bestApiBaseUrl
}
