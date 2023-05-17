import {Component} from '@angular/core'
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'
import {AccountService} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'
import {BigNumber} from 'bignumber.js'
import {Options} from '@angular-slider/ngx-slider'
import {stepsArray} from '../harvester-offline-duration-options'

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
  public areHarvesterOfflineNotificationsEnabled = false
  public newHarvesterOfflineDurationInMinutes: number

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
  ) {
    this.newEcLastHourThresholdInGib = this.currentEcLastHourThresholdInGib
    this.areEcChangeNotificationsEnabled = this.currentAreEcChangeNotificationsEnabled
    this.areBlockWonNotificationsEnabled = this.currentAreBlockWonNotificationsEnabled
    this.arePayoutAddressChangeNotificationsEnabled = this.currentArePayoutAddressChangeNotificationsEnabled
    this.areHarvesterOfflineNotificationsEnabled = this.currentAreHarvesterOfflineNotificationsEnabled
    this.newHarvesterOfflineDurationInMinutes = this.currentHarvesterOfflineDurationInMinutes
  }

  public get harvesterOfflineDurationOptions(): Options {
    return {
      showTicks: true,
      showTicksValues: false,
      hidePointerLabels: true,
      showSelectionBar: true,
      disabled: !this.areHarvesterOfflineNotificationsEnabled,
      stepsArray,
    }
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
        areHarvesterOfflineNotificationsEnabled: this.areHarvesterOfflineNotificationsEnabled,
        harvesterOfflineDurationInMinutes: this.newHarvesterOfflineDurationInMinutes,
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

  private get currentAreHarvesterOfflineNotificationsEnabled(): boolean {
    return this.accountService.account.notificationSettings?.areHarvesterOfflineNotificationsEnabled ?? false
  }

  private get currentEcLastHourThresholdInGib(): number {
    return this.accountService.account.notificationSettings?.ecLastHourThreshold ?? 0
  }

  private get currentHarvesterOfflineDurationInMinutes(): number {
    return this.accountService.account.notificationSettings?.harvesterOfflineDurationInMinutes ?? 20
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
    if (this.areHarvesterOfflineNotificationsEnabled !== this.currentAreHarvesterOfflineNotificationsEnabled) {
      return true
    }
    if (this.newHarvesterOfflineDurationInMinutes !== this.currentHarvesterOfflineDurationInMinutes) {
      return true
    }

    return this.arePayoutAddressChangeNotificationsEnabled !== this.currentArePayoutAddressChangeNotificationsEnabled
  }
}
