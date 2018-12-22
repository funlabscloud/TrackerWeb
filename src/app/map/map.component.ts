import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material';

import { User } from '../model/User';
import { Config } from '../utility/config';
import { Location } from '../model/Location';
import { MapUtil } from '../utility/maputil';
import 'leaflet-rotatedmarker';
import '../../assets/js/movemarker';

declare var $: any;
declare var moment: any;
declare var firebase: any;
declare let L;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  private marker;
  private myAllTransport = [];
  private sideBarOnly = 'sidebar-icon-only';
  private fireMovementRef;
  private glob: any = {
    myAllTransport: [],
    map: {},
    user: {},
    layers: [],
    transports: {}
  };

  // window
  private trackWindow = false;
  private replayWindow = false;

  constructor(public snackBar: MatSnackBar,
    private router: Router,
    private config: Config,
    private location: Location,
    private user: User,
    private mapUtil: MapUtil) { }

  ngOnInit() {
    this.glob['map'] = this.mapUtil.geo.initMap();
    this.glob['user'] = JSON.parse(localStorage.getItem('user'));
    this.user = this.glob['user'];
    // Remove all layers
    this.mapUtil.geo.clearLayers(this.glob.layers, this.glob.map);

    this.fireMovementRef = firebase.database().ref('movement/' + this.glob['user'].uId);
    this.onMovementListener();
  }

  showTrackWindow() {
    this.trackWindow = true;
  }

  onTrackClosed(closed: boolean) {
    if (closed) {
      this.trackWindow = false;
      this.onMovementListener();
    } else {
      // Tracking clicked
      this.fireMovementRef.off('value');
    }
  }

  showReplayWindow() {
    this.replayWindow = true;
  }

  onReplayClosed(closed: boolean) {
    if (closed) {
      this.replayWindow = false;
      this.onMovementListener();
    } else {
      this.fireMovementRef.off('value');
    }
  }

  onSignout() {
    const self = this;
    firebase.auth().signOut().then(function () {
      localStorage.clear();
      self.router.navigate([self.config.URL_MAIN]);
    }, function (error) {
      console.log(error);
    });
  }

  onMovementListener() {
    const self = this;

    setTimeout(() => {
      self.snackBar.open(self.config.MSG_PLS_WAIT, self.config.EMPTY, { duration: self.config.SNACKBAR_EVER });
    });

    self.fireMovementRef.on('value', function (data) {
      const transports = data.val();
      if (transports !== null && transports !== undefined) {
        Object.keys(transports).forEach(function (id) {
          const transport = transports[id][0];
          transport.id = id;
          transport.power = Math.round(transport.power);
          transport.time = moment(transport.time).fromNow();

          if (self.glob.myAllTransport.indexOf(id) === -1) {
            self.glob.myAllTransport.push(id);
          }

          let icon;
          if (transport.speed < 10) {
            icon = self.mapUtil.geo.mapIcon('IDLE');
          } else {
            icon = self.mapUtil.geo.mapIcon('RUNNING');
          }

          self.marker = self.glob.transports[id];
          if (self.marker === undefined) {
            self.marker = self.mapUtil.geo.moveMarker(transport.lat, transport.lng, transport.lat,
              transport.lng, icon, transport.bearing, self.glob['map'], id, 'helo');
            self.glob.transports[id] = self.marker;
          } else {
            self.glob['map'].removeLayer(self.marker);
            self.marker = self.mapUtil.geo.moveMarker(self.marker.getLatLng().lat, self.marker.getLatLng().lng, transport.lat,
              transport.lng, icon, transport.bearing, self.glob['map'], id, 'helo');
            self.glob.transports[id] = self.marker;
          }

          self.glob.layers.push(self.marker);
        });
        const group = new L.featureGroup(self.glob.layers);
        self.glob['map'].fitBounds(group.getBounds());
      }
      self.snackBar.dismiss();
    });
  }
}
