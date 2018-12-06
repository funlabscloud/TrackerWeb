import { Component, OnInit } from '@angular/core';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { Router } from '@angular/router';

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

  private map;
  private myAllTransport = [];
  private marker;
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

  constructor(protected localStorage: LocalStorage,
    private router: Router,
    private config: Config,
    private user: User,
    private location: Location,
    private mapUtil: MapUtil) { }

  ngOnInit() {
    this.map = this.mapUtil.geo.initMap();
    this.glob['map'] = this.map;

    this.localStorage.getItem<User>('user').subscribe((locUser: User) => {
      this.user = locUser;
      this.glob['user'] = locUser;

      // Remove all layers
      this.mapUtil.geo.clearLayers(this.glob.layers, this.glob.map);

      this.fireMovementRef = firebase.database().ref('movement/' + this.user.uId);
      this.onMovementListener();
    });
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
    } else {
      this.fireMovementRef.off('value');
    }
  }

  onSignout() {
    const self = this;
    firebase.auth().signOut().then(function () {
      self.localStorage.clear().subscribe(() => { });
      self.router.navigate([self.config.URL_MAIN]);
    }, function (error) {
      console.log(error);
    });
  }

  onMovementListener() {
    const self = this;

    self.fireMovementRef.on('value', function (data) {
      const transports = data.val();
      if (transports !== null && transports !== undefined) {
        Object.keys(transports).map(function (id) {
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
              transport.lng, icon, transport.bearing, self.map, id, 'helo');
            self.glob.transports[id] = self.marker;
          } else {
            self.map.removeLayer(self.marker);
            self.marker = self.mapUtil.geo.moveMarker(self.marker.getLatLng().lat, self.marker.getLatLng().lng, transport.lat,
              transport.lng, icon, transport.bearing, self.map, id, 'helo');
            self.glob.transports[id] = self.marker;
          }
          self.glob.layers.push(self.marker);
        });
        const group = new L.featureGroup(self.glob.layers);
        self.map.fitBounds(group.getBounds());
      }
    });
  }
}
