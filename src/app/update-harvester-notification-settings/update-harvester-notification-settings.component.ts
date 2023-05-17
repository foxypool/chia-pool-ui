import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core'
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'
import {AccountService} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'
import {Options} from '@angular-slider/ngx-slider'
import {stepsArray} from '../harvester-offline-duration-options'
import {Harvester} from '../types'

@Component({
  selector: 'app-update-harvester-notification-settings',
  templateUrl: './update-harvester-notification-settings.component.html',
  styleUrls: ['./update-harvester-notification-settings.component.scss'],
})
export class UpdateHarvesterNotificationSettingsComponent implements OnInit {
  @Input() harvester: Harvester
  @Output() updatedHarvester = new EventEmitter<void>()

  public readonly faCircleNotch = faCircleNotch
  public isUpdating = false
  public areOfflineNotificationsEnabled = false
  public newOfflineDurationInMinutes: number = 20

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
  ) {}

  public ngOnInit() {
    this.areOfflineNotificationsEnabled = this.currentAggregateAreOfflineNotificationsEnabled
    this.newOfflineDurationInMinutes = this.currentAggregateOfflineDurationInMinutes
  }

  public get harvesterOfflineDurationOptions(): Options {
    return {
      showTicks: true,
      showTicksValues: false,
      hidePointerLabels: true,
      showSelectionBar: true,
      disabled: !this.areOfflineNotificationsEnabled,
      stepsArray,
    }
  }

  public get isInheritedOfflineDurationInMinutes(): boolean {
    return this.currentOfflineDurationInMinutes === undefined && this.newOfflineDurationInMinutes === this.currentAccountHarvesterOfflineDurationInMinutes
  }

  public get isInheritedAreOfflineNotificationsEnabled(): boolean {
    return this.currentAreOfflineNotificationsEnabled === undefined && this.areOfflineNotificationsEnabled === this.currentAccountAreHarvesterOfflineNotificationsEnabled
  }

  public get canUpdateNotificationSettings(): boolean {
    return this.areValuesChanged
  }

  public async updateNotificationSettings(): Promise<void> {
    if (this.isUpdating) {
      return
    }
    this.isUpdating = true
    const areOfflineNotificationsEnabled = this.areOfflineNotificationsEnabled === this.currentAccountAreHarvesterOfflineNotificationsEnabled ? undefined : this.areOfflineNotificationsEnabled
    const offlineDurationInMinutes = this.newOfflineDurationInMinutes === this.currentAccountHarvesterOfflineDurationInMinutes ? undefined : this.newOfflineDurationInMinutes
    try {
      await this.accountService.updateHarvesterNotificationSettings({
        harvesterPeerId: this.harvester.peerId,
        notificationSettings: {
          areOfflineNotificationsEnabled,
          offlineDurationInMinutes,
        },
      })
      this.updatedHarvester.emit()
      this.toastService.showSuccessToast('Successfully saved the notification settings')
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    } finally {
      this.isUpdating = false
    }
  }

  private get currentAggregateAreOfflineNotificationsEnabled(): boolean {
    if (this.currentAreOfflineNotificationsEnabled !== undefined) {
      return this.currentAreOfflineNotificationsEnabled
    }

    return this.currentAccountAreHarvesterOfflineNotificationsEnabled
  }

  private get currentAreOfflineNotificationsEnabled(): boolean|undefined {
    return this.harvester.notifications?.settings?.areOfflineNotificationsEnabled
  }

  private get currentAccountAreHarvesterOfflineNotificationsEnabled(): boolean {
    return this.accountService.account.notificationSettings?.areHarvesterOfflineNotificationsEnabled ?? false
  }

  private get currentAggregateOfflineDurationInMinutes(): number {
    if (this.currentOfflineDurationInMinutes !== undefined) {
      return this.currentOfflineDurationInMinutes
    }

    return this.currentAccountHarvesterOfflineDurationInMinutes
  }

  private get currentOfflineDurationInMinutes(): number|undefined {
    return this.harvester.notifications?.settings?.offlineDurationInMinutes
  }

  private get currentAccountHarvesterOfflineDurationInMinutes(): number {
    return this.accountService.account.notificationSettings?.harvesterOfflineDurationInMinutes ?? 20
  }

  private get areValuesChanged(): boolean {
    if (this.areOfflineNotificationsEnabled !== this.currentAggregateAreOfflineNotificationsEnabled) {
      return true
    }

    return this.newOfflineDurationInMinutes !== this.currentAggregateOfflineDurationInMinutes
  }
}
