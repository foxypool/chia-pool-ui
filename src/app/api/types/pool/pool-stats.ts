export enum EventType {
  extraBlockReward = 'extra-block-reward',
}

export enum EventState {
  upcoming = 'upcoming',
  active = 'active',
  ended = 'ended',
}

export interface BaseEvent {
  type: EventType
  startedAt?: string
  endedAt?: string
  state: EventState
  payload: any
}

export interface ExtraBlockRewardEvent extends BaseEvent {
  type: EventType.extraBlockReward
  payload: {
    extraReward: number
    creditedCount: number
    totalCount: number
  }
}

export type Event = ExtraBlockRewardEvent

export interface PoolStats {
  height: number
  difficulty: number
  receivedAt: string
  networkSpaceInTiB: string
  balance: string
  events: Event[]
}
