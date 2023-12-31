import {Component} from '@angular/core'
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'
import {AccountService} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'
import {BigNumber} from 'bignumber.js'
import {options} from '../harvester-offline-duration-options'
import {Options} from 'ngx-slider-v2'

@Component({
  selector: 'app-update-notification-settings',
  templateUrl: './update-notification-settings.component.html',
  styleUrls: ['./update-notification-settings.component.scss'],
})
export class UpdateNotificationSettingsComponent {
  public possibleCapacityDenominators: string[] = ['GiB', 'TiB', 'PiB']
  public selectedCurrentEcCapacityDenominator = 'TiB'
  public selectedAverageEcCapacityDenominator = 'TiB'
  public faCircleNotch = faCircleNotch
  public newCurrentEcThresholdInGib: number
  public newAverageEcThresholdInGib: number
  public areCurrentEcChangeNotificationsEnabled = false
  public areAverageEcChangeNotificationsEnabled = false
  public areBlockWonNotificationsEnabled = false
  public arePayoutAddressChangeNotificationsEnabled = false
  public areHarvesterOfflineNotificationsEnabled = false
  public newHarvesterOfflineDurationInMinutes: number

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
  ) {
    this.newCurrentEcThresholdInGib = this.currentEcLastHourThresholdInGib
    this.newAverageEcThresholdInGib = this.currentAverageEcThresholdInGib
    this.areCurrentEcChangeNotificationsEnabled = this.currentAreEcChangeNotificationsEnabled
    this.areAverageEcChangeNotificationsEnabled = this.currentAreAverageEcChangeNotificationsEnabled
    this.areBlockWonNotificationsEnabled = this.currentAreBlockWonNotificationsEnabled
    this.arePayoutAddressChangeNotificationsEnabled = this.currentArePayoutAddressChangeNotificationsEnabled
    this.areHarvesterOfflineNotificationsEnabled = this.currentAreHarvesterOfflineNotificationsEnabled
    this.newHarvesterOfflineDurationInMinutes = this.currentHarvesterOfflineDurationInMinutes
  }

  public get harvesterOfflineDurationOptions(): Options {
    return {
      ...options,
      disabled: !this.areHarvesterOfflineNotificationsEnabled,
    }
  }

  public get newEcLastHourThreshold(): number {
    switch (this.selectedCurrentEcCapacityDenominator) {
      case 'GiB': return this.newCurrentEcThresholdInGib
      case 'TiB': return new BigNumber(this.newCurrentEcThresholdInGib).dividedBy(1024).toNumber()
      case 'PiB': return new BigNumber(this.newCurrentEcThresholdInGib).dividedBy(1024).dividedBy(1024).toNumber()
    }
  }

  public set newEcLastHourThreshold(newValue: number) {
    switch (this.selectedCurrentEcCapacityDenominator) {
      case 'GiB':
        this.newCurrentEcThresholdInGib = newValue
        break
      case 'TiB':
        this.newCurrentEcThresholdInGib = new BigNumber(newValue).multipliedBy(1024).toNumber()
        break
      case 'PiB':
        this.newCurrentEcThresholdInGib = new BigNumber(newValue).multipliedBy(1024).multipliedBy(1024).toNumber()
        break
    }
  }

  public get newAverageEcThreshold(): number {
    switch (this.selectedAverageEcCapacityDenominator) {
      case 'GiB': return this.newAverageEcThresholdInGib
      case 'TiB': return new BigNumber(this.newAverageEcThresholdInGib).dividedBy(1024).toNumber()
      case 'PiB': return new BigNumber(this.newAverageEcThresholdInGib).dividedBy(1024).dividedBy(1024).toNumber()
    }
  }

  public set newAverageEcThreshold(newValue: number) {
    switch (this.selectedAverageEcCapacityDenominator) {
      case 'GiB':
        this.newAverageEcThresholdInGib = newValue
        break
      case 'TiB':
        this.newAverageEcThresholdInGib = new BigNumber(newValue).multipliedBy(1024).toNumber()
        break
      case 'PiB':
        this.newAverageEcThresholdInGib = new BigNumber(newValue).multipliedBy(1024).multipliedBy(1024).toNumber()
        break
    }
  }

  public get currentEcLastHourThreshold(): number {
    switch (this.selectedCurrentEcCapacityDenominator) {
      case 'GiB': return this.currentEcLastHourThresholdInGib
      case 'TiB': return new BigNumber(this.currentEcLastHourThresholdInGib).dividedBy(1024).toNumber()
      case 'PiB': return new BigNumber(this.currentEcLastHourThresholdInGib).dividedBy(1024).dividedBy(1024).toNumber()
    }
  }

  public get currentAverageEcThreshold(): number {
    switch (this.selectedAverageEcCapacityDenominator) {
      case 'GiB': return this.currentAverageEcThresholdInGib
      case 'TiB': return new BigNumber(this.currentAverageEcThresholdInGib).dividedBy(1024).toNumber()
      case 'PiB': return new BigNumber(this.currentAverageEcThresholdInGib).dividedBy(1024).dividedBy(1024).toNumber()
    }
  }

  public get isValidAverageEcThreshold(): boolean {
    return this.newAverageEcThresholdInGib !== undefined && this.newAverageEcThresholdInGib >= 0
  }

  public get isValidEcLastHourThreshold(): boolean {
    return this.newCurrentEcThresholdInGib !== undefined && this.newCurrentEcThresholdInGib >= 0
  }

  public get canUpdateNotificationSettings(): boolean {
    return !this.accountService.isUpdatingAccount && this.isValidEcLastHourThreshold && this.isValidAverageEcThreshold && this.areValuesChanged
  }

  public async updateNotificationSettings(): Promise<void> {
    if (this.accountService.isUpdatingAccount) {
      return
    }
    try {
      await this.accountService.updateNotificationSettings({
        ecLastHourThreshold: this.newCurrentEcThresholdInGib,
        averageEcThreshold: this.newAverageEcThresholdInGib,
        areEcChangeNotificationsEnabled: this.areCurrentEcChangeNotificationsEnabled,
        areAverageEcChangeNotificationsEnabled: this.areAverageEcChangeNotificationsEnabled,
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

  private get currentAreAverageEcChangeNotificationsEnabled(): boolean {
    return this.accountService.account.notificationSettings?.areAverageEcChangeNotificationsEnabled ?? false
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

  private get currentAverageEcThresholdInGib(): number {
    return this.accountService.account.notificationSettings?.averageEcThreshold ?? 0
  }

  private get currentHarvesterOfflineDurationInMinutes(): number {
    return this.accountService.account.notificationSettings?.harvesterOfflineDurationInMinutes ?? 20
  }

  private get areValuesChanged(): boolean {
    if (this.newCurrentEcThresholdInGib !== this.currentEcLastHourThresholdInGib) {
      return true
    }
    if (this.areCurrentEcChangeNotificationsEnabled !== this.currentAreEcChangeNotificationsEnabled) {
      return true
    }
    if (this.newAverageEcThresholdInGib !== this.currentAverageEcThresholdInGib) {
      return true
    }
    if (this.areAverageEcChangeNotificationsEnabled !== this.currentAreAverageEcChangeNotificationsEnabled) {
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
