'strict mode'

console.log(`test`);

function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180; // convert to radians
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // distance in kilometers
    return console.log(`Distance between this two points is about: ${Number.parseFloat(distance).toFixed(2)} km`);
}


function initMap() {

    // IMPORTANT variables
    let markers = [];
    let markersCoords = [];
    let markersDouble = [];

    const myLatlng = {lat: 47.751569, lng:1.675063};
    const myZoom = 5;

    const options = {
        zoom: myZoom,
        center: myLatlng,
    }

    const map = new google.maps.Map(document.querySelector('#map'), options);

    let infoWindow = new google.maps.InfoWindow({});

    let flightPath;

    //IMPORTANT functions
    const drawLine = function(pathCoords) {
        flightPath = new google.maps.Polyline({
            path: pathCoords,
            geodesic: true,
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            });

            flightPath.setMap(map);
            return flightPath;
    }

    // adding new marker
    function addMarker(position) {
            const marker = new google.maps.Marker({
            position,
            map,
        });

        markers.push(marker);
    }

    // Sets the map on all markers in the array.
    function setMapOnAll(map) {
        for (let i = 0; i < markers.length; i++) {
            markers[i].setMap(map);
        }
    }

    // Removes the markers from the map, but keeps them in the array.
    function hideMarkers() {
        setMapOnAll(null);
    }

    // Deletes all markers in the array by removing references to them.
    function deleteMarkers() {
        hideMarkers();
        markers = [];
    }

    // Delete polyline
    function removeLine() {
        flightPath.setMap(null);
      }

    //IMPORTANT listener
    map.addListener("click", (event) => {

        if (markers.length === 2) {
            hideMarkers();
            deleteMarkers();
            removeLine();
            flightPath = null;
        }

        if (markersCoords.length === 4) markersCoords.length = 0;
        
        let markerJSON = JSON.stringify(event.latLng.toJSON(), null, 2);
        let markerObject = JSON.parse(markerJSON);

        addMarker(event.latLng);
        markersCoords.push(markerObject.lat)
        markersCoords.push(markerObject.lng)
        markersDouble.push({lat: markerObject.lat, lng: markerObject.lng})

        if (markers.length === 2) {
            calcDistance(...markersCoords);
            drawLine(markersDouble);
        }
    });
}
