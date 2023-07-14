import {AbstractApi, AuthenticatedAccountRequestOptions} from './abstract-api'
import {RecentlyWonBlock} from './types/pool/reward-stats'
import {OgAccount} from './types/account/account'
import {OgTopAccount} from './types/account/top-account'
import {ApiResponse} from './types/api-response'

export class OgApi extends AbstractApi<OgAccount, OgTopAccount, RecentlyWonBlock> {
  public async leavePool({ accountIdentifier, authToken, leaveForEver }: LeavePoolOptions): Promise<ApiResponse<void>> {
    const { data } = await this.client.post<ApiResponse<void>>(`account/${accountIdentifier}/leave-pool`, {
      leaveForEver,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async rejoinPool({ accountIdentifier, authToken }: AuthenticatedAccountRequestOptions): Promise<ApiResponse<void>> {
    const { data } = await this.client.post<ApiResponse<void>>(`account/${accountIdentifier}/rejoin-pool`, undefined, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }
}

export interface LeavePoolOptions extends AuthenticatedAccountRequestOptions {
  leaveForEver: boolean
}
