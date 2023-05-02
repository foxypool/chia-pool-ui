import {Component} from '@angular/core'
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'
import {AccountService} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'

@Component({
  selector: 'app-update-difficulty',
  templateUrl: './update-difficulty.component.html',
  styleUrls: ['./update-difficulty.component.scss'],
})
export class UpdateDifficultyComponent {

  public faCircleNotch = faCircleNotch
  public newDifficulty: number | undefined
  public isFixedDifficulty = false

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
  ) {
    this.newDifficulty = this.currentDifficulty
    this.isFixedDifficulty = this.currentIsFixedDifficulty
  }

  public get currentDifficulty(): number {
    return this.accountService.account.difficulty
  }

  public get isValidDifficulty(): boolean {
    return this.newDifficulty !== undefined && Number.isInteger(this.newDifficulty) && this.newDifficulty >= 1
  }

  public get canUpdateDifficulty(): boolean {
    return !this.accountService.isUpdatingAccount && this.isValidDifficulty && this.areValuesChanged
  }

  public async updateDifficulty(): Promise<void> {
    if (this.accountService.isUpdatingAccount) {
      return
    }
    try {
      await this.accountService.updateDifficulty({ difficulty: this.newDifficulty, isFixedDifficulty: this.isFixedDifficulty })
      this.toastService.showSuccessToast('Successfully updated the difficulty')
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  private get currentIsFixedDifficulty(): boolean {
    return this.accountService.account.isFixedDifficulty
  }

  private get areValuesChanged(): boolean {
    if (this.isFixedDifficulty !== this.currentIsFixedDifficulty) {
      return true
    }

    return this.newDifficulty !== this.currentDifficulty
  }
}
