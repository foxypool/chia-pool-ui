import {Options} from 'ngx-slider-v2'

const ticksArray = [5, 10, 20, 30, 60, 2 * 60, 4 * 60, 8 * 60, 16 * 60, 24 * 60]

export const options: Options = {
  showTicks: true,
  showTicksValues: true,
  hidePointerLabels: false,
  showSelectionBar: true,
  hideLimitLabels: true,
  ticksArray,
  floor: ticksArray.at(0),
  ceil: ticksArray.at(-1),
  step: 5,
  translate: (durationInMinutes: number): string => {
    if (durationInMinutes < 60) {
      return `${durationInMinutes}m`
    }
    const hours = Math.floor(durationInMinutes / 60)
    const minutes = durationInMinutes % 60
    const hasMinutes = minutes !== 0

    return hasMinutes ? `${hours}:${minutes.toString().padStart(2, '0')}h` : `${hours}h`
  },
  customValueToPosition: (durationInMinutes: number, minVal: number, maxVal: number): number => {
    const indexOfNextPart = ticksArray.findIndex(tick => tick > durationInMinutes)
    const indexOfCurrentPart = indexOfNextPart === -1 ? ticksArray.length - 1 : indexOfNextPart - 1
    const diffToNextPart = indexOfNextPart === -1 ? 0 : (ticksArray[indexOfNextPart] - ticksArray[indexOfCurrentPart])
    const durationInCurrentPart = durationInMinutes - ticksArray[indexOfCurrentPart]
    const percentageOfCurrentPart = durationInCurrentPart > 0 ? durationInCurrentPart / diffToNextPart: 0

    const percentageOfTotalPerPart = 1 / (ticksArray.length - 1)

    return (percentageOfTotalPerPart * indexOfCurrentPart) + (percentageOfCurrentPart * percentageOfTotalPerPart)
  },
  customPositionToValue: (percent: number, minVal: number, maxVal: number): number => {
    const percentageOfTotalPerPart = 1 / (ticksArray.length - 1)
    const filledParts = Math.floor(percent / percentageOfTotalPerPart)
    const remainingPercent = percent % percentageOfTotalPerPart
    const relativeRemainingPercentage = remainingPercent / percentageOfTotalPerPart
    const diffToNextPart = filledParts === (ticksArray.length - 1) ? 0 : (ticksArray[filledParts + 1] - ticksArray[filledParts])
    const currentPartDuration = ticksArray[filledParts]

    return currentPartDuration + (relativeRemainingPercentage * diffToNextPart)
  },
}
