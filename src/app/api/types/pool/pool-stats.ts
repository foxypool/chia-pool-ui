export enum EventType {
  extraBlockReward = 'extra-block-reward',
}

export enum EventState {
  upcoming = 'upcoming',
  active = 'active',
  ended = 'ended',
}

export interface Event {
  type: EventType
  startedAt?: string
  endedAt?: string
  state: EventState
  payload: any
}

export interface PoolStats {
  height: number
  difficulty: number
  receivedAt: string
  networkSpaceInTiB: string
  balance: string
  events: Event[]
}
