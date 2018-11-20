import { Component, OnInit } from '@angular/core';
import { LocalStorage } from '@ngx-pwa/local-storage';

import { User } from '../model/User';

declare var $: any;
declare var moment: any;
declare var firebase: any;
declare let L;
import 'leaflet-rotatedmarker';
import '../../assets/js/movemarker';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  sideBarOnly = 'sidebar-icon-only';
  private transports;
  private markers = [];

  geo = {

    bearing: function (lat1, lng1, lat2, lng2) {
      const dLon = this._toRad(lng2 - lng1);
      const y = Math.sin(dLon) * Math.cos(this._toRad(lat2));
      const x = Math.cos(this._toRad(lat1)) * Math.sin(this._toRad(lat2)) -
        Math.sin(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) * Math.cos(dLon);
      const brng = this._toDeg(Math.atan2(y, x));
      return ((brng + 360) % 360);
    },
    _toRad: function (deg) {
      return deg * Math.PI / 180;
    },
    _toDeg: function (rad) {
      return rad * 180 / Math.PI;
    },
  };

  constructor(protected localStorage: LocalStorage) { }

  ngOnInit() {
    const self = this;

    const map = L.map('map').setView([13.0234427, 80.16], 13);

    L.tileLayer('http://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png').addTo(map);

    const greenIcon = L.icon({
      iconUrl: 'assets/img/car.svg',
      iconSize: [40, 40]
    });

    this.localStorage.getItem<any>('uid').subscribe((uid) => {

      firebase.database().ref('movement/' + uid).on('value', function (data) {

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
                map.removeLayer(mark);
                lat = mark._latlng.lat;
                lng = mark._latlng.lng;
                self.markers.splice(itr, 1);
              }
            }

            if (lat === '' || lng === '') {
              const tempMarker = L.marker([transport.lat, transport.lng], { icon: greenIcon, rotationAngle: transport.bearing }).addTo(map)
                .bindPopup('<div class="card"><div class="card-body"><div class="d-flex justify-content-center">' +
                  '<i class="mdi mdi-clock icon-lg text-primary d-flex align-items-center"></i>' +
                  '<div class="d-flex flex-column ml-4"><span class="d-flex flex-column"><p class="mb-0">Bounce rate</p>' +
                  '<h4 class="font-weight-bold">32.16%</h4></span><small class="text-muted">65.45% on average time</small>' +
                  '</div></div></div></div>');
              tempMarker['id'] = id;
              self.markers.push(tempMarker);
            } else {
              if (transport.bearing === 0) {
                transport.bearing = self.geo.bearing(lat, lng, transport.lat, transport.lng);
              }
              const tempMarker = L.Marker.movingMarker([[lat, lng], [transport.lat, transport.lng]],
                [200000], { icon: greenIcon, rotationAngle: transport.bearing })
                .addTo(map)
                .bindPopup('<div class="card"><div class="card-body"><div class="d-flex justify-content-center">' +
                  '<i class="mdi mdi-clock icon-lg text-primary d-flex align-items-center"></i>' +
                  '<div class="d-flex flex-column ml-4"><span class="d-flex flex-column"><p class="mb-0">Bounce rate</p>' +
                  '<h4 class="font-weight-bold">32.16%</h4></span><small class="text-muted">65.45% on average time</small>' +
                  '</div></div></div></div>');

              tempMarker.start();
              tempMarker['id'] = id;
              self.markers.push(tempMarker);
            }
          });
        }
      });
    });
  }

}
