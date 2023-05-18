import axios, {AxiosInstance} from 'axios'

export class ApiService {
  private readonly client: AxiosInstance

  constructor(url: string) {
    this.client = axios.create({
      baseURL: `${url}/api/v2`,
    })
  }

  async getPoolConfig({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/config`)

    return data
  }

  async getPoolStats({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/pool`)

    return data
  }

  async getPoolHistoricalStats({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/pool/historical`)

    return data
  }

  async getAccountsStats({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/accounts`)

    return data
  }

  async getRewardStats({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/rewards`)

    return data
  }

  async getLastPayouts({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/payouts`)

    return data
  }

  async getExchangeStats({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/rates`)

    return data
  }

  public async getAccounts({ poolIdentifier, page, limit }: { poolIdentifier: string, page: number, limit: number }): Promise<AccountListResponse> {
    const { data } = await this.client.get<AccountListResponse>(`${poolIdentifier}/accounts/list`, { params: { page, limit } })

    return data
  }

  async getAccount({ poolIdentifier, poolPublicKey, bustCache = false }) {
    const params: any = {}
    if (bustCache) {
      params.cacheBuster = Math.random()
    }
    const { data } = await this.client.get(`${poolIdentifier}/account/${poolPublicKey}`, { params })

    return data
  }

  async getAccountHarvesters({ poolIdentifier, poolPublicKey, bustCache }) {
    const params: any = {}
    if (bustCache) {
      params.cacheBuster = Math.random()
    }

    const { data } = await this.client.get(`${poolIdentifier}/account/${poolPublicKey}/harvesters`, { params })

    return data
  }

  public async getHarvesterStats({ poolIdentifier, harvesterId }: { poolIdentifier: string, harvesterId: string }): Promise<HarvesterStats> {
    const { data } = await this.client.get<HarvesterStats>(`${poolIdentifier}/harvester/${harvesterId}/stats`)

    return data
  }

  public async getHarvesterProofTimes({ poolIdentifier, harvesterId }: { poolIdentifier: string, harvesterId: string }): Promise<ProofTime[]> {
    const { data } = await this.client.get<ProofTime[]>(`${poolIdentifier}/harvester/${harvesterId}/proof-times`)

    return data
  }

  public async getClientVersions({ poolIdentifier }: { poolIdentifier: string }): Promise<ClientVersion[]> {
    const { data } = await this.client.get<ClientVersion[]>(`${poolIdentifier}/client/versions`)

    return data
  }

  async getAccountHistoricalStats({ poolIdentifier, poolPublicKey }): Promise<AccountHistoricalStat[]> {
    const { data } = await this.client.get<AccountHistoricalStat[]>(`${poolIdentifier}/account/${poolPublicKey}/historical`)

    return data
  }

  async getAccountWonBlocks({ poolIdentifier, poolPublicKey }) {
    const { data } = await this.client.get(`${poolIdentifier}/account/${poolPublicKey}/won-blocks`)

    return data
  }

  async getAccountPayouts({ poolIdentifier, poolPublicKey }) {
    const { data } = await this.client.get(`${poolIdentifier}/account/${poolPublicKey}/payouts`)

    return data
  }

  async authenticateAccount({ poolIdentifier, poolPublicKey, message, signature }) {
    const { data } = await this.client.post(`${poolIdentifier}/account/${poolPublicKey}/authenticate`, {
      message,
      signature,
    })

    return data
  }

  async authenticateAccountWithToken({ poolIdentifier, accountIdentifier, token }) {
    const { data } = await this.client.post(`${poolIdentifier}/account/${accountIdentifier}/authenticate-with-token`, {
      token,
    })

    return data
  }

  public async generateLoginToken({ poolIdentifier, accountIdentifier, authToken }): Promise<LoginTokenResponse> {
    const { data } = await this.client.post<LoginTokenResponse>(`${poolIdentifier}/account/${accountIdentifier}/login-token/generate`, undefined, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  async updateAccountName({ poolIdentifier, poolPublicKey, authToken, newName }) {
    const { data } = await this.client.post(`${poolIdentifier}/account/${poolPublicKey}/name`, {
      newName,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updateHarvesterName({ poolIdentifier, poolPublicKey, authToken, harvesterPeerId, newName }): Promise<unknown> {
    const { data } = await this.client.put(`${poolIdentifier}/account/${poolPublicKey}/harvester/${harvesterPeerId}/name`, {
      newName,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updateHarvesterNotificationSettings({ poolIdentifier, poolPublicKey, authToken, harvesterPeerId, notificationSettings }): Promise<unknown> {
    const { data } = await this.client.put(`${poolIdentifier}/account/${poolPublicKey}/harvester/${harvesterPeerId}/notification-settings`, notificationSettings, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  async updateAccountDistributionRatio({ poolIdentifier, poolPublicKey, authToken, newDistributionRatio }) {
    const { data } = await this.client.post(`${poolIdentifier}/account/${poolPublicKey}/distribution-ratio`, {
      newDistributionRatio,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updatePayoutOptions({ poolIdentifier, poolPublicKey, authToken, minimumPayout, payoutMultiplesOf }) {
    const { data } = await this.client.put(`${poolIdentifier}/account/${poolPublicKey}/payout-options`, {
      minimumPayout,
      payoutMultiplesOf,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updateAccountDifficulty({ poolIdentifier, poolPublicKey, authToken, difficulty, isFixedDifficulty }): Promise<unknown> {
    const { data } = await this.client.put(`${poolIdentifier}/account/${poolPublicKey}/difficulty`, {
      difficulty,
      isFixedDifficulty,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async updateNotificationSettings({
    poolIdentifier,
    poolPublicKey,
    authToken,
    ecLastHourThreshold,
    areEcChangeNotificationsEnabled,
    areBlockWonNotificationsEnabled,
    arePayoutAddressChangeNotificationsEnabled,
    areHarvesterOfflineNotificationsEnabled,
    harvesterOfflineDurationInMinutes,
  }): Promise<unknown> {
    const { data } = await this.client.put(`${poolIdentifier}/account/${poolPublicKey}/notification-settings`, {
      ecLastHourThreshold,
      areEcChangeNotificationsEnabled,
      areBlockWonNotificationsEnabled,
      arePayoutAddressChangeNotificationsEnabled,
      areHarvesterOfflineNotificationsEnabled,
      harvesterOfflineDurationInMinutes,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  async leavePool({ poolIdentifier, poolPublicKey, authToken, leaveForEver }) {
    const { data } = await this.client.post(`${poolIdentifier}/account/${poolPublicKey}/leave-pool`, {
      leaveForEver,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  async rejoinPool({ poolIdentifier, poolPublicKey, authToken }) {
    const { data } = await this.client.post(`${poolIdentifier}/account/${poolPublicKey}/rejoin-pool`, undefined, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }
}

export interface AccountListResponse {
  accounts: AccountModel[]
  total: number
}

export interface AccountModel {
  rank?: number
  name?: string
  payoutAddress: string
  poolPublicKey: string
  ec: number
  createdAt: string
  rejoinedAt?: string
}

export interface HarvesterStats {
  submissionStats: SubmissionStat[]
  rejectedSubmissionStats: RejectedSubmissionStat[]
}

interface SubmissionStat {
  shares: number
  partials: number
  proofTimeSumInSeconds: number|null
  date: string
}

interface RejectedSubmissionStat extends SubmissionStat {
  type: RejectedSubmissionType
}

export enum RejectedSubmissionType {
  stale = 'STALE',
  invalid = 'INVALID',
}

export interface AccountHistoricalStat {
  createdAt: string
  shares: number
  staleShares: number
  invalidShares: number
  shareCount: number
  ec: number
  ecLastHour: number
  difficulty: number
}

export interface ProofTime {
  receivedAt: string
  proofTimeInSeconds: number
}

export interface ClientVersion {
  clientName: string
  clientVersion: string
  localName1: string|null
  localVersion1: string|null
  localName2: string|null
  localVersion2: string|null
  count: number
}

export interface LoginTokenResponse {
  token: string
}
