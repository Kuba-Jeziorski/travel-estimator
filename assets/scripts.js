"strict mode";

// const API_KEY = "AIzaSyBkBUwIJoiUNQQX49OUvFzGzf-fQl-dpcc";

// IMPORTANT global variables
const avgFuel = document.querySelector("#average-fuel");
const buttons = document.querySelectorAll("button");
const checkboxes = document.querySelectorAll("input[type=checkbox]");
const checkboxesArray = [...checkboxes];
const distanceBox = document.querySelector(".distance-box");
const finalResults = document.querySelector("#final-results");
const finalWrapper = document.querySelector(".final-wrapper");
const fuelUsed = document.querySelector("#fuel-used");
const opacityAfterSubmit = document.querySelector(".traveler-opacity");
const resetButton = document.querySelector("#reset");
const travelConsumption = document.querySelector("#travel-consumption");
const travelCost = document.querySelector("#travel-cost");
const travelDestination = document.querySelector("#travel-destination");
const travelForm = document.querySelector("#travel-form");
const travelOrigin = document.querySelector("#travel-origin");
const travelPrecision = document.querySelector("#travel-precision");
const travelSubmit = document.querySelector("#travel-submit");
const wholeDistance = document.querySelector("#whole-distance");

function initMap() {
  // IMPORTANT initMap() variables
  const firstCoord = document.querySelector("#coord1");
  const secondCoord = document.querySelector("#coord2");

  let pathBetween = {};
  let distanceBetween;
  let markers = [];
  let markersCoords = [];
  let allPoints = [];

  // preventing too long promises (coords -> countries)
  let retryCount = 0;
  const maxRetryCount = 5;
  const retryDelay = 1000;

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
    for (let i = 0; i < addresses.length; i++) {
      retryCount = 0;
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

    travelOrigin.innerHTML = `Origin: <span>${firstAndLast[1]}</span>`;
    travelDestination.innerHTML = `Destination: <span>${firstAndLast[0]}</span>`;

    for (let [key, _] of Object.entries(countryObj)) {
      distanceBox.insertAdjacentHTML(
        "beforeend",
        `<p>Distance driven in <span>${key}</span> is <span>${countryObj[key].distance} km</span></p>`
      );
    }

    wholeDistance.innerHTML = `Whole distance is: <span>${numericDistance} km</span>`;
    console.log(
      `[OUT] The distance between two markers is: ${numericDistance} km`
    );
    avgFuel.innerHTML = `Average fuel consumption is <span>${fuelCons} l/100 km</span>`;
    let wholeFuel = (numericDistance / 100) * fuelCons;
    fuelUsed.innerHTML = `Fuel used is <span>${Number.parseFloat(
      wholeFuel
    ).toFixed(2)} l</span>`;
    console.log(
      `[OUT] If my car consumes ${fuelCons}/100 km, total amount of consumed fuel is ${
        (numericDistance / 100) * fuelCons
      } l`
    );

    // i dont like this nested fetching
    // it would be better to set it outside of geocodeAddresses
    (function () {
      fetch("http://api.nbp.pl/api/exchangerates/rates/c/eur/today/")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          const currency = data.rates[0].ask;
          let wholeCost = (numericDistance / 100) * fuelCons * currency;

          travelCost.innerHTML = `Cost of whole travel is <span>${Number.parseFloat(
            wholeCost
          ).toFixed(2)}€</span>`;
        })
        .catch((error) => {
          console.error("There was a problem fetching the data:", error);
        });
    })();

    console.log(countryObj);

    finalWrapper.style.display = "block";

    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

    opacityAfterSubmit.classList.remove("visible");
    opacityAfterSubmit.style.height = "0";

    const end = Date.now();
    console.log(`[OUT] Execution time: ${(end - start) / 1000} s`);
  }

  // markers on map
  map.addListener("click", (event) => {
    if (markers.length === 2) {
      window.alert(`You already set origin and destination points!`);
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
    if (firstCoordContent === "" || secondCoordContent === "") {
      alert(`Origin and destination points are not set properly`);
      console.log(`coords are NOT fine`);
    }
    if (fuelConsumption === 0) {
      alert(`Fuel consumption is not set properly`);
      console.log(`consumption is NOT set`);
    }
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

      checkboxesArray.map((checkbox) => (checkbox.checked = false));

      opacityAfterSubmit.classList.add("visible");
      opacityAfterSubmit.style.height = "100vh";
      travelSubmit.disabled = `disabled`;
      resetButton.style.display = "block";
      const buttonsArray = [...buttons];
      buttonsArray.map((button) => (button.style.margin = "30px 10px 0"));

      geocodeAddresses(allPoints, geocoder, distanceBetween, fuelConsumption);
    }
    console.log(`form submited`);
  };

  travelForm.addEventListener("submit", function (e) {
    mainFunction(e);
  });

  resetButton.addEventListener("click", function () {
    // origin and destination markers out
    // fuel consumption set to 0 (is there way to set to 'unset'?)
    // precision set to default (2)
    // all results out
    // submit button enabled
    // reset button display: none;
    window.location.reload();
    // temporary solution ^
  });
}

(function () {
  let slider = document.getElementById("travel-precision");
  let output = document.getElementById("travel-precision-output");

  // default state
  output.innerHTML = `2 - medium precision`;

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
})();

// add cost of whole trip - done
// take care of front - make final look - done

// add information
// add fade-in effect in each line of result
// add rotating Earth while loading content + white opacity
// add RESET on submit button while submitted
// optimalize js
// optimalize scss
