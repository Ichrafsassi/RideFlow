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
      style: "path",
      path: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
      color: "#45d0ff",
      size: 24,
      outline: {
        color: "#070b14",
        width: 1,
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
