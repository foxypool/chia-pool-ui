import axios, {AxiosInstance, CreateAxiosDefaults} from 'axios'
import {Satellite} from './types/satellite'

export class ChiaDashboardApi {
  public get shareKey(): string|undefined {
    return this._shareKey
  }

  public set shareKey(shareKey: string|undefined) {
    this._shareKey = shareKey
    if (shareKey !== undefined) {
      this.client.defaults.headers.Authorization = `Bearer ${shareKey}`
    } else {
      delete this.client.defaults.headers.Authorization
    }
  }

  private readonly client: AxiosInstance

  public constructor(private _shareKey?: string) {
    const options: CreateAxiosDefaults = {
      baseURL: 'https://chia-dashboard-api.foxypool.io/api',
      timeout: 30 * 1000,
    }
    if (_shareKey !== undefined) {
      options.headers = { Authorization: `Bearer ${_shareKey}` }
    }

    this.client = axios.create(options)
  }

  public async ping(): Promise<PingResult> {
    const start = new Date()
    await this.client.get('ping')
    const latencyInMs = (new Date()).getTime() - start.getTime()

    return { latencyInMs }
  }

  public async isValidShareKey(): Promise<boolean> {
    try {
      await this.getSatellites()

      return true
    } catch (err) {
      return false
    }
  }

  public async getSatellites(): Promise<Satellite[]> {
    const { data } = await this.client.get<Satellite[]>('shared/satellites')

    return data
  }
}

export interface PingResult {
  latencyInMs: number
}
