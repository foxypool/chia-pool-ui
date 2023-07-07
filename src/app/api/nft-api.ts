import {AbstractApi} from './abstract-api'
import {NftRecentlyWonBlock} from './types/pool/reward-stats'
import {NftAccount} from './types/account/account'
import {NftTopAccount} from './types/account/top-account'

export class NftApi extends AbstractApi<NftAccount, NftTopAccount, NftRecentlyWonBlock> {}
