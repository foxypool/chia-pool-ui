import {Component, ViewChild} from '@angular/core'
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap'
import {AccountService} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'
import {BigNumber} from 'bignumber.js'

@Component({
  selector: 'app-update-notification-settings-modal',
  templateUrl: './update-notification-settings-modal.component.html',
  styleUrls: ['./update-notification-settings-modal.component.scss'],
})
export class UpdateNotificationSettingsModalComponent {
  @ViewChild('updateNotificationSettingsModal') modal

  public possibleCapacityDenominators: string[] = ['GiB', 'TiB', 'PiB']
  public selectedCapacityDenominator = 'TiB'
  public faCircleNotch = faCircleNotch
  public newEcLastHourThresholdInGib: number | undefined
  public areNotificationsEnabled = false

  private modalRef: NgbModalRef = null

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private modalService: NgbModal,
    private toastService: ToastService,
  ) {}

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
    return !this.accountService.isUpdatingAccount && this.isValidEcLastHourThreshold
  }

  public async updateNotificationSettings(): Promise<void> {
    if (this.accountService.isUpdatingAccount) {
      return
    }
    try {
      await this.accountService.updateNotificationSettings({
        ecLastHourThreshold: this.newEcLastHourThresholdInGib,
        areNotificationsEnabled: this.areNotificationsEnabled,
      })
      this.toastService.showSuccessToast('Successfully saved the notification settings')
      this.modalRef.close(true)
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  public openModal(): void {
    this.newEcLastHourThresholdInGib = this.currentEcLastHourThresholdInGib
    this.areNotificationsEnabled = this.currentAreNotificationsEnabled
    this.modalRef = this.modalService.open(this.modal)
  }

  private get currentAreNotificationsEnabled(): boolean {
    return this.accountService.account.notificationSettings.areNotificationsEnabled
  }

  private get currentEcLastHourThresholdInGib(): number {
    return this.accountService.account.notificationSettings.ecLastHourThreshold
  }
}
