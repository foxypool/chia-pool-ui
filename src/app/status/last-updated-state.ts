import * as moment from 'moment'

export enum LastUpdatedState {
  ok,
  warning,
  error,
}

export function makeLastUpdatedStateFromLastUpdate(lastUpdate: string): LastUpdatedState {
  const passedMinutesSinceUpdate = moment().diff(lastUpdate, 'minutes')
  if (passedMinutesSinceUpdate < 4) {
    return LastUpdatedState.ok
  }
  if (passedMinutesSinceUpdate < 8) {
    return LastUpdatedState.warning
  }

  return LastUpdatedState.error
}

export function makeColorClassForLastUpdatedState(lastUpdatedState: LastUpdatedState): string {
  switch (lastUpdatedState) {
    case LastUpdatedState.ok: return 'color-green'
    case LastUpdatedState.warning: return 'color-orange'
    case LastUpdatedState.error: return 'color-red'
  }
}

export function makeDotColorClassForLastUpdatedState(lastUpdatedState: LastUpdatedState): string {
  switch (lastUpdatedState) {
    case LastUpdatedState.ok: return 'background-color-light-green'
    case LastUpdatedState.warning: return 'background-color-orange'
    case LastUpdatedState.error: return 'background-color-red'
  }
}
