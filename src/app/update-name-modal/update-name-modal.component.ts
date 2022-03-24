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

  get isNewNameValid(): boolean {
    return !this.newNameOrUndefined || this.newNameOrUndefined.length <= 64;
  }

  get canUpdateName(): boolean {
    if (this.accountService.isUpdatingAccount) {
      return false;
    }
    if (!this.isNewNameValid) {
      return false;
    }

    return this.accountService.account.name !== this.newNameOrUndefined;
  }

  get newNameOrUndefined(): string|undefined {
    return this.newName ? this.newName.trim() : undefined;
  }

  get accountHasName(): boolean {
    return this.accountService.account.name !== undefined;
  }

  async updateName(): Promise<void> {
    if (this.accountService.isUpdatingAccount) {
      return;
    }
    const newName = this.newNameOrUndefined;
    try {
      await this.accountService.updateName({ newName });
      if (newName) {
        this.toastService.showSuccessToast(this.snippetService.getSnippet('update-name-modal.update-success', newName));
      } else {
        this.toastService.showSuccessToast(this.snippetService.getSnippet('update-name-modal.remove-success'));
      }
      this.modalRef.close(true);
    } catch (err) {
      this.toastService.showErrorToast(err.message);
    }
  }

  onModalClose() {
    this.newName = null;
  }

  openModal() {
    this.newName = this.accountService.account.name;
    this.modalRef = this.modalService.open(this.modal);
    this.modalRef.result.then(() => {
      this.onModalClose();
    }, () => {
      this.onModalClose();
    });
  }
}
