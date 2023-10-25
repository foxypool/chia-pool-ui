import {Component, Input, ViewChild} from '@angular/core'
import {NgbModal} from '@ng-bootstrap/ng-bootstrap'

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss']
})
export class ConfirmationModalComponent {
  @Input() title: string
  @Input() description: string
  @Input() confirmButtonText: string
  @Input() confirmButtonClass?: string = 'btn-success'
  @ViewChild('confirmationModal') modal

  public constructor(private readonly modalService: NgbModal) {}

  public async confirm(): Promise<boolean> {
    const modalRef = this.modalService.open(this.modal)

    try {
      return await modalRef.result
    } catch (_) {
      return false
    }
  }
}
