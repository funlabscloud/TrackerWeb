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
  private markers = [];
  private sideBarOnly = 'sidebar-icon-only';


  constructor(protected localStorage: LocalStorage,
    private router: Router,
    private config: Config,
    private user: User,
    private location: Location,
    private mapUtil: MapUtil) { }

  ngOnInit() {
    this.map = this.mapUtil.geo.initMap();

    this.localStorage.getItem<any>('user').subscribe((locUser) => {
      this.onMovementListener(locUser);
    });
  }

  onSignout() {
    const self = this;
    firebase.auth().signOut().then(function () {
      self.router.navigate([self.config.URL_MAIN]);
    }, function (error) {

    });
  }

  onMovementListener(user: any) {
    const self = this;

    firebase.database().ref('movement/' + user.uId).on('value', function (data) {
      const transports = data.val();
      if (transports !== null && transports !== undefined) {
        Object.keys(transports).map(function (id) {
          const transport = transports[id][0];
          transport.id = id;
          transport.power = Math.round(transport.power);
          transport.time = moment(transport.time).fromNow();

          let lat = '';
          let lng = '';

          for (let itr = 0; itr <= self.markers.length - 1; itr++) {
            const mark = self.markers[itr];
            if (id === mark.id) {
              self.map.removeLayer(mark);
              lat = mark._latlng.lat;
              lng = mark._latlng.lng;
              self.markers.splice(itr, 1);
            }
          }

          const greenIcon = L.icon({
            iconUrl: 'assets/img/car.svg',
            iconSize: [40, 40]
          });

          if (lat === '' || lng === '') {
            const tempMarker = L.marker([transport.lat, transport.lng],
              { icon: greenIcon, rotationAngle: transport.bearing }).addTo(self.map)
              .bindPopup('<div class="card"><div class="card-body"><div class="d-flex justify-content-center">' +
                '<i class="mdi mdi-clock icon-lg text-primary d-flex align-items-center"></i>' +
                '<div class="d-flex flex-column ml-4"><span class="d-flex flex-column"><p class="mb-0">Bounce rate</p>' +
                '<h4 class="font-weight-bold">32.16%</h4></span><small class="text-muted">65.45% on average time</small>' +
                '</div></div></div></div>');
            tempMarker['id'] = id;
            self.markers.push(tempMarker);
          } else {
            if (transport.bearing === 0) {
              transport.bearing = self.mapUtil.geo.bearing(lat, lng, transport.lat, transport.lng);
            }
            const tempMarker = L.Marker.movingMarker([[lat, lng], [transport.lat, transport.lng]],
              [10000], { icon: greenIcon, rotationAngle: transport.bearing })
              .addTo(self.map)
              .bindPopup('<div class="card"><div class="card-body"><div class="d-flex justify-content-center">' +
                '<i class="mdi mdi-clock icon-lg text-primary d-flex align-items-center"></i>' +
                '<div class="d-flex flex-column ml-4"><span class="d-flex flex-column"><p class="mb-0">Bounce rate</p>' +
                '<h4 class="font-weight-bold">32.16%</h4></span><small class="text-muted">65.45% on average time</small>' +
                '</div></div></div></div>');

            tempMarker.start();
            tempMarker['id'] = id;
            self.markers.push(tempMarker);
            const group = new L.featureGroup(self.markers);
            self.map.fitBounds(group.getBounds());
          }
        });
      }
    });
  }

}
