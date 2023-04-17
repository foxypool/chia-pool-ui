import {Component, ViewChild} from '@angular/core'
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap'
import {AccountService} from '../account.service'

@Component({
  selector: 'app-settings-modal',
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.scss']
})
export class SettingsModalComponent {
  @ViewChild('settingsModal') modal

  private modalRef: NgbModalRef = null

  public constructor(
    private accountService: AccountService,
    private modalService: NgbModal,
  ) {}

  public openModal(): void {
    this.modalRef = this.modalService.open(this.modal, { windowClass: 'settings-modal' })
  }

  public get canLeavePool() {
    if (!this.accountService.account) {
      return false;
    }
    const account = this.accountService.account;

    return !account.hasLeftThePool && !account.isCheating
  }
}
