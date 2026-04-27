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
    var vehicle;
    var pronoun;
    console.log("Response received from API: ", result);
    
    // Support both 'Unicorn' (legacy) and 'Vehicle' (new) keys
    vehicle = result.Vehicle || result.Unicorn;
    
    if (!vehicle) {
        console.error("No vehicle data found in API response");
        displayUpdate("Error: No driver assigned. Please try again.");
        return;
    }

    pronoun = vehicle.Gender === "Male" ? "his" : "her";
    displayUpdate(
      vehicle.Name +
        ", your " +
        vehicle.Color +
        " RideFlow driver, is on " +
        pronoun +
        " way.",
    );
    animateArrival(function animateCallback() {
      displayUpdate(vehicle.Name + " has arrived. Your ride is ready.");
      RideFlow.map.unsetLocation();
      $("#request").prop("disabled", "disabled");
      $("#request").text("Set Pickup");
    });
  }

  // Register click handler for #request button
  $(function onDocReady() {
    $("#request").click(handleRequestClick);
    $("#signOut").click(handleSignOut);
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

  function handleSignOut(event) {
    event.preventDefault();
    if (confirm('Are you sure you want to sign out?')) {
      RideFlow.signOut();
    }
  }

  function handlePickupChanged() {
    var requestButton = $("#request");
    requestButton.text("Request Ride");
    requestButton.prop("disabled", false);
  }

  function handleRequestClick(event) {
    var pickupLocation = RideFlow.map.selectedPoint;
    event.preventDefault();
    
    if (!pickupLocation) {
        alert("Please click the map to set your pickup location first!");
        return;
    }
    
    $("#request").text("Requesting...").prop("disabled", true);
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
