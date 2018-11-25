import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MaterialModule } from './material.module';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import 'hammerjs';

import { Config } from './utility/config';
import { MapUtil } from './utility/maputil';

import { User } from './model/User';
import { Location } from './model/Location';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { AuthComponent } from './auth/auth.component';
import { MapComponent } from './map/map.component';
import { TrackComponent } from './track/track.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    AuthComponent,
    MapComponent,
    TrackComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    MaterialModule,
    HttpClientModule,
    AppRoutingModule,
    LeafletModule.forRoot(),
    LeafletModule,
    NgbModule
  ],
  providers: [Config, MapUtil, User, Location],
  bootstrap: [AppComponent]
})
export class AppModule { }
