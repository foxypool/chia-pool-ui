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

  async getAccount({ poolIdentifier, poolPublicKey }) {
    const { data } = await this.client.get(`${poolIdentifier}/account/${poolPublicKey}`);

    return data;
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
