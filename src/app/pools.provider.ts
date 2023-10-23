import {Inject, Injectable} from '@angular/core'
import {WINDOW} from './window.provider'
import {DOCUMENT} from '@angular/common'

export enum PoolType {
  og,
  nft,
}

export enum Coin {
  chia = 'CHIA',
}

export enum Algorithm {
  post = 'Proof of Spacetime',
}

export interface Pool {
  coin: Coin
  type: PoolType
  name: string
  url: string
  poolIdentifier: string
  hostnames: string[]
  algorithm: Algorithm
  downloadUrl: string
  launchDate: string
}

@Injectable({
  providedIn: 'root'
})
export class PoolsProvider {
  public pools: Pool[] = [{
    coin: Coin.chia,
    name: 'Foxy-Pool CHIA',
    url: 'https://chia.foxypool.io',
    poolIdentifier: 'chia',
    hostnames: ['chia.foxypool.io', 'localhost', 'add-historical-duration-sele.chia-pool-ui.pages.dev'],
    algorithm: Algorithm.post,
    downloadUrl: 'https://github.com/Chia-Network/chia-blockchain/releases/latest',
    type: PoolType.nft,
    launchDate: '2021-07-27T00:00:00.000Z',
  },{
    coin: Coin.chia,
    name: 'Foxy-Pool CHIA (OG)',
    url: 'https://chia-og.foxypool.io',
    poolIdentifier: 'chia-og',
    hostnames: ['chia-og.foxypool.io'],
    algorithm: Algorithm.post,
    downloadUrl: 'https://github.com/foxypool/chia-blockchain/releases/latest',
    type: PoolType.og,
    launchDate: '2021-06-13T00:00:00.000Z',
  }]

  public readonly pool: Pool

  public get poolIdentifier(): string {
    return this.pool.poolIdentifier
  }

  public get coin(): Coin {
    return this.pool.coin
  }

  public constructor(
    @Inject(WINDOW) private readonly window: Window,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
    const hostname = this.window.location.hostname
    this.pool = this.pools
      .filter(pool => pool.hostnames)
      .find(pool => pool.hostnames.some(curr => curr === hostname))
    if (this.pool === undefined) {
      this.document.location.href = 'https://foxypool.io'
    }
  }
}
