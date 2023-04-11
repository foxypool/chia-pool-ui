import axios, {AxiosInstance} from 'axios';

export class ApiService {
  private client: AxiosInstance;

  constructor(url: string) {
    this.client = axios.create({
      baseURL: `${url}/api/v2`,
    });
  }

  async getPoolConfig({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/config`);

    return data;
  }

  async getPoolStats({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/pool`);

    return data;
  }

  async getPoolHistoricalStats({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/pool/historical`);

    return data;
  }

  async getAccountsStats({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/accounts`);

    return data;
  }

  async getRewardStats({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/rewards`);

    return data;
  }

  async getLastPayouts({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/payouts`);

    return data;
  }

  async getExchangeStats({ poolIdentifier }) {
    const { data } = await this.client.get(`${poolIdentifier}/rates`);

    return data;
  }

  async getAccount({ poolIdentifier, poolPublicKey, bustCache = false }) {
    const params: any = {}
    if (bustCache) {
      params.cacheBuster = Math.random()
    }
    const { data } = await this.client.get(`${poolIdentifier}/account/${poolPublicKey}`, { params });

    return data;
  }

  async getAccountHistoricalStats({ poolIdentifier, poolPublicKey }) {
    const { data } = await this.client.get(`${poolIdentifier}/account/${poolPublicKey}/historical`);

    return data;
  }

  async getAccountWonBlocks({ poolIdentifier, poolPublicKey }) {
    const { data } = await this.client.get(`${poolIdentifier}/account/${poolPublicKey}/won-blocks`);

    return data;
  }

  async getAccountPayouts({ poolIdentifier, poolPublicKey }) {
    const { data } = await this.client.get(`${poolIdentifier}/account/${poolPublicKey}/payouts`)

    return data
  }

  async authenticateAccount({ poolIdentifier, poolPublicKey, message, signature }) {
    const { data } = await this.client.post(`${poolIdentifier}/account/${poolPublicKey}/authenticate`, {
      message,
      signature,
    });

    return data;
  }

  async updateAccountName({ poolIdentifier, poolPublicKey, authToken, newName }) {
    const { data } = await this.client.post(`${poolIdentifier}/account/${poolPublicKey}/name`, {
      newName,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    return data;
  }

  async updateAccountDistributionRatio({ poolIdentifier, poolPublicKey, authToken, newDistributionRatio }) {
    const { data } = await this.client.post(`${poolIdentifier}/account/${poolPublicKey}/distribution-ratio`, {
      newDistributionRatio,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    return data;
  }

  async updateAccountMinimumPayout({ poolIdentifier, poolPublicKey, authToken, minimumPayout }) {
    const { data } = await this.client.post(`${poolIdentifier}/account/${poolPublicKey}/minimum-payout`, {
      minimumPayout,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    return data;
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
  }): Promise<unknown> {
    const { data } = await this.client.put(`${poolIdentifier}/account/${poolPublicKey}/notification-settings`, {
      ecLastHourThreshold,
      areEcChangeNotificationsEnabled,
      areBlockWonNotificationsEnabled,
      arePayoutAddressChangeNotificationsEnabled,
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
    });

    return data;
  }

  async rejoinPool({ poolIdentifier, poolPublicKey, authToken }) {
    const { data } = await this.client.post(`${poolIdentifier}/account/${poolPublicKey}/rejoin-pool`, undefined, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    return data;
  }
}
