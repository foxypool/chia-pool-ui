import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormsModule} from "@angular/forms";

import {FaucetComponent} from "./faucet.component";
import {FaucetRoutingModule} from "./faucet-routing.module";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";

@NgModule({
  declarations: [FaucetComponent],
  imports: [
    FormsModule,
    CommonModule,
    FaucetRoutingModule,
    FontAwesomeModule,
  ],
})
export class FaucetModule { }
