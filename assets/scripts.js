"strict mode";

// const API_KEY = "AIzaSyBkBUwIJoiUNQQX49OUvFzGzf-fQl-dpcc";

// litres for 100 km;
const fuelConsumption = 5;

// average cost (in euro!) for one litre of diesel fuel in Europe (10.04.2023)
const diesel = 1.529475;

const tripOrigin = document.querySelector("#trip-origin");
const tripDestination = document.querySelector("#trip-destination");
const wholeDistance = document.querySelector("#whole-distance");
const avgFuel = document.querySelector("#average-fuel");
const fuelUsed = document.querySelector("#fuel-used");
const tripCost = document.querySelector("#trip-cost");
const finalResults = document.querySelector("#final-results");

const placesBox = document.querySelector(".places-box");
const distanceBox = document.querySelector(".distance-box");
const sumBox = document.querySelector(".sum-box");

const finalWrapper = document.querySelector(".final-wrapper");

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
  async function geocodeAddresses(addresses, geocoder, distance, fuelCons) {
    const start = Date.now();
    let results = [];
    let newResults = [];
    let places = [];
    let firstAndLast = [];
    // console.log(addresses);
    for (let i = 0; i < addresses.length; i++) {
      retryCount = 0; // Reset retry count for geocoding request
      try {
        const result = await geocodeAddress(addresses[i], geocoder);
        results.push(result);
        newResults = results
          .map((e) => e.formatted_address)
          .map((e) => e.split(" ").pop());
        places = results.map((e) => e.formatted_address);
      } catch (error) {
        console.error(error.message);
      }
    }
    firstAndLast.push(places[places.length - 1]);
    firstAndLast.push(places[0]);

    const uniquePlacesArray = [...new Set(newResults)];

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

    tripOrigin.innerHTML = `Origin: <span>${firstAndLast[1]}</span>`;
    tripDestination.innerHTML = `Destination: <span>${firstAndLast[0]}</span>`;

    for (let [key, _] of Object.entries(countryObj)) {
      distanceBox.insertAdjacentHTML(
        "beforeend",
        `<p>Distance driven in <span>${key}</span> is <span>${countryObj[key].distance} km</span></p>`
      );
      console.log(`added`);
    }

    wholeDistance.innerHTML = `whole distance is: <span>${numericDistance} km</span>`;
    console.log(
      `[OUT] The distance between two markers is: ${numericDistance} km`
    );
    avgFuel.innerHTML = `average fuel consumption is <span>${fuelCons} l/100 km</span>`;
    let wholeFuel = (numericDistance / 100) * fuelCons;
    fuelUsed.innerHTML = `fuel used is <span>${Number.parseFloat(
      wholeFuel
    ).toFixed(2)} l</span>`;
    console.log(
      `[OUT] If my car consumes ${fuelCons}/100 km, total amount of consumed fuel is ${
        (numericDistance / 100) * fuelCons
      } l`
    );
    let wholeCost = (numericDistance / 100) * fuelCons * diesel;
    tripCost.innerHTML = `Cost of whole trip is <span>${Number.parseFloat(
      wholeCost
    ).toFixed(2)}€</span> (data from 10.04.2023)`;

    finalWrapper.style.display = "block";

    console.log(countryObj);

    console.log(distanceBox);
    // it shows value when declared; can't be declared at the beggining of script
    const distanceBoxContent = document.querySelectorAll(".distance-box p");
    const distanceBoxContentArray = [...distanceBoxContent];
    console.log(distanceBoxContentArray);

    let distanceIndex = 0;
    const intervalId = setInterval(() => {
      console.log(distanceBoxContentArray[distanceIndex].innerText);
      distanceIndex++;

      if (distanceIndex === distanceBoxContentArray.length) {
        clearInterval(intervalId);
      }
    }, 1000);

    const end = Date.now();
    console.log(`[OUT] Execution time: ${(end - start) / 1000} s`);
  }

  //IMPORTANT listener

  const firstCoord = document.querySelector("#coord1");
  const secondCoord = document.querySelector("#coord2");
  let pathBetween = {};
  let distanceBetween;

  map.addListener("click", (event) => {
    if (markers.length === 2) {
      window.alert(`enough of this clicking shiet`);
      return;
    }

    let markerJSON = JSON.stringify(event.latLng.toJSON(), null, 2);
    let markerObject = JSON.parse(markerJSON);

    addMarker(event.latLng);
    markersCoords.push(markerObject.lat);
    markersCoords.push(markerObject.lng);

    if (markers.length === 2) {
      // origin / destination
      firstCoord.innerHTML = `Origin coords - <span>${markersCoords[0]}, ${markersCoords[1]}</span>`;
      secondCoord.innerHTML = `Destination coords - <span>${markersCoords[2]}, ${markersCoords[3]}</span>`;
      const request = {
        origin: `${markersCoords[0]},${markersCoords[1]}`,
        destination: `${markersCoords[2]},${markersCoords[3]}`,
        travelMode: "DRIVING",
      };

      directionsService.route(request, function (result, status) {
        if (status == "OK") {
          // Display the driving directions on the map
          directionsRenderer.setDirections(result);
          distanceBetween = result.routes[0].legs[0].distance.text;

          // points between two markers
          let polyline = result.routes[0].overview_polyline;
          pathBetween = google.maps.geometry.encoding.decodePath(polyline);
        }
      });
    }
  });

  // IMPORTANT main function

  const travelForm = document.querySelector("#travel-form");
  const formSubmit = document.querySelector("#form-submit");

  const travelConsumption = document.querySelector("#travel-consumption");
  const travelPrecision = document.querySelector("#travel-precision");

  // on-submit function
  const mainFunction = function (e) {
    if (e) e.preventDefault();
    console.log(`---`);

    // form conditionals
    const firstCoordContent = firstCoord.textContent;
    const secondCoordContent = firstCoord.textContent;
    const pathBetweenLength = Object.keys(pathBetween).length;
    const fuelConsumption = +travelConsumption.value;
    const precision = travelPrecision.value;

    console.log(`precisition: ${precision}`);
    if (firstCoordContent !== "" && secondCoordContent !== "")
      console.log(`coords are fine`);
    if (firstCoordContent === "" || secondCoordContent === "")
      console.log(`coords are NOT fine`);
    if (fuelConsumption === 0) console.log(`consumption is NOT set`);
    if (fuelConsumption !== 0)
      console.log(`consumption is set to ${fuelConsumption}`);
    if (pathBetweenLength === 0) console.log(`path is NOT fine`);
    if (pathBetweenLength !== 0) {
      console.log(`path is fine`);
      console.log(pathBetween.length);
    }

    // every condition is met
    if (
      firstCoordContent !== "" &&
      secondCoordContent !== "" &&
      pathBetweenLength !== 0 &&
      fuelConsumption !== 0
    ) {
      console.log(`all conditions met`);

      let increment = 0;
      console.log(precision);
      switch (true) {
        case precision == 1:
          console.log("switch precision 1 - low precision");
          increment = 20;
          break;
        case precision == 2:
          console.log("switch precision 2 - medium precision");
          increment = 10;
          break;
        default:
          console.log(`switch precision 3 - high precision`);
          increment = 5;
      }

      for (let i = 0; i < pathBetween.length; i += increment) {
        let point = pathBetween[i];
        let coordsPoint = JSON.parse(JSON.stringify(point));
        allPoints.push(coordsPoint);
      }

      // points between two markers to countries + distances in each country
      geocodeAddresses(allPoints, geocoder, distanceBetween, fuelConsumption);
    }

    console.log(`form submited`);
    formSubmit.textContent = `RESET`;
  };

  travelForm.addEventListener(
    "submit",
    function (e) {
      mainFunction(e);
    },
    { once: true }
  );
}

// range-picker
let slider = document.getElementById("travel-precision");
let output = document.getElementById("travel-precision-output");

// default state
output.innerHTML = `2 - medium precision`;

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function () {
  let precision = "";
  switch (true) {
    case this.value == 1:
      precision = `low precision`;
      break;
    case this.value == 2:
      precision = `medium precision`;
      break;
    default:
      precision = `high precision`;
  }
  output.innerHTML = `${this.value} - ${precision}`;
};

// add cost of whole trip - done
// take care of front - make final look - done

// add information
// add fade-in effect in each line of result
// add rotating Earth while loading content + white opacity
// add RESET on submit button while submitted
// optimalize js
// optimalize scss
