import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import {FaucetComponent} from "./faucet.component";

const routes: Routes = [{ path: '', component: FaucetComponent, data: { titlePrefixSnippet: 'faucet' } }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FaucetRoutingModule { }
