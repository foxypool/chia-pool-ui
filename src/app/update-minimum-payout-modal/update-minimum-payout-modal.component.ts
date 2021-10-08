import {Component, ViewChild} from '@angular/core';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import BigNumber from 'bignumber.js';
import {AccountService} from '../account.service';
import {SnippetService} from '../snippet.service';
import {ToastService} from '../toast.service';
import {StatsService} from '../stats.service';

@Component({
  selector: 'app-update-minimum-payout-modal',
  templateUrl: './update-minimum-payout-modal.component.html',
  styleUrls: ['./update-minimum-payout-modal.component.scss']
})
export class UpdateMinimumPayoutModalComponent  {
  @ViewChild('updateMinimumPayoutModal') modal;

  private _newMinimumPayout = undefined;

  public faCircleNotch = faCircleNotch;

  private modalRef: NgbModalRef = null;

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private modalService: NgbModal,
    private toastService: ToastService,
    private statsService: StatsService,
  ) {}

  get poolConfig() {
    return this.statsService.poolConfig.getValue() || {};
  }

  get poolConfigMinimumPayout() {
    return this.poolConfig.minimumPayout || 0.01;
  }

  get ticker() {
    return this.poolConfig.ticker;
  }

  async updateMinimumPayout() {
    if (this.accountService.isUpdatingAccount) {
      return;
    }
    try {
      const newMinimumPayout = this.newMinimumPayoutString;
      await this.accountService.updateMinimumPayout({ newMinimumPayout});
      if (newMinimumPayout) {
        this.toastService.showSuccessToast(this.snippetService.getSnippet('update-minimum-payout-modal.update-success', newMinimumPayout, this.ticker));
      } else {
        this.toastService.showSuccessToast(this.snippetService.getSnippet('update-minimum-payout-modal.remove-success'));
      }
      this.modalRef.close(true);
    } catch (err) {
      this.toastService.showErrorToast(err.message);
    }
  }

  onModalClose() {
    this.newMinimumPayout = undefined;
  }

  openModal() {
    this.newMinimumPayout = this.accountService.account.minimumPayout;
    this.modalRef = this.modalService.open(this.modal);
    this.modalRef.result.then(() => {
      this.onModalClose();
    }, () => {
      this.onModalClose();
    });
  }

  get isValidMinimumPayout() {
    if (this._newMinimumPayout === undefined) {
      return true;
    }

    return !this._newMinimumPayout.isNaN() && this._newMinimumPayout.isGreaterThanOrEqualTo(this.poolConfigMinimumPayout);
  }

  get newMinimumPayout(): any {
    return this._newMinimumPayout ? this._newMinimumPayout.toNumber() : undefined;
  }

  set newMinimumPayout(value: any) {
    this._newMinimumPayout = value ? new BigNumber(value) : undefined;
  }

  get accountHasMinimumPayout() {
    return this.accountService.account.minimumPayout !== undefined;
  }

  get newMinimumPayoutString() {
    return this._newMinimumPayout ? this._newMinimumPayout.toString() : undefined;
  }

  get canUpdateMinimumPayout() {
    if (this.accountService.isUpdatingAccount) {
      return false;
    }
    if (!this.isValidMinimumPayout) {
      return false;
    }

    return this.accountService.account.minimumPayout !== this.newMinimumPayoutString;
  }
}
