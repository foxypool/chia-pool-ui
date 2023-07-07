export interface Notice {}

export interface PoolConfig {
  poolUrl: string
  blockExplorerBlockUrlTemplate: string
  blockExplorerCoinUrlTemplate: string
  blockExplorerAddressUrlTemplate: string
  blockRewardDistributionDelay: number
  blocksPerDay: number
  defaultDistributionRatio: string
  historicalTimeInMinutes: number
  minimumPayout: number
  onDemandPayoutFee: number
  poolFee: number
  coin: string
  ticker: string
  version: string
  isTestnet: boolean
  poolAddress: string
  poolName: string
  farmingUrl: string
  poolRewardPortion: number
  notices: Notice[]
}
