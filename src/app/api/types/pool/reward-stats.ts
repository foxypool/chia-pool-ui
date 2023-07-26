import {TransactionState} from '../transaction-state'

export interface RecentlyWonBlock {
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

export interface NftRecentlyWonBlock extends RecentlyWonBlock {
  rewardClaimTx?: {
    state: TransactionState
    feeCoins?: string[]
  }
}

export interface RewardStats<RecentlyWonBlockType extends RecentlyWonBlock> {
  recentlyWonBlocks: RecentlyWonBlockType[]
  dailyRewardPerPiB: number
  averageEffort: number|null
}
