import {ErrorResponse} from './error-response'

export type ApiResponse<T> = T | ErrorResponse

export function isErrorResponse(response: ApiResponse<any>): response is ErrorResponse {
  return response.error !== undefined
}
