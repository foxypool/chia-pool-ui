import {Component, ViewChild} from '@angular/core'
import * as moment from 'moment'
import {AccountService} from '../account.service'
import {ToastService} from '../toast.service'
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap'
import { faCircleNotch, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'
import {SnippetService} from '../snippet.service'
import {StatsService} from '../stats.service'
import {PoolsProvider} from '../pools.provider'

@Component({
  selector: 'app-authentication-modal',
  templateUrl: './authentication-modal.component.html',
  styleUrls: ['./authentication-modal.component.scss']
})
export class AuthenticationModalComponent  {
  @ViewChild('authenticationModal') modal

  public message = null
  public signature = null

  public faCircleNotch = faCircleNotch
  public copyIcon = faCopy
  public copyIconStyle = {}

  private modalRef: NgbModalRef = null

  constructor(
    public accountService: AccountService,
    public statsService: StatsService,
    public snippetService: SnippetService,
    private readonly modalService: NgbModal,
    private readonly toastService: ToastService,
    private readonly poolsProvider: PoolsProvider,
  ) {}

  async authenticate() {
    if (this.accountService.isAuthenticating) {
      return
    }
    const signature = this.signature ? this.signature.trim() : null
    try {
      await this.accountService.authenticate({ message: this.message, signature })
      this.toastService.showSuccessToast(this.snippetService.getSnippet('authentication-modal.success'))
      this.modalRef.close(true)
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  copied(): void {
    this.copyIcon = faCheck
    this.copyIconStyle = { color: 'green' }
    setTimeout(() => {
      this.copyIcon = faCopy
      this.copyIconStyle = {}
    }, 1000)
  }

  onModalClose() {
    this.message = null
    this.signature = null
  }

  openModal() {
    this.message = moment().unix().toString()
    this.modalRef = this.modalService.open(this.modal)
    this.modalRef.result.then(() => {
      this.onModalClose()
    }, () => {
      this.onModalClose()
    })
  }

  get docsAuthenticationGuideUrl() {
    return `https://docs.foxypool.io/proof-of-spacetime/foxy-pool/pools/${this.poolsProvider.poolIdentifier}/authenticate/`
  }
}
