import {MaybeErrorResponse} from '../maybe-error-response'

export interface AuthenticationResponse extends MaybeErrorResponse {
  accessToken: string
}
