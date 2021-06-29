import {Component, OnInit, ViewChild} from '@angular/core';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {AccountService} from '../account.service';
import {SnippetService} from '../snippet.service';
import {ToastService} from '../toast.service';

@Component({
  selector: 'app-leave-pool-modal',
  templateUrl: './leave-pool-modal.component.html',
  styleUrls: ['./leave-pool-modal.component.scss']
})
export class LeavePoolModalComponent implements OnInit {
  @ViewChild('leavePoolModal') modal;

  public leaveForEver = false;

  public faCircleNotch = faCircleNotch;

  private modalRef: NgbModalRef = null;

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private modalService: NgbModal,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {}

  get haveCollateral() {
    return this.accountService.account && this.accountService.account.collateral !== undefined;
  }

  async leaveThePool() {
    if (this.accountService.isAuthenticating) {
      return;
    }
    let errorOccurred = false;
    setTimeout(() => {
      if (errorOccurred) {
        return;
      }
      this.toastService.showInfoToast(this.snippetService.getSnippet('leave-pool-modal.leaving-info-toast'), '', {
        timeOut: 15 * 1000,
      });
    }, 2 * 1000);
    try {
      await this.accountService.leavePool({ leaveForEver: this.leaveForEver });
      this.toastService.showSuccessToast(this.snippetService.getSnippet('leave-pool-modal.success'));
    } catch (err) {
      errorOccurred = true;
      this.toastService.showErrorToast(err.message);
    } finally {
      this.modalRef.close(true);
    }
  }

  onModalClose() {
    this.leaveForEver = false;
  }

  openModal() {
    this.modalRef = this.modalService.open(this.modal);
    this.modalRef.result.then(() => {
      this.onModalClose();
    }, () => {
      this.onModalClose();
    });
  }
}
