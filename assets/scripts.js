"strict mode";

// const API_KEY = "AIzaSyBkBUwIJoiUNQQX49OUvFzGzf-fQl-dpcc";

// litres for 100 km;
const fuelConsumption = 5;

// average cost (in euro!) for one litre of diesel fuel in Europe (10.04.2023)
const diesel = 1.529475;

function initMap() {
  // IMPORTANT variables
  let markers = [];
  let markersCoords = [];
  let allPoints = [];

  // preventing too long promises (coords -> countries)
  const retryDelay = 1000;
  const maxRetryCount = 5;
  let retryCount = 0;

  const mapZoom = 5;
  const mapCenter = { lat: 47.751569, lng: 1.675063 };

  const options = {
    zoom: mapZoom,
    center: mapCenter,
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

  // coords -> country (single)
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

  // coords -> country (all)
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

    const uniquePlacesArray = [...new Set(newResults)];
    console.log(newResults);

    const countryObj = uniquePlacesArray.reduce((accumulator, value) => {
      return { ...accumulator, [value]: "" };
    }, {});

    const numericDistance = parseInt(distance.replace(/\D/g, ""));

    // adding distance property and its value to every country in object
    for (let key in countryObj) {
      // how many copies of particular country occured
      let keyLength = newResults.filter((e) => e === key).length;
      const countryDescription = {
        distance: +Number.parseFloat(
          (keyLength / newResults.length) * numericDistance
        ).toFixed(2),
      };
      countryObj[key] = countryDescription;
    }
    console.log(
      `[OUT] The distance between two markers is: ${numericDistance} km`
    );
    console.log(
      `[OUT] If my car consumes ${fuelConsumption}/100 km, total amount of consumed fuel is ${
        (numericDistance / 100) * fuelConsumption
      } l`
    );

    for (let [key, _] of Object.entries(countryObj)) {
      console.log(
        `[OUT] Distance driven in ${key} is ${countryObj[key].distance} km`
      );
    }

    console.log(countryObj);
    const end = Date.now();
    console.log(`[OUT] Execution time: ${(end - start) / 1000} s`);
  }

  //IMPORTANT listener

  const firstCoord = document.querySelector("#coord1");
  const secondCoord = document.querySelector("#coord2");
  map.addListener("click", (event) => {
    if (markers.length === 2) {
      window.alert(`enough of this clicking shiet`);
      return;
    }

    if (markersCoords.length === 4) markersCoords.length = 0;

    let markerJSON = JSON.stringify(event.latLng.toJSON(), null, 2);
    let markerObject = JSON.parse(markerJSON);

    addMarker(event.latLng);
    markersCoords.push(markerObject.lat);
    markersCoords.push(markerObject.lng);

    if (markers.length === 2) {
      firstCoord.innerHTML = `first coord works - markers.length === 2`;
      secondCoord.innerHTML = `second coord works - markers.length === 2`;
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
          for (let i = 0; i < path.length; i += 5) {
            let point = path[i];
            let coordsPoint = JSON.parse(JSON.stringify(point));
            allPoints.push(coordsPoint);
          }

          // points between two markers to countries + distances in each country
          geocodeAddresses(allPoints, geocoder, dist);
        }
      });
    }
  });

  // IMPORTANT main function

  const travelForm = document.querySelector("#travel-form");
  const travelConsumption = document.querySelector("#travel-consumption");
  const travelPrecision = document.querySelector("#travel-precision");

  const mainFunction = function (e) {
    if (e) e.preventDefault();
    console.log(travelConsumption.value);
    console.log(travelPrecision.value);
    if (firstCoord.textContent !== "" && secondCoord.textContent !== "")
      console.log(`coords are fine`);
    if (firstCoord.textContent === "" || secondCoord.textContent === "")
      console.log(`coords are NOT fine`);
    console.log(`form submited`);
  };

  travelForm.addEventListener("submit", function (e) {
    mainFunction(e);
  });
}

// range-picker
let slider = document.getElementById("travel-precision");
let output = document.getElementById("demo");
output.innerHTML = slider.value; // Display the default slider value

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function () {
  output.innerHTML = this.value;
};
console.log(`test`);
