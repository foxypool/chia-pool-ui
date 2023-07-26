import {TransactionState} from '../transaction-state'

export interface BaseRecentlyWonBlock {
  winner: {
    payoutAddress: string
    accountReference: string
    name: string|null
  }
  isRewardClaimed: boolean
  height: number
  hash: string
  reward: number
  networkSpaceInTib: string
  distributed: boolean
  distributionRatio: string
  effort: number|null
  createdAt: string
}

export interface NftRecentlyWonBlock extends BaseRecentlyWonBlock {
  rewardClaimTx?: {
    state: TransactionState
    feeCoins?: string[]
  }
}

export type RecentlyWonBlock = BaseRecentlyWonBlock | NftRecentlyWonBlock

export interface RewardStats<RecentlyWonBlockType extends BaseRecentlyWonBlock = RecentlyWonBlock> {
  recentlyWonBlocks: RecentlyWonBlockType[]
  dailyRewardPerPiB: number
  averageEffort: number|null
}
