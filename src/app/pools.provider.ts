import {Inject, Injectable} from '@angular/core';
import {WINDOW} from "./window.provider";

@Injectable({
  providedIn: 'root'
})
export class PoolsProvider {

  public pools = [
    {
      group: 'BHD',
      name: 'Foxy-Pool BHD',
      url: 'https://bhd.foxypool.io',
    },{
      group: 'BHD',
      name: 'Foxy-Pool BHD ECO',
      url: 'https://bhd-eco.foxypool.io',
    },{
      group: 'BHD',
      name: 'Foxy-Pool BHD (Testnet)',
      url: 'https://bhd-testnet.foxypool.io',
    },{
      group: 'CHIA',
      name: 'Foxy-Pool CHIA',
      url: 'https://chia.foxypool.io',
      poolIdentifier: 'chia',
      hostnames: ['chia.foxypool.io'],
      apiUrl: 'https://api.chia.foxypool.io',
    },{
      group: 'CHIA',
      name: 'Foxy-Pool CHIA (OG)',
      url: 'https://chia-og.foxypool.io',
      poolIdentifier: 'chia-og',
      hostnames: ['chia-og.foxypool.io'],
      apiUrl: 'https://api.chia-og.foxypool.io',
    },{
      group: 'FLAX',
      name: 'Foxy-Pool FLAX (OG)',
      url: 'https://flax-og.foxypool.io',
      poolIdentifier: 'flax-og',
      hostnames: ['flax-og.foxypool.io', 'localhost'],
      apiUrl: 'https://api.flax-og.foxypool.io',
    },{
      group: 'SIGNA',
      name: 'Foxy-Pool SIGNA',
      url:  'https://signa.foxypool.io',
    },{
      group: 'SIGNA',
      name: 'Foxy-Pool SIGNA (Testnet)',
      url: 'https://signa-testnet.foxypool.io',
    },{
      group: 'HDD',
      name: 'Foxy-Pool HDD',
      url: 'https://hdd.foxypool.io',
    },{
      group: 'LHD',
      name: 'Foxy-Pool LHD',
      url: 'https://lhd.foxypool.io',
    },{
      group: 'XHD',
      name: 'Foxy-Pool XHD',
      url: 'https://xhd.foxypool.io',
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
