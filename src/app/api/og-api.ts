import {AbstractApi, AuthenticatedAccountRequestOptions} from './abstract-api'
import {MaybeErrorResponse} from './types/maybe-error-response'
import {RecentlyWonBlock} from './types/pool/reward-stats'
import {OgAccount} from './types/account/account'
import {OgTopAccount} from './types/account/top-account'

export class OgApi extends AbstractApi<OgAccount, OgTopAccount, RecentlyWonBlock> {
  public async leavePool({ accountIdentifier, authToken, leaveForEver }: LeavePoolOptions): Promise<MaybeErrorResponse> {
    const { data } = await this.client.post<MaybeErrorResponse>(`account/${accountIdentifier}/leave-pool`, {
      leaveForEver,
    }, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }

  public async rejoinPool({ accountIdentifier, authToken }: AuthenticatedAccountRequestOptions): Promise<MaybeErrorResponse> {
    const { data } = await this.client.post<MaybeErrorResponse>(`account/${accountIdentifier}/rejoin-pool`, undefined, {
      headers: { Authorization: `Bearer ${authToken}` },
    })

    return data
  }
}

export interface LeavePoolOptions extends AuthenticatedAccountRequestOptions {
  leaveForEver: boolean
}
