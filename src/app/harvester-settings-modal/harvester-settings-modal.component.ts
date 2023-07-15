import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core'
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap'
import {AccountService} from '../account.service'
import {Harvester} from '../api/types/harvester/harvester'

@Component({
  selector: 'app-harvester-settings-modal',
  templateUrl: './harvester-settings-modal.component.html',
  styleUrls: ['./harvester-settings-modal.component.scss']
})
export class HarvesterSettingsModalComponent {
  @Input() harvester: Harvester
  @Output() updatedHarvester = new EventEmitter<void>()
  @ViewChild('settingsModal') modal

  private modalRef: NgbModalRef = null

  public constructor(
    private readonly accountService: AccountService,
    private readonly modalService: NgbModal,
  ) {}

  public openModal(): void {
    this.modalRef = this.modalService.open(this.modal, { windowClass: 'settings-modal' })
  }

  public harvesterWasUpdated() {
    this.updatedHarvester.emit()
  }
}
