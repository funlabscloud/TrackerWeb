import { Injectable } from '@angular/core';

declare let L;

@Injectable()
export class MapUtil {

    public geo = {
        initMap: function () {
            const map = L.map('map').setView([13.0234427, 80.16], 15);
            L.tileLayer('http://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png').addTo(map);
            return map;
        },
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

}
