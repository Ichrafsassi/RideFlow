/*global RideFlow _config*/

var RideFlow = window.RideFlow || {};
RideFlow.map = RideFlow.map || {};

(function esriMapScopeWrapper($) {
  require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/geometry/Point",
    "esri/symbols/TextSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/geometry/support/webMercatorUtils",
    "dojo/domReady!",
  ], function requireCallback(
    Map,
    MapView,
    Graphic,
    Point,
    TextSymbol,
    SimpleMarkerSymbol,
    webMercatorUtils,
  ) {
    var wrMap = RideFlow.map;

    var map = new Map({ basemap: "dark-gray" });

    var view = new MapView({
      center: [-122.31, 47.6],
      container: "map",
      map: map,
      zoom: 12,
      ui: {
        components: ["attribution"] // Simplify UI for cleaner look
      }
    });

    var pinSymbol = new TextSymbol({
      color: "#ffb020",
      text: "\ue61d",
      font: {
        size: 26,
        family: "CalciteWebCoreIcons",
      },
    });

    var rideSymbol = new SimpleMarkerSymbol({
      style: "circle",
      color: "#45d0ff",
      size: 14,
      outline: {
        color: "#070b14",
        width: 2,
      },
    });

    var pinGraphic;
    var rideGraphic;

    function updateCenter(newValue) {
      wrMap.center = {
        latitude: newValue.latitude,
        longitude: newValue.longitude,
      };
    }

    function updateExtent(newValue) {
      var min = webMercatorUtils.xyToLngLat(newValue.xmin, newValue.ymin);
      var max = webMercatorUtils.xyToLngLat(newValue.xmax, newValue.ymax);
      wrMap.extent = {
        minLng: min[0],
        minLat: min[1],
        maxLng: max[0],
        maxLat: max[1],
      };
    }

    view.watch("extent", updateExtent);
    view.watch("center", updateCenter);
    view.then(function onViewLoad() {
      updateExtent(view.extent);
      updateCenter(view.center);
    });

    view.on("click", function handleViewClick(event) {
      wrMap.selectedPoint = event.mapPoint;
      view.graphics.remove(pinGraphic);
      pinGraphic = new Graphic({
        symbol: pinSymbol,
        geometry: wrMap.selectedPoint,
      });
      view.graphics.add(pinGraphic);
      $(wrMap).trigger("pickupChange");
    });

    wrMap.animate = function animate(origin, dest, callback) {
      var startTime;
      var step = function animateFrame(timestamp) {
        var progress;
        var progressPct;
        var point;
        var deltaLat;
        var deltaLon;
        if (!startTime) startTime = timestamp;
        progress = timestamp - startTime;
        progressPct = Math.min(progress / 2000, 1);
        deltaLat = (dest.latitude - origin.latitude) * progressPct;
        deltaLon = (dest.longitude - origin.longitude) * progressPct;
        point = new Point({
          longitude: origin.longitude + deltaLon,
          latitude: origin.latitude + deltaLat,
        });
        view.graphics.remove(rideGraphic);
        rideGraphic = new Graphic({
          geometry: point,
          symbol: rideSymbol,
        });
        view.graphics.add(rideGraphic);
        if (progressPct < 1) {
          requestAnimationFrame(step);
        } else {
          callback();
        }
      };
      requestAnimationFrame(step);
    };

    wrMap.unsetLocation = function unsetLocation() {
      view.graphics.remove(pinGraphic);
    };
  });
})(jQuery);
