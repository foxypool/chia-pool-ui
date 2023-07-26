import {Component, ViewChild} from '@angular/core'
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap'
import {AccountService} from '../account.service'
import {isCheatingOgAccount, isInactiveOgAccount} from '../api/types/account/account'

@Component({
  selector: 'app-settings-modal',
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.scss']
})
export class SettingsModalComponent {
  @ViewChild('settingsModal') modal

  private modalRef: NgbModalRef = null

  public constructor(
    private readonly accountService: AccountService,
    private readonly modalService: NgbModal,
  ) {}

  public openModal(): void {
    this.modalRef = this.modalService.open(this.modal, { windowClass: 'settings-modal' })
  }

  public get canLeavePool(): boolean {
    if (!this.accountService.account) {
      return false
    }
    const account = this.accountService.account

    return !isInactiveOgAccount(account) && !isCheatingOgAccount(account)
  }
}
