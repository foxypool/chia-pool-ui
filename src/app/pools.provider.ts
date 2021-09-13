import {Inject, Injectable} from '@angular/core';
import {WINDOW} from "./window.provider";

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
    },{
      group: 'CHIA',
      name: 'Foxy-Pool CHIA (OG)',
      url: 'https://chia-og.foxypool.io',
      poolIdentifier: 'chia-og',
      hostnames: ['chia-og.foxypool.io'],
      apiUrl: 'https://api2.foxypool.io',
      algorithm: 'Proof of Spacetime',
    },{
      group: 'FLAX',
      name: 'Foxy-Pool FLAX (OG)',
      url: 'https://flax-og.foxypool.io',
      poolIdentifier: 'flax-og',
      hostnames: ['flax-og.foxypool.io'],
      apiUrl: 'https://api2.foxypool.io',
      algorithm: 'Proof of Spacetime',
    },{
      group: 'CHIVES',
      name: 'Foxy-Pool CHIVES (OG)',
      url: 'https://chives-og.foxypool.io',
      poolIdentifier: 'chives-og',
      hostnames: ['chives-og.foxypool.io'],
      apiUrl: 'https://api2.foxypool.io',
      algorithm: 'Proof of Spacetime',
    },{
      group: 'HDDCOIN',
      name: 'Foxy-Pool HDDCOIN (OG)',
      url: 'https://hddcoin-og.foxypool.io',
      poolIdentifier: 'hddcoin-og',
      hostnames: ['hddcoin-og.foxypool.io', 'localhost'],
      apiUrl: 'https://api2.foxypool.io',
      algorithm: 'Proof of Spacetime',
    },{
      group: 'BHD',
      name: 'Foxy-Pool BHD',
      url: 'https://bhd.foxypool.io',
      algorithm: 'Proof of Capacity',
    },{
      group: 'SIGNA',
      name: 'Foxy-Pool SIGNA',
      url:  'https://signa.foxypool.io',
      algorithm: 'Proof of Capacity',
    },
  ];

  public readonly apiUrl = null;
  private readonly _poolIdentifier = null;
  private readonly _coin = null;

  constructor(
    @Inject(WINDOW) private window: Window,
  ) {
    const hostname = this.window.location.hostname;
    const pool = this.pools
      .filter(pool => pool.hostnames)
      .find(pool => pool.hostnames.some(curr => curr === hostname));
    if (pool) {
      this._poolIdentifier = pool.poolIdentifier;
      this._coin = pool.group;
      this.apiUrl = pool.apiUrl;
    }
  }

  get poolIdentifier() : string {
    return this._poolIdentifier;
  }

  get coin() : string {
    return this._coin;
  }
}
