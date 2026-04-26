/*global RideFlow _config*/

var RideFlow = window.RideFlow || {};
RideFlow.map = RideFlow.map || {};

(function rideScopeWrapper($) {
  var authToken;
  RideFlow.authToken
    .then(function setAuthToken(token) {
      if (token) {
        authToken = token;
      } else {
        window.location.href = "/signin.html";
      }
    })
    .catch(function handleTokenError(error) {
      alert(error);
      window.location.href = "/signin.html";
    });
  function requestRide(pickupLocation) {
    $.ajax({
      method: "POST",
      url: _config.api.invokeUrl + "/ride",
      headers: {
        Authorization: authToken,
      },
      data: JSON.stringify({
        PickupLocation: {
          Latitude: pickupLocation.latitude,
          Longitude: pickupLocation.longitude,
        },
      }),
      contentType: "application/json",
      success: completeRequest,
      error: function ajaxError(jqXHR, textStatus, errorThrown) {
        console.error(
          "Error requesting ride: ",
          textStatus,
          ", Details: ",
          errorThrown,
        );
        console.error("Response: ", jqXHR.responseText);
        alert(
          "An error occured when requesting your ride:\n" + jqXHR.responseText,
        );
      },
    });
  }

  function completeRequest(result) {
    var driver;
    var pronoun;
    console.log("Response received from API: ", result);
    driver = result.Unicorn;
    pronoun = driver.Gender === "Male" ? "his" : "her";
    displayUpdate(
      driver.Name +
        ", your " +
        driver.Color +
        " RideFlow driver, is on " +
        pronoun +
        " way.",
    );
    animateArrival(function animateCallback() {
      displayUpdate(driver.Name + " has arrived. Your ride is ready.");
      RideFlow.map.unsetLocation();
      $("#request").prop("disabled", "disabled");
      $("#request").text("Set Pickup");
    });
  }

  // Register click handler for #request button
  $(function onDocReady() {
    $("#request").click(handleRequestClick);
    $(RideFlow.map).on("pickupChange", handlePickupChanged);

    RideFlow.authToken.then(function updateAuthMessage(token) {
      if (token) {
        displayUpdate(
          'You are authenticated. Click to see your <a href="#authTokenModal" data-toggle="modal">auth token</a>.',
        );
        $(".authToken").text(token);
      }
    });

    if (!_config.api.invokeUrl) {
      $("#noApiMessage").show();
    }
  });

  function handlePickupChanged() {
    var requestButton = $("#request");
    requestButton.text("Request Ride");
    requestButton.prop("disabled", false);
  }

  function handleRequestClick(event) {
    var pickupLocation = RideFlow.map.selectedPoint;
    event.preventDefault();
    requestRide(pickupLocation);
  }

  function animateArrival(callback) {
    var dest = RideFlow.map.selectedPoint;
    var origin = {};

    if (dest.latitude > RideFlow.map.center.latitude) {
      origin.latitude = RideFlow.map.extent.minLat;
    } else {
      origin.latitude = RideFlow.map.extent.maxLat;
    }

    if (dest.longitude > RideFlow.map.center.longitude) {
      origin.longitude = RideFlow.map.extent.minLng;
    } else {
      origin.longitude = RideFlow.map.extent.maxLng;
    }

    RideFlow.map.animate(origin, dest, callback);
  }

  function displayUpdate(text) {
    $("#updates").append($("<li>" + text + "</li>"));
  }
})(jQuery);
