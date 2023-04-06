"strict mode";

const API_KEY = "AIzaSyBkBUwIJoiUNQQX49OUvFzGzf-fQl-dpcc";

// litres for 100 km;
const fuelConsumption = 5;

// average cost (in euro) for one litre of diesel fuel in Europe (3.04.2023)
const diesel = 1.4256;

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

    const uniquePlacesArray = [...new Set(newResults)];
    console.log(newResults);

    const countryObj = uniquePlacesArray.reduce((accumulator, value) => {
      return { ...accumulator, [value]: "" };
    }, {});

    const numericDistance = parseInt(distance.replace(/\D/g, ""));

    // adding distance (key) and its value (value) to every country in object
    for (let key in countryObj) {
      // how many copies of particular country occured
      let keyLength = newResults.filter((e) => e === key).length;
      console.log(keyLength);
      const countryDescription = {
        distance: (keyLength / newResults.length) * numericDistance,
        volume: +Number.parseFloat(
          (((keyLength / newResults.length) * numericDistance) / 100) *
            fuelConsumption
        ).toFixed(2),
        // ratio: 1,
      };
      countryObj[key] = countryDescription;
    }
    console.log(`The distance between two markers is: ${numericDistance} km`);
    console.log(
      `If my car consumes ${fuelConsumption}/100 km, total amount of consumed fuel is ${
        (numericDistance / 100) * fuelConsumption
      } l`
    );

    // function for adding currency (key) and type of currency (value) to every country in object
    const countriesInformation = function (country) {
      fetch(`https://restcountries.com/v3.1/name/${country}`)
        .then((response) => response.json())
        .then((data) => {
          const countryInfo = data[0];
          countryObj[country].currency = Object.keys(countryInfo.currencies)[0];
        });
    };

    // adding currency value to countryObj (key: currency)
    for (let prop in countryObj) {
      countriesInformation(prop);
    }
    console.log(countryObj);

    // adding ratio (local currency / PLN) to each country object
    const nbp = function (table) {
      fetch(`http://api.nbp.pl/api/exchangerates/tables/${table}/`)
        .then((response) => response.json())
        .then((data) => {
          const nbpRatio = data[0].rates;

          // Polish ratio = 1;
          const countriesArray = Object.keys(countryObj);
          if (countriesArray.includes("Poland")) {
            for (let country in countryObj) {
              if (countryObj[country].currency === "PLN")
                countryObj[country].ratio = 1;
            }
          }

          for (let abc in countryObj) {
            const currencyTarget = countryObj[abc].currency;
            let currencyRatio;
            // console.log(currencyDistance);

            for (let singleNbpRatio in nbpRatio) {
              const bid = nbpRatio[singleNbpRatio].bid;
              const mid = nbpRatio[singleNbpRatio].mid;

              if (nbpRatio[singleNbpRatio].code === currencyTarget) {
                typeof mid === "undefined"
                  ? (currencyRatio = +Number.parseFloat(bid).toFixed(2))
                  : (currencyRatio = +Number.parseFloat(mid).toFixed(2));

                countryObj[abc].ratio = currencyRatio;
              }
            }
          }
        });
    };

    nbp("A");
    nbp("B");
    nbp("C");
    console.log(countryObj);

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

          // points between two markers to countries + distances in each country
          geocodeAddresses(allPoints, geocoder, dist);
        }
      });
    }
  });
}

// async function getFuelCost(country) {
//   const response = await fetch(
//     `https://fuel-price.p.rapidapi.com/api/gasoline_price/${country}`
//   );
//   const data = await response.json();
//   return data.gasoline_price;
// }

// const country = "France";
// getFuelCost(country)
//   .then((cost) =>
//     console.log(`The average fuel cost in ${country} is ${cost} USD per liter.`)
//   )
//   .catch((error) => console.error(error));

// UfZPL0plJeQOL7WI3JZYdSjvWCk5twuD

// const apiKey = "UfZPL0plJeQOL7WI3JZYdSjvWCk5twuD";
// const country = "PL"; // ISO 3166-1 alpha-2 code for Poland
// const fuelPriceId = "1:2622f89a-6300-11ec-8d12-a0423f39b5a2";

// // fetch(`https://api.tomtom.com/fuel/1/fuelprices/${country}.json?key=${apiKey}`)
// fetch(`https://api.tomtom.com/fuel/1/fuelprices/PL.json?key=${apiKey}`)
//   .then((response) => response.json())
//   .then((data) => {
//     console.log(data);
//   })
//   .catch((error) => console.error(error));
