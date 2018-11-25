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
  private sideBarOnly = 'sidebar-icon-only';
  private fireMovementRef;
  private glob = {
    myAllTransport: [],
    map: {},
    user: {},
    markers: []
  };

  // window
  private trackWindow = false;

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

          const oldMarker = self.mapUtil.geo.clearMarkerArray(id, self.glob.markers, self.map);
          const lat1 = oldMarker._latlng.lat;
          const lng1 = oldMarker._latlng.lng;

          const icon = self.mapUtil.geo.mapIcon('CAR');

          if (lat1 === '' || lng1 === '') {
            const marker = self.mapUtil.geo.marker(transport.lat, transport.lng, icon, transport.bearing, self.map, id, 'helo');
            self.glob.markers.push(marker);
          } else {
            if (transport.bearing === 0) {
              transport.bearing = self.mapUtil.geo.bearing(lat1, lng1, transport.lat, transport.lng);
            }
            const marker = self.mapUtil.geo.moveMarker(lat1, lng1, transport.lat,
              transport.lng, icon, transport.bearing, self.map, id, 'helo');
            self.glob.markers.push(marker);

            const group = new L.featureGroup(self.glob.markers);
            setTimeout(() => {
              self.map.fitBounds(group.getBounds());
            }, 500);
          }
        });
      }
    });
  }
}
