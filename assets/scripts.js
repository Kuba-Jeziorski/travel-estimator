'strict mode'

// const API_KEY = "AIzaSyBkBUwIJoiUNQQX49OUvFzGzf-fQl-dpcc";

function initMap() {

    // IMPORTANT letiables
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

    //IMPORTANT functions

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

    // route
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map: map,
    });

    // geolocation
    const geocoder = new google.maps.Geocoder();
    const geo = function(latCoords, lngCoords) {
        geocoder.geocode({ 'latLng': {lat: latCoords, lng: lngCoords} }, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
              if (results[0]) {
                let address_components = results[0].address_components;
                for (let i = 0; i < address_components.length; i++) {
                  let types = address_components[i].types;
                  if (types.indexOf('country') != -1) {
                    console.log(`Country: ${address_components[i].long_name}`);
                  }
                }
              } else {
                alert('No results found');
              }
            } else {
              alert('Geocoder failed due to: ' + status);
            }});
    }

    //IMPORTANT listener
    map.addListener("click", (event) => {

        if (markers.length === 2) {
            hideMarkers();
            deleteMarkers();
        }

        if (markersCoords.length === 4) markersCoords.length = 0;
        
        let markerJSON = JSON.stringify(event.latLng.toJSON(), null, 2);
        let markerObject = JSON.parse(markerJSON);

        addMarker(event.latLng);
        markersCoords.push(markerObject.lat)
        markersCoords.push(markerObject.lng)
        markersDouble.push({lat: markerObject.lat, lng: markerObject.lng})

        

        if (markers.length === 2) {
            // console.log(markersCoords);

            const request = {
                // first marker
                origin: `${markersCoords[0]},${markersCoords[1]}`,
                // second marker
                destination: `${markersCoords[2]},${markersCoords[3]}`,
                travelMode: "DRIVING",
              };
              
            directionsService.route(request, function(result, status) {
                if (status == "OK") {
                  // Display the driving directions on the map
                  directionsRenderer.setDirections(result);
                  const dist = result.routes[0].legs[0].distance.text;
                  console.log(`Distance is: ${dist}`);
                  // marker - country
                  geo(markersCoords[2], markersCoords[3])
                  geo(markersCoords[0], markersCoords[1])
                }
              });
        }
    });
}

