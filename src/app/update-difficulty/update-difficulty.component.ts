import {Component} from '@angular/core'
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'
import {AccountService, UpdateDifficultySettingsOptions} from '../account.service'
import {SnippetService} from '../snippet.service'
import {ToastService} from '../toast.service'
import {Options} from 'ngx-slider-v2'

@Component({
  selector: 'app-update-difficulty',
  templateUrl: './update-difficulty.component.html',
  styleUrls: ['./update-difficulty.component.scss'],
})
export class UpdateDifficultyComponent {
  public faCircleNotch = faCircleNotch
  public newDifficulty: number | undefined
  public isFixedDifficulty = false
  public partialsPerHour: number

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private readonly toastService: ToastService,
  ) {
    this.newDifficulty = this.currentDifficulty
    this.isFixedDifficulty = this.currentIsFixedDifficulty
    this.partialsPerHour = this.currentPartialsPerHour
  }

  public get partialsPerHourSliderOptions(): Options {
    const ticksArray = [1, 10, 20, 40, 60]

    return {
      disabled: this.isFixedDifficulty,
      showTicks: true,
      showTicksValues: false,
      hidePointerLabels: false,
      showSelectionBar: true,
      hideLimitLabels: false,
      ticksArray,
      floor: ticksArray.at(0),
      ceil: ticksArray.at(-1),
      step: 1,
      getLegend: (partialsPerHour: number): string => {
        switch (partialsPerHour) {
          case 1: return 'Slow'
          case 20: return 'Regular'
          case 60: return 'Fast'
          default: return ''
        }
      },
      customValueToPosition: (partialsPerHour: number, minVal: number, maxVal: number): number => {
        const indexOfNextPart = ticksArray.findIndex(tick => tick > partialsPerHour)
        const indexOfCurrentPart = indexOfNextPart === -1 ? ticksArray.length - 1 : indexOfNextPart - 1
        const diffToNextPart = indexOfNextPart === -1 ? 0 : (ticksArray[indexOfNextPart] - ticksArray[indexOfCurrentPart])
        const diffInCurrentPart = partialsPerHour - ticksArray[indexOfCurrentPart]
        const percentageOfCurrentPart = diffInCurrentPart > 0 ? diffInCurrentPart / diffToNextPart: 0

        const percentageOfTotalPerPart = 1 / (ticksArray.length - 1)

        return (percentageOfTotalPerPart * indexOfCurrentPart) + (percentageOfCurrentPart * percentageOfTotalPerPart)
      },
      customPositionToValue: (percent: number, minVal: number, maxVal: number): number => {
        const percentageOfTotalPerPart = 1 / (ticksArray.length - 1)
        const filledParts = Math.floor(percent / percentageOfTotalPerPart)
        const remainingPercent = percent % percentageOfTotalPerPart
        const relativeRemainingPercentage = remainingPercent / percentageOfTotalPerPart
        const diffToNextPart = filledParts === (ticksArray.length - 1) ? 0 : (ticksArray[filledParts + 1] - ticksArray[filledParts])
        const currentPartPartialsPerHour = ticksArray[filledParts]

        return currentPartPartialsPerHour + (relativeRemainingPercentage * diffToNextPart)
      },
    }
  }

  public get currentDifficulty(): number {
    return this.accountService.account.difficulty
  }

  public get currentPartialsPerHour(): number {
    return this.accountService.account.settings?.difficulty?.partialsPerHour ?? 20
  }

  public get isValidDifficulty(): boolean {
    return this.newDifficulty !== undefined && Number.isInteger(this.newDifficulty) && this.newDifficulty >= 1
  }

  public get canUpdateSettings(): boolean {
    return !this.accountService.isUpdatingAccount && this.isValidDifficulty && this.areValuesChanged
  }

  public resetPartialsPerHour() {
    this.partialsPerHour = 20
  }

  public async updateSettings(): Promise<void> {
    if (this.accountService.isUpdatingAccount) {
      return
    }
    const options: UpdateDifficultySettingsOptions = {}
    if (this.didAccountDifficultyChange) {
      options.accountDifficulty = {
        difficulty: this.newDifficulty,
        isFixedDifficulty: this.isFixedDifficulty,
      }
    }
    if (this.didAccountDifficultySettingsChange) {
      options.accountDifficultySettings = {
        partialsPerHour: this.partialsPerHour,
      }
    }
    try {
      await this.accountService.updateDifficulty(options)
      this.toastService.showSuccessToast('Successfully updated the difficulty settings')
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  private get currentIsFixedDifficulty(): boolean {
    return this.accountService.account.isFixedDifficulty
  }

  private get areValuesChanged(): boolean {
    return this.didAccountDifficultyChange || this.didAccountDifficultySettingsChange
  }

  private get didAccountDifficultyChange(): boolean {
    if (this.isFixedDifficulty !== this.currentIsFixedDifficulty) {
      return true
    }

    return this.newDifficulty !== this.currentDifficulty
  }

  private get didAccountDifficultySettingsChange(): boolean {
    return this.partialsPerHour !== this.currentPartialsPerHour
  }
}
