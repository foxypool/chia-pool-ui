import {MaybeErrorResponse} from '../maybe-error-response'

export interface LoginTokenResponse extends MaybeErrorResponse {
  token: string
}
