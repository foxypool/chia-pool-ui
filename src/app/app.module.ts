import { BrowserModule } from '@angular/platform-browser'
import { NgModule, ErrorHandler, APP_INITIALIZER } from '@angular/core'
import {Router} from '@angular/router'
import * as Sentry from '@sentry/angular-ivy'

import { AppRoutingModule } from './app-routing.module'
import { AppComponent } from './app.component'
import { HeaderComponent } from './header/header.component'
import { FooterComponent } from './footer/footer.component'
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome'
import {FormsModule, ReactiveFormsModule} from '@angular/forms'
import { BlocksWonComponent } from './blocks-won/blocks-won.component'
import { PayoutsComponent } from './payouts/payouts.component'
import { TopAccountsComponent } from './top-accounts/top-accounts.component'
import { DashboardComponent } from './dashboard/dashboard.component'
import { StatsCardComponent } from './stats-card/stats-card.component'
import {NgbModule} from '@ng-bootstrap/ng-bootstrap'
import { ServiceWorkerModule } from '@angular/service-worker'
import { environment } from '../environments/environment'
import { ToastrModule } from 'ngx-toastr'
import {BrowserAnimationsModule} from '@angular/platform-browser/animations'
import { NgxScrollTopModule } from 'ngx-scrolltop'
import {WINDOW_PROVIDERS} from './window.provider'
import { EmptyStateComponent } from './empty-state/empty-state.component'
import { LoadingStateComponent } from './loading-state/loading-state.component'
import { MyFarmerComponent } from './my-farmer/my-farmer.component'
import { AuthenticationModalComponent } from './authentication-modal/authentication-modal.component'
import {ClipboardModule} from 'ngx-clipboard'
import { UpdateAccountComponent } from './update-account/update-account.component'
import { LeavePoolComponent } from './leave-pool-modal/leave-pool.component'
import { UpdatePayoutOptionsComponent } from './update-minimum-payout/update-payout-options.component'
import {NgxEchartsModule} from 'ngx-echarts'
import { PoolHistoryComponent } from './pool-history/pool-history.component'
import { FarmerPayoutHistoryComponent } from './farmer-payout-history/farmer-payout-history.component'
import { FarmerWonBlocksComponent } from './farmer-won-blocks/farmer-won-blocks.component'
import { CurrencySelectorComponent } from './currency-selector/currency-selector.component'
import {UpdateDifficultyComponent} from './update-difficulty/update-difficulty.component'
import {
  UpdateNotificationSettingsComponent
} from './update-notification-settings/update-notification-settings.component'
import { FarmerHarvestersComponent } from './farmer-harvesters/farmer-harvesters.component'
import { HarvesterCardComponent } from './harvester-card/harvester-card.component'
import {
  EditableComponent,
  EditableOnEnterDirective,
  EditableOnEscapeDirective,
  EditModeDirective,
  ViewModeDirective
} from '@ngneat/edit-in-place'
import { SettingsModalComponent } from './settings-modal/settings-modal.component'
import {NgOptimizedImage} from '@angular/common'
import { FarmerListComponent } from './farmer-list/farmer-list.component'
import {HarvesterSettingsModalComponent} from './harvester-settings-modal/harvester-settings-modal.component'
import {
  UpdateHarvesterNotificationSettingsComponent
} from './update-harvester-notification-settings/update-harvester-notification-settings.component'
import { GenerateLoginLinkComponent } from './generate-login-link/generate-login-link.component'
import {QRCodeModule} from 'angularx-qrcode'
import { VersionInfoComponent } from './version-info/version-info.component'
import { IntegrationSettingsComponent } from './integration-settings/integration-settings.component'
import {NgxSliderModule} from 'ngx-slider-v2'
import { UpdateBlockSettingsComponent } from './update-block-settings/update-block-settings.component'
import { ConfirmationModalComponent } from './confirmation-modal/confirmation-modal.component'
import {FarmerPartialsComponent} from './farmer-partials/farmer-partials.component'
import {UpdateRewardSettingsComponent} from './update-reward-settings/update-reward-settings.component'
import {FarmerBalanceChangesComponent} from './farmer-balance-changes/farmer-balance-changes.component'

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
    MyFarmerComponent,
    AuthenticationModalComponent,
    UpdateAccountComponent,
    LeavePoolComponent,
    UpdatePayoutOptionsComponent,
    UpdateDifficultyComponent,
    UpdateNotificationSettingsComponent,
    PoolHistoryComponent,
    FarmerPayoutHistoryComponent,
    FarmerWonBlocksComponent,
    CurrencySelectorComponent,
    FarmerHarvestersComponent,
    HarvesterCardComponent,
    SettingsModalComponent,
    FarmerListComponent,
    HarvesterSettingsModalComponent,
    UpdateHarvesterNotificationSettingsComponent,
    GenerateLoginLinkComponent,
    VersionInfoComponent,
    IntegrationSettingsComponent,
    UpdateBlockSettingsComponent,
    ConfirmationModalComponent,
    FarmerPartialsComponent,
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
    NgxScrollTopModule,
    ReactiveFormsModule,
    ClipboardModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts'),
    }),
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    EditableComponent,
    EditModeDirective,
    ViewModeDirective,
    EditableOnEnterDirective,
    EditableOnEscapeDirective,
    NgOptimizedImage,
    NgxSliderModule,
    QRCodeModule,
    UpdateRewardSettingsComponent,
    FarmerBalanceChangesComponent,
    EmptyStateComponent,
    LoadingStateComponent,
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
      useFactory: () => () => {
      },
      deps: [Sentry.TraceService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
