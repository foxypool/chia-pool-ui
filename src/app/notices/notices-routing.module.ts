import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import {NoticesComponent} from './notices.component';

const routes: Routes = [{ path: '', component: NoticesComponent, data: { titlePrefixSnippet: 'notices' } }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NoticesRoutingModule { }
