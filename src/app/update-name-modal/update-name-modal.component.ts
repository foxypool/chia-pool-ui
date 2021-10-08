import {Component, ViewChild} from '@angular/core';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {AccountService} from '../account.service';
import {ToastService} from '../toast.service';
import {SnippetService} from '../snippet.service';

@Component({
  selector: 'app-update-name-modal',
  templateUrl: './update-name-modal.component.html',
  styleUrls: ['./update-name-modal.component.scss']
})
export class UpdateNameModalComponent  {
  @ViewChild('updateNameModal') modal;

  public newName = null;

  public faCircleNotch = faCircleNotch;

  private modalRef: NgbModalRef = null;

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private modalService: NgbModal,
    private toastService: ToastService,
  ) {}

  async updateName() {
    if (this.accountService.isUpdatingAccount) {
      return;
    }
    const newName = this.newName.trim();
    try {
      await this.accountService.updateName({ newName });
      this.toastService.showSuccessToast(this.snippetService.getSnippet('update-name-modal.success', newName));
      this.modalRef.close(true);
    } catch (err) {
      this.toastService.showErrorToast(err.message);
    }
  }

  onModalClose() {
    this.newName = null;
  }

  openModal() {
    this.newName = this.accountService.account.name || '';
    this.modalRef = this.modalService.open(this.modal);
    this.modalRef.result.then(() => {
      this.onModalClose();
    }, () => {
      this.onModalClose();
    });
  }
}
