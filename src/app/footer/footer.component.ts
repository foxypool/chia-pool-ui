import { Component } from '@angular/core';
import {SnippetService} from '../snippet.service';
import {faDiscord, faGithub, faTwitter} from '@fortawesome/free-brands-svg-icons';
import * as moment from 'moment';
import {PoolsProvider} from '../pools.provider';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent  {

  public faDiscord = faDiscord;
  public faGithub = faGithub;
  public faTwitter = faTwitter;

  public currentYear: string = moment().format('YYYY');

  constructor(
    private _snippetService: SnippetService,
    private poolsProvider: PoolsProvider,
  ) {}

  get snippetService(): SnippetService {
    return this._snippetService;
  }

  get downloadUrl(): string {
    return this.poolsProvider.pool?.downloadUrl;
  }

  get gettingStartedUrl(): string {
    return `https://docs.foxypool.io/proof-of-spacetime/foxy-pool/pools/${this.poolsProvider.poolIdentifier}/getting-started/`;
  }
}
