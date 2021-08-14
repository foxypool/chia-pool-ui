import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ErrorHandler, APP_INITIALIZER } from '@angular/core';
import {Router} from '@angular/router';
import * as Sentry from '@sentry/angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { BlocksWonComponent } from './blocks-won/blocks-won.component';
import { PayoutsComponent } from './payouts/payouts.component';
import { TopAccountsComponent } from './top-accounts/top-accounts.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { StatsCardComponent } from './stats-card/stats-card.component';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { ToastrModule } from 'ngx-toastr';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { NgxScrollTopModule } from 'ngx-scrolltop';
import {WINDOW_PROVIDERS} from "./window.provider";
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { LoadingStateComponent } from './loading-state/loading-state.component';
import { MyFarmerComponent } from './my-farmer/my-farmer.component';
import { AuthenticationModalComponent } from './authentication-modal/authentication-modal.component';
import {ClipboardModule} from 'ngx-clipboard';
import { UpdateNameModalComponent } from './update-name-modal/update-name-modal.component';
import { LeavePoolModalComponent } from './leave-pool-modal/leave-pool-modal.component';
import { UpdateMinimumPayoutModalComponent } from './update-minimum-payout-modal/update-minimum-payout-modal.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    BlocksWonComponent,
    PayoutsComponent,
    TopAccountsComponent,
    DashboardComponent,
    StatsCardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    MyFarmerComponent,
    AuthenticationModalComponent,
    UpdateNameModalComponent,
    LeavePoolModalComponent,
    UpdateMinimumPayoutModalComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FontAwesomeModule,
    FormsModule,
    NgbModule,
    BrowserAnimationsModule,
    ToastrModule.forRoot({
      newestOnTop: false,
    }),
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    NgxScrollTopModule,
    ReactiveFormsModule,
    ClipboardModule,
  ],
  providers: [
    WINDOW_PROVIDERS,
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler(),
    },
    {
      provide: Sentry.TraceService,
      deps: [Router],
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {},
      deps: [Sentry.TraceService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
