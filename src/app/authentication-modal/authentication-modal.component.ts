import {Component, OnInit, ViewChild} from '@angular/core';
import * as moment from 'moment';
import {AccountService} from '../account.service';
import {ToastService} from '../toast.service';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import { faCircleNotch, faCopy } from '@fortawesome/free-solid-svg-icons';
import {SnippetService} from '../snippet.service';
import {StatsService} from '../stats.service';

@Component({
  selector: 'app-authentication-modal',
  templateUrl: './authentication-modal.component.html',
  styleUrls: ['./authentication-modal.component.scss']
})
export class AuthenticationModalComponent implements OnInit {
  @ViewChild('authenticationModal') modal;

  public message = null;
  public signature = null;

  public faCircleNotch = faCircleNotch;
  public faCopy = faCopy;

  private modalRef: NgbModalRef = null;

  constructor(
    public accountService: AccountService,
    public statsService: StatsService,
    public snippetService: SnippetService,
    private modalService: NgbModal,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {}

  async authenticate() {
    if (this.accountService.isAuthenticating) {
      return;
    }
    try {
      await this.accountService.authenticate({ message: this.message, signature: this.signature });
      this.toastService.showSuccessToast(this.snippetService.getSnippet('authentication-modal.success'));
      this.modalRef.close(true);
    } catch (err) {
      this.toastService.showErrorToast(err.message);
    }
  }

  onModalClose() {
    this.message = null;
    this.signature = null;
  }

  openModal() {
    this.message = moment().unix().toString();
    this.modalRef = this.modalService.open(this.modal);
    this.modalRef.result.then(() => {
      this.onModalClose();
    }, () => {
      this.onModalClose();
    });
  }
}
