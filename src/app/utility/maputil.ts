import { Injectable } from '@angular/core';

declare let L;

@Injectable()
export class MapUtil {

    public geo = {
        initMap: function () {
            const map = L.map('map').setView([13.0234427, 80.16], 5);
            L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png').addTo(map);
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
        marker: function (lat, lng, icon, bearing, map, id, html) {
            const marker = L.marker([lat, lng],
                { icon: icon, rotationAngle: bearing }).addTo(map)
                .bindPopup(html);
            marker['id'] = id;
            return marker;
        },
        moveMarker: function (lat1, lng1, lat2, lng2, icon, bearing, map, id, html) {
            const marker = L.Marker.movingMarker([[lat1, lng1], [lat2, lng2]],
                500, { icon: icon, rotationAngle: bearing })
                .addTo(map)
                .bindPopup(html);
            marker.start();
            marker['id'] = id;
            return marker;
        },
        clearMarker: function (id, markers, map) {
            if (markers.length > 0) {
                for (let itr = 0; itr <= markers.length - 1; itr++) {
                    const marker = markers[itr];
                    if (id === marker.id) {
                        map.removeLayer(marker);
                        markers.splice(itr, 1);
                        return marker;
                    }
                }
            } else {
                const marker: any = { _latlng: { lat: '', lng: '' } };
                return marker;
            }
        },
        mapIcon: function (transportType) {
            const icon = L.icon({
                iconUrl: 'assets/img/car.svg',
                iconSize: [40, 40]
            });
            return icon;
        }
    };

}