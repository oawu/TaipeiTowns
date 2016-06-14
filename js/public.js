/**
 * @author      OA Wu <comdan66@gmail.com>
 * @copyright   Copyright (c) 2015 OA Wu Design
 */

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-46121102-26', 'auto');
ga('send', 'pageview');

$(function () {
  var $map = $('#map');
  var $mapMenu = $('#map_menu');
  var $markerMenu = $('#marker_menu');
  var $polylineMenu = $('#polyline_menu');
  var $export = $('#export');
  var $select = $('#select');
  var $loading = $('#loading');

  var _map = null;
  var _markers = [];
  var _polyline = null;
  var _polygons = [];

  var _city = [
    {city: '台北市', color: 'rgba(0, 0, 255, 1)', towns: ['中山區', '中正區', '信義區', '內湖區', '北投區', '南港區', '士林區', '大同區', '大安區', '文山區', '松山區', '萬華區']},
    {city: '新北市', color: 'rgba(0, 86, 0, 1)', towns: ['三峽區', '三芝區', '三重區', '中和區', '五股區', '八里區', '土城區', '坪林區', '平溪區', '新店區', '新莊區', '板橋區', '林口區', '樹林區', '永和區', '汐止區', '泰山區', '淡水區', '深坑區', '烏來區', '瑞芳區', '石碇區', '石門區', '萬里區', '蘆洲區', '貢寮區', '金山區', '雙溪區', '鶯歌區']},
  ];
 
  function formatDate (d) {
    return  (d.getFullYear () + '_' + (d.getMonth () + 1) + '_' + d.getDate ()) + '_' + (d.getHours () + '_' + d.getMinutes () + '_' + d.getSeconds ());
  }

  var getPixelPosition = function () {
    var scale = Math.pow (2, this.map.getZoom ());
    var nw = new google.maps.LatLng (
        this.map.getBounds ().getNorthEast ().lat (),
        this.map.getBounds ().getSouthWest ().lng ()
    );
    var worldCoordinateNW = this.map.getProjection ().fromLatLngToPoint (nw);
    var worldCoordinate = this.map.getProjection ().fromLatLngToPoint (this.getPosition ());
    
    return new google.maps.Point (
        (worldCoordinate.x - worldCoordinateNW.x) * scale,
        (worldCoordinate.y - worldCoordinateNW.y) * scale
    );
  };
  function formatFloat (num, pos) {
    var size = Math.pow (10, pos);
    return Math.round (num * size) / size;
  }
  function fromLatLngToPoint (latLng, map) {
    var scale = Math.pow (2, map.getZoom ());
    var topRight = map.getProjection ().fromLatLngToPoint (map.getBounds ().getNorthEast ());
    var bottomLeft = map.getProjection ().fromLatLngToPoint (map.getBounds ().getSouthWest ());
    var worldPoint = map.getProjection ().fromLatLngToPoint (latLng);
    return new google.maps.Point ((worldPoint.x - bottomLeft.x) * scale, (worldPoint.y - topRight.y) * scale);
  }
  function setPolyline () {
    if (_markers.length > 2) {
      if (!_polyline)
        _polyline = new google.maps.Polygon({
          map: _map,
          strokeColor: 'rgba(252, 30, 112, 1)',
          strokeOpacity: 0,
          strokeWeight: 0,
          fillColor: 'rgba(252, 30, 112, 1)',
          fillOpacity: 0.55,
          draggable: false,
          geodesic: false
        });

      _polyline.setPath (_markers.map (function (t) { return t.position; }));
    }

    for (var i = 0; i < _markers.length; i++) {
      if (!_markers[i].polyline) {
        var polyline = new google.maps.Polyline ({
          map: _map,
          strokeColor: 'rgba(120, 0, 0, 1)',
          strokeWeight: 3,
          drawPath: function () {
            var prevPosition = this.prevMarker.getPosition ();
            var nextPosition = this.nextMarker.getPosition ();
            this.setPath ([prevPosition, nextPosition]);
            if (!this.prevMarker.map) this.prevMarker.setMap (_map);
            if (!this.nextMarker.map) this.nextMarker.setMap (_map);
            if (!this.map) this.setMap (_map);
          }
        });

        google.maps.event.addListener (polyline, 'rightclick', function (e) {
          var point = fromLatLngToPoint (e.latLng, _map);
          $polylineMenu.css ({ top: point.y, left: point.x })
                       .data ('lat', e.latLng.lat ())
                       .data ('lng', e.latLng.lng ())
                       .addClass ('show').polyline = polyline;
        });
        _markers[i].polyline = polyline;
      }
      
      _markers[i].polyline.prevMarker = _markers[i - 1] ? _markers[i - 1] : _markers[_markers.length - 1];
      _markers[i].polyline.nextMarker = _markers[i];
      _markers[i].polyline.drawPath ();
    }

    if (_markers.length)
      $export.show ();
    else
      $export.hide ();
  }
  function circlePath (r) {
    return 'M 0 0 m -' + r + ', 0 '+
           'a ' + r + ',' + r + ' 0 1,0 ' + (r * 2) + ',0 ' +
           'a ' + r + ',' + r + ' 0 1,0 -' + (r * 2) + ',0';
  }
  function initMarker (position, index) {
    var marker = new google.maps.Marker ({
        map: _map,
        draggable: true,
        position: position,
        icon: {
            path: circlePath (5),
            strokeColor: 'rgba(120, 0, 0, .75)',
            strokeWeight: 1,
            fillColor: 'rgba(255, 0, 0, .75)',
            fillOpacity: 1
          },
        getPixelPosition: getPixelPosition
      });

    google.maps.event.addListener (marker, 'drag', setPolyline);

    google.maps.event.addListener (marker, 'rightclick', function (e) {
      var pixel = marker.getPixelPosition ();
      $markerMenu.css ({ top: pixel.y, left: pixel.x }).addClass ('show').marker = marker;
    });
    _markers.splice (index ? index : _markers.length, 0, marker);
    
    setPolyline ();
  }
  function loadEditTown (k, t) {
    $.getJSON ('towns/' + k + '/' + t + '.json', function (result) {
      var bounds = new google.maps.LatLngBounds ();
      result.forEach (function (t, i) {
        var latLng = new google.maps.LatLng (t[0], t[1]);
        bounds.extend (latLng);
        initMarker (latLng, i);
      });
      _map.fitBounds (bounds);
    });
  }
  function loadTown (k, t, b, c) {
    $.getJSON ('towns/' + k + '/' + t + '.json', function (result) {
      var latLngs = result.map (function (t) {
        return new google.maps.LatLng (t[0], t[1]);
      });
      var polygon = new google.maps.Polygon ({
                      path: latLngs,
                      map: _map,
                      fillColor: c,
                      fillOpacity: 0.35,
                      strokeColor: c,
                      strokeWeight: 0.65,
                    });
      polygon.city = k;
      polygon.town = t;

      polygon.addListener ('click', function (e) {
        $select.val (this.city + '-' + this.town).change ();
      });

      _polygons.push (polygon);

      if (_polygons.length == _city.length)
        $select.change ();
    });
  }
  function closeLoading () {
    $loading.addClass ('hide').fadeOut (function () {
      $(this).hide (function () {
        $loading.remove ();
      });
    });
  }
  function initialize () {
    _map = new google.maps.Map ($map.get (0), {
        zoom: 11,
        zoomControl: true,
        scrollwheel: true,
        scaleControl: true,
        mapTypeControl: false,
        navigationControl: true,
        streetViewControl: false,
        disableDoubleClickZoom: true,
        center: new google.maps.LatLng (25.054, 121.54),
      });

    google.maps.event.addListener (_map, 'rightclick', function (e) {
      $mapMenu.css ({ top: e.pixel.y, left: e.pixel.x })
              .data ('lat', e.latLng.lat ())
              .data ('lng', e.latLng.lng ()).addClass ('show');
    });

    google.maps.event.addListener (_map, 'mousemove', function () {
      $mapMenu.css ({ top: -100, left: -100 }).removeClass ('show');
      $markerMenu.css ({ top: -100, left: -100 }).removeClass ('show');
      $polylineMenu.css ({ top: -100, left: -100 }).removeClass ('show');
    });

    $mapMenu.find ('.add_marker').click (function () {
      initMarker (new google.maps.LatLng ($mapMenu.data ('lat'), $mapMenu.data ('lng')), 0);
      $mapMenu.css ({ top: -100, left: -100 }).removeClass ('show');
    });

    $mapMenu.find ('.add_info').click (function () {
      initInfo (new google.maps.LatLng ($mapMenu.data ('lat'), $mapMenu.data ('lng')));
      $mapMenu.css ({ top: -100, left: -100 }).removeClass ('show');
    });

    $markerMenu.find ('.del').click (function () {
      _markers.splice (_markers.indexOf ($markerMenu.marker), 1);
      $markerMenu.marker.setMap (null);
      if ($markerMenu.marker.polyline) $markerMenu.marker.polyline.setMap (null);
      setPolyline ();
      $markerMenu.css ({ top: -100, left: -100 }).removeClass ('show');
    });

    $polylineMenu.find ('.add').click (function () {
      if ($polylineMenu.polyline)
        initMarker (new google.maps.LatLng ($polylineMenu.data ('lat'), $polylineMenu.data ('lng')), _markers.indexOf ($polylineMenu.polyline.nextMarker));
      $polylineMenu.css ({ top: -100, left: -100 }).removeClass ('show');
    });

    $export.hide ().click (function () {
      saveAs (new Blob (['[\n' + _markers.map (function (marker) {
        return '  [' + marker.position.lat () + ', ' + marker.position.lng () + ']';
      }).join (',  \n') + '\n]'], {type: "text/plain;charset=utf-8"}), $select.val () + ".json");
    });

    $select.append (_city.map (function (t) {
      return $('<optgroup />').attr ('label', t.city).append (t.towns.map (function (u) {
        return $('<option />').val (t.city + '-' + u).text (u);
      }));
    }));

    $select.change (function () {
      var key = $(this).val ();

      _markers.forEach (function (t) {
        t.setMap (null);
        t.polyline.setMap (null);
      });
      _markers = [];

      _polygons.forEach (function (t) { if (!t.map) t.setMap (_map); });
      _polygons.forEach (function (t) { if (t.city + '-' + t.town == key) t.setMap (null); });
      _polygons.forEach (function (t) { if (t.city + '-' + t.town == key) loadEditTown (t.city, t.town); });
    });

    _city.forEach (function (t) {
      t.towns.forEach (function (u) {
        loadTown (t.city, u, 1, t.color);
      });
    });

    closeLoading ();
  }

  google.maps.event.addDomListener (window, 'load', initialize);
});