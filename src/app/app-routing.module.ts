import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {BlocksWonComponent} from './blocks-won/blocks-won.component';
import {PayoutsComponent} from './payouts/payouts.component';
import {TopAccountsComponent} from './top-accounts/top-accounts.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {MyFarmerComponent} from './my-farmer/my-farmer.component';

const routes: Routes = [
  { path: '', component: DashboardComponent, pathMatch: 'full' },
  { path: 'info', loadChildren: () => import('./info/info.module').then(m => m.InfoModule) },
  { path: 'blocks-won', component: BlocksWonComponent, pathMatch: 'full', data: { titlePrefixSnippet: 'blocks-won' } },
  { path: 'payouts', component: PayoutsComponent, pathMatch: 'full', data: { titlePrefixSnippet: 'payouts' } },
  { path: 'top-accounts', component: TopAccountsComponent, pathMatch: 'full', data: { titlePrefixSnippet: 'top-accounts' } },
  { path: 'my-farmer', component: MyFarmerComponent, pathMatch: 'full', data: { titlePrefixSnippet: 'my-farmer' } },
  { path: 'notices', loadChildren: () => import('./notices/notices.module').then(m => m.NoticesModule) },
  { path: 'events', loadChildren: () => import('./events/events.module').then(m => m.EventsModule) },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'enabled',
    relativeLinkResolution: 'legacy'
})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
