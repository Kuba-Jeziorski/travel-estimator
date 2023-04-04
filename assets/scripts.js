"strict mode";

const API_KEY = "AIzaSyBkBUwIJoiUNQQX49OUvFzGzf-fQl-dpcc";

function initMap() {
  // IMPORTANT variables
  let markers = [];
  let markersCoords = [];
  let allPoints = [];

  const retryDelay = 1000;
  const maxRetryCount = 5;
  let retryCount = 0;

  const myLatlng = { lat: 47.751569, lng: 1.675063 };
  const myZoom = 5;

  const options = {
    zoom: myZoom,
    center: myLatlng,
  };

  const map = new google.maps.Map(document.querySelector("#map"), options);

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

  // directions api
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer({
    map: map,
  });

  // coords -> country
  const geocoder = new google.maps.Geocoder();

  function geocodeAddress(address, geocoder) {
    return new Promise((resolve, reject) => {
      geocoder.geocode({ latLng: address }, (results, status) => {
        if (status === "OK") {
          resolve(results[0]);
        } else if (status === "OVER_QUERY_LIMIT") {
          setTimeout(() => {
            retryCount++;
            if (retryCount <= maxRetryCount) {
              geocodeAddress(address, geocoder).then(resolve).catch(reject);
            } else {
              reject(
                new Error(
                  `Geocoding failed after ${maxRetryCount} attempts: ${address}`
                )
              );
            }
          }, retryDelay);
        } else {
          reject(new Error(`Geocoding failed: ${address} (${status})`));
        }
      });
    });
  }

  async function geocodeAddresses(addresses, geocoder, distance) {
    const start = Date.now();
    let results = [];
    let newResults = [];
    for (let i = 0; i < addresses.length; i++) {
      retryCount = 0; // Reset retry count for geocoding request
      try {
        const result = await geocodeAddress(addresses[i], geocoder);
        results.push(result);
        newResults = results
          .map((e) => e.formatted_address)
          .map((e) => e.split(" ").pop());
      } catch (error) {
        console.error(error.message);
      }
    }
    // console.log(results);

    // console.log(newResults);

    const uniquePlacesArray = [...new Set(newResults)];

    const countryObj = uniquePlacesArray.reduce((accumulator, value) => {
      return { ...accumulator, [value]: "" };
    }, {});

    // console.log(countryObj);

    const numericDistance = parseInt(distance.replace(/\D/g, ""));

    for (let key in countryObj) {
      let keyLength = newResults.filter((e) => e === key).length;
      const countryDescription = {
        distance: (keyLength / newResults.length) * numericDistance,
        // currency: "",
      };
      countryObj[key] = countryDescription;
    }
    console.log(`The distance between two markers is: ${distance}`);
    console.log(countryObj);
    // console.log(countryObj.Portugal);

    // console.log(Object.keys(countryObj)[0]);
    // console.log(Object.keys(countryObj).length);

    const countriesInformation = function (country) {
      fetch(`https://restcountries.com/v3.1/name/${country}`)
        .then((response) => response.json())
        .then((data) => {
          const countryInfo = data[0];
          // ta linia wypisuje walutę w danym kraju
          console.log(Object.keys(countryInfo.currencies)[0]);
          return Object.keys(countryInfo.currencies)[0];
        });
    };

    const newCountry = countriesInformation("Poland");
    console.log(newCountry);

    for (let prop in countryObj) {
      countriesInformation(prop);
      // countryObj[prop].currency = countriesInformation(prop);
      countryObj[prop].currency = 5;
    }
    console.log(countryObj);

    // console.log(countryObj.Portugal);

    const end = Date.now();
    console.log(`Execution time: ${(end - start) / 1000} s`);
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
    markersCoords.push(markerObject.lat);
    markersCoords.push(markerObject.lng);

    if (markers.length === 2) {
      const request = {
        origin: `${markersCoords[0]},${markersCoords[1]}`,
        destination: `${markersCoords[2]},${markersCoords[3]}`,
        travelMode: "DRIVING",
      };

      directionsService.route(request, function (result, status) {
        if (status == "OK") {
          // Display the driving directions on the map
          directionsRenderer.setDirections(result);
          const dist = result.routes[0].legs[0].distance.text;

          // points between two markers
          let polyline = result.routes[0].overview_polyline;
          let path = google.maps.geometry.encoding.decodePath(polyline);
          // i+=20, time about: 10.075, 17.464, 10.114, 13.164, 11.177, avg: 12,4s
          // i+=10, time about: 32.235, 33.418, 39.782, 52.36, 32.154, avg: 38s
          // i+=5, time about: 70.673, 83.225, 70.516, 132.312, 70.865, avg: 85.5s
          for (let i = 0; i < path.length; i += 20) {
            let point = path[i];
            let coordsPoint = JSON.parse(JSON.stringify(point));
            allPoints.push(coordsPoint);
          }

          // all coords
          // console.log(allPoints);

          // points between two markers to countries + distances in each country
          geocodeAddresses(allPoints, geocoder, dist);
        }
      });
    }
  });

  // const countriesInformation = function (country) {
  //   fetch(`https://restcountries.com/v3.1/name/${country}`)
  //     .then((response) => response.json())
  //     .then((data) => {
  //       const countryInfo = data[0];
  //       // console.log(countryInfo);
  //       console.log(country);
  //       // console.log(countryInfo.currencies);
  //       console.log(Object.keys(countryInfo.currencies)[0]);
  //     });
  // };

  // countriesInformation("poland");
  // // countriesInformation('france')
  // // countriesInformation('germany')
}
