import {HistoricalRate} from '../historical/historical-rate'

export enum RemarkType {
  gigahorseDevFee = 'GIGAHORSE_DEV_FEE',
  corePoolFarmerReward = 'CORE_POOL_FARMER_REWARD',
  hpoolFarmerReward = 'HPOOL_FARMER_REWARD',
  farmerRewardAddressDiffers = 'FARMER_REWARD_ADDRESS_DIFFERS',
}

export interface Remark {
  type: RemarkType
  meta?: any
}

export interface AccountWonBlock {
  height: number
  hash: string
  blockRewardAmounts?: {
    pool: string
    farmer: string
    fee: string
  }
  effort: number|null
  createdAt: string
  remarks: Remark[]
  historicalRate?: HistoricalRate
  farmTimeInSeconds?: number
}


