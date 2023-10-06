import axios, {AxiosInstance, CreateAxiosDefaults} from 'axios'
import {Satellite} from './types/satellite'

const apiBaseUrls: string[] = [
  'https://chia-dashboard-api.foxypool.io/api',
  'https://chia-dashboard-api-2.foxypool.io/api',
  'https://chia-dashboard-api-3.foxypool.io/api',
]

export async function getBestChiaDashboardApiBaseUrl(): Promise<string|undefined> {
  try {
    const bestResult = await Promise.any(
      apiBaseUrls.map(async baseUrl => {
        const api = new ChiaDashboardApi(baseUrl)

        return {
          baseUrl,
          pingResult: await api.ping(),
        }
      })
    )

    return bestResult.baseUrl
  } catch (err) {
    return
  }
}

export class ChiaDashboardApi {
  private readonly client: AxiosInstance

  public constructor(baseURL: string, public readonly shareKey?: string) {
    const options: CreateAxiosDefaults = {
      baseURL,
      timeout: 30 * 1000,
    }
    if (shareKey !== undefined) {
      options.headers = { Authorization: `Bearer ${shareKey}` }
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
