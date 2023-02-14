import {Component, ViewChild} from '@angular/core'
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap'
import {AccountService} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'

@Component({
  selector: 'app-update-difficulty-modal',
  templateUrl: './update-difficulty-modal.component.html',
  styleUrls: ['./update-difficulty-modal.component.scss'],
})
export class UpdateDifficultyModalComponent  {
  @ViewChild('updateDifficultyModal') modal

  public faCircleNotch = faCircleNotch
  public newDifficulty: number | undefined
  public isFixedDifficulty = false

  private modalRef: NgbModalRef = null

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private modalService: NgbModal,
    private toastService: ToastService,
  ) {}

  public get currentDifficulty(): number {
    return this.accountService.account.difficulty
  }

  public get isValidDifficulty(): boolean {
    return this.newDifficulty !== undefined && Number.isInteger(this.newDifficulty) && this.newDifficulty >= 1
  }

  public get canUpdateDifficulty(): boolean {
    return !this.accountService.isUpdatingAccount && this.isValidDifficulty
  }

  public async updateDifficulty(): Promise<void> {
    if (this.accountService.isUpdatingAccount) {
      return
    }
    try {
      await this.accountService.updateDifficulty({ difficulty: this.newDifficulty, isFixedDifficulty: this.isFixedDifficulty })
      this.toastService.showSuccessToast('Successfully updated the difficulty')
      this.modalRef.close(true)
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  public openModal(): void {
    this.newDifficulty = this.currentDifficulty
    this.isFixedDifficulty = this.currentIsFixedDifficulty
    this.modalRef = this.modalService.open(this.modal)
    this.modalRef.result.then(() => {
      this.onModalClose()
    }, () => {
      this.onModalClose()
    })
  }

  private onModalClose() {
    this.newDifficulty = undefined
    this.isFixedDifficulty = false
  }

  private get currentIsFixedDifficulty(): boolean {
    return this.accountService.account.isFixedDifficulty
  }
}
