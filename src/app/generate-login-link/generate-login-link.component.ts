import { Component } from '@angular/core'
import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'
import {BehaviorSubject, Observable} from 'rxjs'
import {shareReplay} from 'rxjs/operators'
import {AccountService} from '../account.service'
import {ToastService} from '../toast.service'
import {PoolsProvider} from '../pools.provider'

@Component({
  selector: 'app-generate-login-link',
  templateUrl: './generate-login-link.component.html',
  styleUrls: ['./generate-login-link.component.scss']
})
export class GenerateLoginLinkComponent {
  public readonly faCircleNotch = faCircleNotch
  public isGenerating = false
  public loginLink: Observable<string|undefined>
  private readonly loginLinkSubject: BehaviorSubject<string|undefined> = new BehaviorSubject<string | undefined>(undefined)
  private clearLoginLinkTimeout: ReturnType<typeof setTimeout>|undefined

  public constructor(
    private readonly accountService: AccountService,
    private readonly toastService: ToastService,
    private readonly poolsProvider: PoolsProvider,
  ) {
    this.loginLink = this.loginLinkSubject.pipe(shareReplay())
  }

  public async generateLoginToken(): Promise<void> {
    this.isGenerating = true
    try {
      const { token } = await this.accountService.generateLoginToken()
      this.loginLinkSubject.next(this.makePoolLoginLink(token))
      this.clearLoginLinkAfter10Minutes()
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    } finally {
      this.isGenerating = false
    }
  }

  private makePoolLoginLink(token: string): string {
    const poolUrl = this.poolsProvider.pool.url as string
    const accountIdentifier = this.accountService.accountIdentifier

    return `${poolUrl}/login?account_identifier=${accountIdentifier}&token=${token}`
  }

  private clearLoginLinkAfter10Minutes() {
    if (this.clearLoginLinkTimeout !== undefined) {
      clearTimeout(this.clearLoginLinkTimeout)
      this.clearLoginLinkTimeout = undefined
    }
    this.clearLoginLinkTimeout = setTimeout(() => {
      this.loginLinkSubject.next(undefined)
      this.clearLoginLinkTimeout = undefined
    }, 10 * 60 * 1000)
  }
}
