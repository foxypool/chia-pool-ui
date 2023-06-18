import {Inject, Injectable} from '@angular/core'
import {WINDOW} from './window.provider'

@Injectable({
  providedIn: 'root'
})
export class PoolsProvider {

  public pools = [
    {
      group: 'CHIA',
      name: 'Foxy-Pool CHIA',
      url: 'https://chia.foxypool.io',
      poolIdentifier: 'chia',
      hostnames: ['chia.foxypool.io'],
      apiUrl: 'https://api2.foxypool.io',
      algorithm: 'Proof of Spacetime',
      downloadUrl: 'https://github.com/Chia-Network/chia-blockchain/releases/latest',
    },{
      group: 'CHIA',
      name: 'Foxy-Pool CHIA (OG)',
      url: 'https://chia-og.foxypool.io',
      poolIdentifier: 'chia-og',
      hostnames: ['chia-og.foxypool.io', 'localhost'],
      apiUrl: 'https://api2.foxypool.io',
      algorithm: 'Proof of Spacetime',
      downloadUrl: 'https://github.com/foxypool/chia-blockchain/releases/latest',
    },{
      group: 'SIGNA',
      name: 'Foxy-Pool SIGNA',
      url:  'https://signa.foxypool.io',
      algorithm: 'Proof of Capacity',
    },
  ]

  public readonly pool = null
  public readonly apiUrl = null
  private readonly _poolIdentifier = null
  private readonly _coin = null

  constructor(
    @Inject(WINDOW) private readonly window: Window,
  ) {
    const hostname = this.window.location.hostname
    const pool = this.pools
      .filter(pool => pool.hostnames)
      .find(pool => pool.hostnames.some(curr => curr === hostname))
    if (pool) {
      this.pool = pool
      this._poolIdentifier = pool.poolIdentifier
      this._coin = pool.group
      this.apiUrl = pool.apiUrl
    }
  }

  get poolIdentifier() : string {
    return this._poolIdentifier
  }

  get coin() : string {
    return this._coin
  }
}
