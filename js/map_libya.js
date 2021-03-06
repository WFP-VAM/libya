var info = '<div id=\'map\'>'+
  '  </div>'+
  ''+
  '  <div class=\'map-overlay\' id=\'legend\'><strong>'+
  '      <legend>Food Insecure Population</legend>'+
  '    </strong></div>'+
  ''+
  '  <div class=\'map-overlay\' id=\'features\'> </div>'+
  ''+
  '  <div class=\'map-overlay\' id=\'selection\'>'+
  '    <strong>'+
  '      <legend>Displacement Status</legend>'+
  '    </strong>'+
  '    <form>'+
  '      <input type="radio" name="disp_status" value="All" autocomplete="off" checked> All population<br>'+
  '      <input type="radio" name="disp_status" autocomplete="off" value="IDP"> IDPs<br>'+
  '      <input type="radio" name="disp_status" autocomplete="off" value="Returnee"> Returnees<br>'+
  '      <input type="radio" name="disp_status" autocomplete="off" value="NonDisplaced"> Non-Displaced'+
  '    </form>'+
  '  </div>';

  document.write(info)

  mapboxgl.accessToken = 'pk.eyJ1IjoicGFzcXVpZXJqYiIsImEiOiJjaml1NjRkcmsxbnB2M3Btc3lzc2UwMmk4In0.WXzslqx4xB4fWBeBRU0AGw';

  if (!mapboxgl.supported()) {
    alert('Your browser does not support this Web Map - please try with a recent version of Firefox, Chrome or Safari');
  }

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/pasquierjb/cjl2dra7b8re72slkbn8qefmj',
    center: [18.661, 27.356],
    zoom: 5,
    maxZoom: 8,
    minZoom: 4
  });

  $.ajaxSetup({
    beforeSend: function(xhr) {
      if (xhr.overrideMimeType) {
        xhr.overrideMimeType("application/json");
      }
    }
  });

  var clicked = "All";
  var cached_json;
  var cached_pop_json;
  var Mantikas;
  $.getJSON(`https://rawcdn.githack.com/WFP-VAM/libya/master/data/MSNA_Mantikas_${clicked}.json`, function(data) {
    change_colors(data);
    cached_json = data;
    Mantikas = Object.keys(cached_json);
  });

  $.getJSON(`https://rawcdn.githack.com/WFP-VAM/libya/master/data/Population_Libya.json`, function(data) {
    cached_pop_json = data;
  });


  var layers = ['0-5%', '5-10%', '10-25%', '25-40%', '40-60%', '60-80%', '80-100%'];
  var colors = ['#FFEDA0', '#FED976', '#FEB24C', '#FD8D3C', '#FC4E2A', '#E31A1C', '#BD0026'];
  var thresholds = [0, 0.05, 0.10, 0.25, 0.40, 0.60, 0.80, 1]
  var expression = ['match', ['get', 'ADM2_Manti']];

  function change_colors(data) {
    var Mantikas = Object.keys(data);
    for (var i = 0; i < Mantikas.length; i++) {
      for (var j = 0; j < colors.length; j++) {
        if (data[Mantikas[i]]["Food_Insecure"] >= thresholds[j] && data[Mantikas[i]]["Food_Insecure"] < thresholds[j + 1]) {
          expression.push(Mantikas[i], colors[j])
        }
      }
    }
    expression.push('#D3D3D3'); // No data color
  }

  var circle_text_dict = {};
  var circle_radius_dict = {};

  function change_circles(json, pop_json) {
    var Mantikas = Object.keys(pop_json[clicked]);
    for (var i = 0; i < Mantikas.length; i++) {
      if (typeof json[Mantikas[i]] !== 'undefined') {
        var food_insecure_pop = json[Mantikas[i]]["Food_Insecure"] * pop_json[clicked][Mantikas[i]];
        var circle_radius = Math.sqrt(food_insecure_pop) / 5;
        var circle_text = numberWithCommas(food_insecure_pop.toFixed(0));
    }
    else{
      var circle_radius = 0;
      var circle_text = "";
    }
      circle_text_dict[Mantikas[i]] = circle_text;
      circle_radius_dict[Mantikas[i]] = circle_radius;
      }
  }

  map.on('load', function() {

    map.addSource("ocha_mantika_geojson", {
      "type": "vector",
      "url": "mapbox://pasquierjb.bvqfh4a4"
    });

    map.addLayer({
      "id": "ocha_mantika",
      "type": "fill",
      "source": "ocha_mantika_geojson",
      "source-layer": "Mantika_id",
      "paint": {
        'fill-color': '#EED322',
        'fill-opacity': 0.7
      }
    }, 'building');

    map.addLayer({
      "id": "ocha_mantika_borders",
      "type": "line",
      "source": "ocha_mantika_geojson",
      "source-layer": "Mantika_id",
      "paint": {
        "line-color": "#888",
        "line-width": ['case', ['boolean', ['feature-state', 'hover2'], false], 1.5, 1],
        "line-opacity": ['case', ['boolean', ['feature-state', 'hover2'], false], 1, 0.2]
      }
    }, 'waterway-label');

    map.setPaintProperty('ocha_mantika', 'fill-color', expression);

    map.addSource("point_geojson", {
      "type": "geojson",
      "data": 'https://rawcdn.githack.com/WFP-VAM/libya/master/data/Mantikas_centroid.json'
    });

    map.addLayer({
      'id': 'point_Mantikas',
      'type': 'circle',
      'source': "point_geojson",
      'paint': {
        'circle-color': '#303030',
        'circle-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0]
      }
    });


    map.addLayer({
      'id': 'symbol_Mantikas',
      'type': 'symbol',
      'source': "point_geojson",
      'layout': {
        'text-allow-overlap':true,
        'text-ignore-placement':true
      },
      'paint': {
        'text-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0]
      }
    });

    change_circles(cached_json, cached_pop_json);
    map.setPaintProperty('point_Mantikas', 'circle-radius', ["get", ["to-string", ["get", "ADM2_Manti"]], ["literal", circle_radius_dict]]);
    map.setLayoutProperty('symbol_Mantikas', 'text-field', ["get", ["to-string", ["get", "ADM2_Manti"]], ["literal", circle_text_dict]]);

  });

  for (i = 0; i < layers.length; i++) {
    var layer = layers[i];
    var color = colors[i];
    var item = document.createElement('div');
    var key = document.createElement('span');
    key.className = 'legend-key';
    key.style.backgroundColor = color;

    var value = document.createElement('span');
    value.innerHTML = layer;
    item.appendChild(key);
    item.appendChild(value);
    legend.appendChild(item);
  }

  var item = document.createElement('div');
  var key = document.createElement('span');
  key.className = 'legend-circle';
  key.style.backgroundColor = 'rgba(48, 48, 48, 0.4)';
  var value = document.createElement('span');
  value.innerHTML = "Individuals";
  item.appendChild(key);
  item.appendChild(value);
  legend.appendChild(item);


  window.onload = function() {
    var radios = document.forms[0].elements["disp_status"];
    for (var i = [0]; i < radios.length; i++)
      radios[i].onclick = radioClicked;
  }

  function radioClicked() {
    clicked = this.value;
    $.getJSON(`https://rawcdn.githack.com/WFP-VAM/libya/master/data/MSNA_Mantikas_${clicked}.json`, function(data) {
      expression = ['match', ['get', 'ADM2_Manti']];
      change_colors(data);
      map.setPaintProperty('ocha_mantika', 'fill-color', expression);
      cached_json = data;
      Mantikas = Object.keys(cached_json);
      for (var i = 0; i < Mantikas.length; i++) {
        var food_insecure_pop = cached_json[Mantikas[i]]["Food_Insecure"] * cached_pop_json[clicked][Mantikas[i]];
        change_circles(cached_json, cached_pop_json);
        map.setPaintProperty('point_Mantikas', 'circle-radius', ["get", ["to-string", ["get", "ADM2_Manti"]], ["literal", circle_radius_dict]]);
        map.setLayoutProperty('symbol_Mantikas', 'text-field', ["get", ["to-string", ["get", "ADM2_Manti"]], ["literal", circle_text_dict]]);
      };
    })
  }

  function getfoodsecinfo(data, pop_data, Mantika) {
    var region = Mantika;
    if (typeof data[region] !== 'undefined') {
      var HH_status = data[region]["displacement_status"];
      var HH_population = numberWithCommas(pop_data[clicked][region]);
      var food_insecure = (data[region]["Food_Insecure"] * 100).toFixed(0) + "%";
      var food_insecure_mar = (data[region]["Moderately_food_insecure"] * 100).toFixed(0) + "%";
      var food_insecure_sev = (data[region]["Severely_food_insecure"] * 100).toFixed(0) + "%";
      var borderline_fcs = (data[region]["FCG_Moderately_food_insecure"] * 100).toFixed(0) + "%";
      var poor_fcs = (data[region]["FCG_Severely_food_insecure"] * 100).toFixed(0) + "%";
      var bad_coping = ((data[region]["LCOP_Moderately_food_insecure"] + data[region]["LCOP_Severely_food_insecure"]) * 100).toFixed(0) + "%";
      var bad_share_foodexp = ((data[region]["SEF_Marginally_food_secure"] + data[region]["SEF_Moderately_food_insecure"]) * 100).toFixed(0) + "%";

      document.getElementById('features').innerHTML = '<h2><strong>' +
        region + ': ' + HH_status + '</h2></strong>' +
        '<br/>' +
        '<p><strong>' + HH_status + ' Population: ' + HH_population + ' people</strong></p>' +
        '<br/>' +
        '<p><strong>' + food_insecure + ' are Food Insecure</strong></p>' +
        '<br/>' +
        '<p>' + food_insecure_mar + ' are marginally Food Insecure</p>' +
        '<p>' + food_insecure_sev + ' are severly Food Insecure</p>' +
        '<br/>' +
        '<p>' + poor_fcs + ' have a poor Food Consumption</p>' +
        '<p>' + borderline_fcs + ' have a borderline Food Consumption</p>' +
        '<br/>' +
        '<p>' + bad_coping + ' use stress or emergency Coping Strategies</p>' +
        '<p>' + bad_share_foodexp + ' spend more than 65% of their Expenses on Food</p>';
    } else {
      document.getElementById('features').innerHTML = '<h2><strong>' + region + ': ' + 'No Food Security data </h2></strong>'
    }
  }

  var hoveredMantika = null;
  map.on("mousemove", "ocha_mantika", function(e) {
    if (e.features.length > 0) {
      if (hoveredMantika) {
        getfoodsecinfo(cached_json, cached_pop_json, hoveredMantika);
        map.setFeatureState({source: 'point_geojson', id: hoveredMantika_id}, {hover: false});
        map.setFeatureState({source: 'ocha_mantika_geojson', sourceLayer: "Mantika_id", id: hoveredMantika_id}, {hover2: false});
      }
      hoveredMantika_id = e.features[0]["id"];
      hoveredMantika = e.features[0]["properties"]["ADM2_Manti"];
      map.setFeatureState({source: 'point_geojson', id: hoveredMantika_id}, {hover: true});
      map.setFeatureState({source: 'ocha_mantika_geojson', sourceLayer: "Mantika_id", id: hoveredMantika_id}, {hover2: true});
    }
  });

  // When the mouse leaves the ocha_mantika layer
  map.on("mouseleave", "ocha_mantika", function() {
    if (hoveredMantika) {
      map.setFeatureState({source: 'point_geojson', id: hoveredMantika_id}, {hover: false});
      map.setFeatureState({source: 'ocha_mantika_geojson', sourceLayer: "Mantika_id", id: hoveredMantika_id}, {hover2: false});
      document.getElementById('features').innerHTML = ' <h2><strong>Hover your mouse over a Mantika to get the Food Security data</h2></strong>';
    }
    hoveredMantika = null;
  });

  const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
