import { Injectable } from '@angular/core';

declare let L;
declare var moment: any;

@Injectable()
export class MapUtil {

    public geo = {
        initMap: function () {
            const map = L.map('map').setView([13.0234427, 80.16], 6);
            let tileLayer = L.tileLayer('https://mt.google.com/vt/x={x}&y={y}&z={z}').addTo(map);
            tileLayer.on('tileerror', function (error, tile) {
                map.removeLayer(tileLayer);
                tileLayer = L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png').addTo(map);
            });
            return map;
        },
        marker: function (lat, lng, icon, bearing, map, id, html) {
            const marker = L.marker([lat, lng],
                { icon: icon, rotationAngle: bearing }).addTo(map);
            marker['id'] = id;
            if (html !== '') {
                marker.bindPopup(html);
            }
            return marker;
        },
        moveMarker: function (lat1, lng1, lat2, lng2, icon, bearing, map, id, html) {
            const marker = L.Marker.movingMarker([[lat1, lng1], [lat2, lng2]],
                3000, { icon: icon, rotationAngle: bearing, autostart: true })
                .addTo(map);
            marker['id'] = id;
            if (html !== '') {
                marker.bindPopup(html);
            }
            return marker;
        },
        clearLayers: function (layers, map) {
            for (let itr = 0; itr <= layers.length - 1; itr++) {
                map.removeLayer(layers[itr]);
            }
        },
        mapIcon: function (transportType) {
            if (transportType === 'RUNNING') {
                const icon = L.icon({
                    iconUrl: 'assets/img/running.svg',
                    iconSize: [65, 65],
                    iconAnchor: [35, 35],
                    popupAnchor: [1, 0],
                    shadowSize: [0, 0]
                });
                return icon;
            } else if (transportType === 'PARKED') {
                const icon = L.icon({
                    iconUrl: 'assets/img/parking.svg',
                    iconSize: [25, 25],
                    iconAnchor: [7, 5],
                    popupAnchor: [1, -34],
                    shadowSize: [0, 0]
                });
                return icon;
            } else if (transportType === 'IDLE') {
                const icon = L.icon({
                    iconUrl: 'assets/img/running.svg',
                    iconSize: [65, 65],
                    iconAnchor: [35, 35],
                    popupAnchor: [1, 0],
                    shadowSize: [0, 0]
                });
                return icon;
            } else if (transportType === 'DISCONNECT') {
                const icon = L.icon({
                    iconUrl: 'assets/img/red_dot.png',
                    iconSize: [20, 20],
                    iconAnchor: [15, 30],
                    popupAnchor: [1, -34],
                    shadowSize: [0, 0]
                });
                return icon;
            } else if (transportType === 'START') {
                const icon = L.icon({
                    iconUrl: 'assets/img/pin_start.png',
                    iconSize: [24, 30],
                    iconAnchor: [13, 29],
                    popupAnchor: [0, 0],
                    shadowSize: [0, 0]
                });
                return icon;
            } else if (transportType === 'END') {
                const icon = L.icon({
                    iconUrl: 'assets/img/pin_end.png',
                    iconSize: [24, 30],
                    iconAnchor: [11, 25],
                    popupAnchor: [0, 0],
                    shadowSize: [0, 0]
                });
                return icon;
            }
        },
        timeDiffrence: function (startDate, endDate) {
            const start_date = moment(startDate);
            const end_date = moment(endDate);
            const duration = end_date.diff(start_date, 'minutes');
            return duration;
        },
        distanceBetweenPoints: function (p1, p2) {
            if (!p1 || !p2) {
                return 0;
            }
            const R = 6371;
            const dLat = (p2.lat() - p1.lat()) * Math.PI / 180;
            const dLon = (p2.lng() - p1.lng()) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(p1.lat() * Math.PI / 180) * Math.cos(p2.lat() * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const d = R * c;
            return d;
        },
        parkingFinder: function (points) {
            const self = this;
            let park = { lat: '', lng: '', location: '', start: '', end: '', duration: '', power: '' };
            const totalPoints = points.length;
            const parked = [];
            let itr = 1;
            Object.keys(points).forEach(function (index) {
                const point = points[index];
                if (point.motion === 'PARKED') {
                    if (park.start === '') {
                        park.start = point.time;
                        park.location = 'Chennai';
                        park.power = point.power;
                    }

                    if (itr === totalPoints) {
                        park.lat = point.lat;
                        park.lng = point.lng;
                        park.end = point.time;
                        park.duration = self.timeDiffrence(park.start, park.end);
                        parked.push(park);
                        park = { lat: '', lng: '', location: '', start: '', end: '', duration: '', power: '' };
                    }
                } else {
                    if (park.start !== '') {
                        park.lat = point.lat;
                        park.lng = point.lng;
                        park.end = point.time;
                        park.duration = self.timeDiffrence(park.start, park.end);
                        parked.push(park);
                        park = { lat: '', lng: '', location: '', start: '', end: '', duration: '', power: '' };
                    }
                }
                itr = itr + 1;
            });

            // Eliminate parking duration < 5min
            const parking = [];
            for (let loop = 0; loop <= parked.length - 1; loop++) {
                if (parked[loop].duration >= 5) {
                    parking.push(parked[loop]);
                }
            }
            return parking;
        },
        overSpeedFinder: function (points) {
            const self = this;
            let flag = true;
            let startTime;
            let speedObj = { lat: '', lng: '', location: '', speed: '', duration: '', power: '' };
            const overSpeeds = [];
            Object.keys(points).forEach(function (index) {
                if (points[index].calspeed >= 80) {
                    if (flag) {
                        startTime = points[index].time;
                        flag = false;
                    } else {
                        speedObj = { lat: '', lng: '', location: '', speed: '', duration: '', power: '' };
                        speedObj.lat = points[index].lat;
                        speedObj.lng = points[index].lng;
                        speedObj.location = points[index].location;
                        speedObj.speed = points[index].calspeed;
                        speedObj.power = points[index].power;
                        speedObj.duration = self.timeDiffrence(startTime, points[index].time);
                        overSpeeds.push(speedObj);
                        flag = true;
                    }
                }
            });
            // Get speed duration > 5min
            const overSpeed = [];
            for (let loop = 0; loop <= overSpeeds.length - 1; loop++) {
                if (overSpeeds[loop].duration >= 5) {
                    overSpeed.push(overSpeeds[loop]);
                }
            }
            return overSpeed;
        }
    };
}
