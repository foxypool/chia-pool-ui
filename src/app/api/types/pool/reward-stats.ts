import {TransactionState} from '../transaction-state'
import {HistoricalRate} from '../historical/historical-rate'

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
  farmerReward?: string
  blockRewardAmounts?: {
    pool: string
    farmer: string
    fee: string
  }
  networkSpaceInTib: string
  distributed: boolean
  distributionRatio: string
  historicalRate?: HistoricalRate
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
