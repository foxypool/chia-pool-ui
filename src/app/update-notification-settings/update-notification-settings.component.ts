import {Component} from '@angular/core'
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'
import {AccountService} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'
import {BigNumber} from 'bignumber.js'

@Component({
  selector: 'app-update-notification-settings',
  templateUrl: './update-notification-settings.component.html',
  styleUrls: ['./update-notification-settings.component.scss'],
})
export class UpdateNotificationSettingsComponent {
  public possibleCapacityDenominators: string[] = ['GiB', 'TiB', 'PiB']
  public selectedCapacityDenominator = 'TiB'
  public faCircleNotch = faCircleNotch
  public newEcLastHourThresholdInGib: number | undefined
  public areEcChangeNotificationsEnabled = false
  public areBlockWonNotificationsEnabled = false
  public arePayoutAddressChangeNotificationsEnabled = false

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
  ) {
    this.newEcLastHourThresholdInGib = this.currentEcLastHourThresholdInGib
    this.areEcChangeNotificationsEnabled = this.currentAreEcChangeNotificationsEnabled
    this.areBlockWonNotificationsEnabled = this.currentAreBlockWonNotificationsEnabled
    this.arePayoutAddressChangeNotificationsEnabled = this.currentArePayoutAddressChangeNotificationsEnabled
  }

  public get newEcLastHourThreshold(): number {
    switch (this.selectedCapacityDenominator) {
      case 'GiB': return this.newEcLastHourThresholdInGib
      case 'TiB': return new BigNumber(this.newEcLastHourThresholdInGib).dividedBy(1024).toNumber()
      case 'PiB': return new BigNumber(this.newEcLastHourThresholdInGib).dividedBy(1024).dividedBy(1024).toNumber()
    }
  }

  public set newEcLastHourThreshold(newValue: number) {
    switch (this.selectedCapacityDenominator) {
      case 'GiB':
        this.newEcLastHourThresholdInGib = newValue
        break
      case 'TiB':
        this.newEcLastHourThresholdInGib = new BigNumber(newValue).multipliedBy(1024).toNumber()
        break
      case 'PiB':
        this.newEcLastHourThresholdInGib = new BigNumber(newValue).multipliedBy(1024).multipliedBy(1024).toNumber()
        break
    }
  }

  public get currentEcLastHourThreshold(): number {
    switch (this.selectedCapacityDenominator) {
      case 'GiB': return this.currentEcLastHourThresholdInGib
      case 'TiB': return new BigNumber(this.currentEcLastHourThresholdInGib).dividedBy(1024).toNumber()
      case 'PiB': return new BigNumber(this.currentEcLastHourThresholdInGib).dividedBy(1024).dividedBy(1024).toNumber()
    }
  }

  public get isValidEcLastHourThreshold(): boolean {
    return this.newEcLastHourThresholdInGib !== undefined && this.newEcLastHourThresholdInGib >= 0
  }

  public get canUpdateNotificationSettings(): boolean {
    return !this.accountService.isUpdatingAccount && this.isValidEcLastHourThreshold && this.areValuesChanged
  }

  public async updateNotificationSettings(): Promise<void> {
    if (this.accountService.isUpdatingAccount) {
      return
    }
    try {
      await this.accountService.updateNotificationSettings({
        ecLastHourThreshold: this.newEcLastHourThresholdInGib,
        areEcChangeNotificationsEnabled: this.areEcChangeNotificationsEnabled,
        areBlockWonNotificationsEnabled: this.areBlockWonNotificationsEnabled,
        arePayoutAddressChangeNotificationsEnabled: this.arePayoutAddressChangeNotificationsEnabled,
      })
      this.toastService.showSuccessToast('Successfully saved the notification settings')
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  private get currentAreEcChangeNotificationsEnabled(): boolean {
    return this.accountService.account.notificationSettings?.areEcChangeNotificationsEnabled ?? false
  }

  private get currentAreBlockWonNotificationsEnabled(): boolean {
    return this.accountService.account.notificationSettings?.areBlockWonNotificationsEnabled ?? false
  }

  private get currentArePayoutAddressChangeNotificationsEnabled(): boolean {
    return this.accountService.account.notificationSettings?.arePayoutAddressChangeNotificationsEnabled ?? false
  }

  private get currentEcLastHourThresholdInGib(): number {
    return this.accountService.account.notificationSettings?.ecLastHourThreshold ?? 0
  }

  private get areValuesChanged(): boolean {
    if (this.newEcLastHourThresholdInGib !== this.currentEcLastHourThresholdInGib) {
      return true
    }
    if (this.areEcChangeNotificationsEnabled !== this.currentAreEcChangeNotificationsEnabled) {
      return true
    }
    if (this.areBlockWonNotificationsEnabled !== this.currentAreBlockWonNotificationsEnabled) {
      return true
    }

    return this.arePayoutAddressChangeNotificationsEnabled !== this.currentArePayoutAddressChangeNotificationsEnabled
  }
}
