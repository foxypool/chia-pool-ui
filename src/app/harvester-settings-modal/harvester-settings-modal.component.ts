import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core'
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap'
import {AccountService} from '../account.service'
import {Harvester} from '../api/types/harvester/harvester'
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'
import {ConfirmationModalComponent} from '../confirmation-modal/confirmation-modal.component'

@Component({
  selector: 'app-harvester-settings-modal',
  templateUrl: './harvester-settings-modal.component.html',
  styleUrls: ['./harvester-settings-modal.component.scss']
})
export class HarvesterSettingsModalComponent {
  @Input() harvester: Harvester
  @Output() updatedHarvester = new EventEmitter<void>()
  @ViewChild('settingsModal') modal
  @ViewChild(ConfirmationModalComponent) deletionConfirmationModal: ConfirmationModalComponent

  public readonly faCircleNotch = faCircleNotch
  public isDeleting = false
  private modalRef: NgbModalRef = null

  public constructor(
    private readonly accountService: AccountService,
    private readonly modalService: NgbModal,
    private readonly toastService: ToastService,
  ) {}

  public openModal(): void {
    this.modalRef = this.modalService.open(this.modal, { windowClass: 'settings-modal' })
  }

  public harvesterWasUpdated() {
    this.updatedHarvester.emit()
  }

  public async confirmHarvesterDeletion() {
    const shouldDelete = await this.deletionConfirmationModal.confirm()
    if (!shouldDelete) {
      return
    }
    await this.deleteHarvester()
  }

  private async deleteHarvester(): Promise<void> {
    if (this.isDeleting) {
      return
    }
    this.isDeleting = true
    try {
      await this.accountService.deleteHarvester(this.harvester.peerId)
      this.harvesterWasUpdated()
      this.toastService.showSuccessToast('Successfully deleted the harvester')
      this.modalRef.close()
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    } finally {
      this.isDeleting = false
    }
  }
}
