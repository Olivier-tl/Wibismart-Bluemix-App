// //------------------------------------------------------------------------------
// // Copyright IBM Corp. 2014
// //
// // Licensed under the Apache License, Version 2.0 (the "License");
// // you may not use this file except in compliance with the License.
// // You may obtain a copy of the License at
// //
// //    http://www.apache.org/licenses/LICENSE-2.0
// //
// // Unless required by applicable law or agreed to in writing, software
// // distributed under the License is distributed on an "AS IS" BASIS,
// // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// // See the License for the specific language governing permissions and
// // limitations under the License.
// //------------------------------------------------------------------------------
// var sockjs_url = '/sensortag';
// var sockjs = new SockJS(sockjs_url);

// var multiplexer = new WebSocketMultiplex(sockjs);

// // var accel  = multiplexer.channel('accel');

// // accel.onopen = function() {
// //   console.log("accel open");
// // };
// // accel.onclose = function(e) {
// // 	console.log("accel closed");
// // }
// // accel.onmessage = function(e) {
// //   var data = jQuery.parseJSON(e.data);
// //   var value = data.d;
// //   value.x = parseFloat(value.accelX);
// //   value.y = parseFloat(value.accelY);
// //   value.z = parseFloat(value.accelZ);
// //   $("#accelerometerPayload").html("accel<br> {x: " + value.accelX + ", y: " + value.accelY + ", z: " + value.accelZ + "}");
// //   sensorData.setReading("accelerometer", value);
// // };

// var air  = multiplexer.channel('air');
// air.onopen = function() {
//   console.log("air open");
// };
// air.onmessage = function(e) {
//   var data = jQuery.parseJSON(e.data);
//   sensorData.setReading("barometer", parseFloat(data.d.pressure));
// //   $("#barometerPayload").html("air/barometer :: " + data.d.pressure);
// //   sensorData.setReading("humidity", parseFloat(data.d.humidity));
// //   $("#humidityPayload").html("air/humidity :: " + data.d.humidity);
//   sensorData.setReading("ambientTemp", parseFloat(data.d.temperature));
//   $("#ambientTemp").html("air/ambientTemp :: " + data.d.temperature);
//   sensorData.setReading("objectTemp", parseFloat(data.d.temperature));
//   $("#objectTemp").html("air/objectTemp :: " + data.d.temperature);
  
// };
// function connectOnClick() {
// 	var uuid = document.getElementById('uuid').value;
// 	var data = JSON.stringify({"deviceId": uuid});
// 	air.send(data);
// 	//accel.send(data);
// 	$('#uuid').hide();
// 	$('#uuidConfirm').hide();
// }

// function SensorData() {
// 	this.accelerometer = {
// 		x: null,
// 		y: null,
// 		z: null
// 	};
// 	this.humidity = null;
// 	this.objectTemp = [];
// 	this.ambientTemp = [];
// }
// SensorData.prototype.setReading = function(type, value) {
// 	console.log("new value for " + type, value);

// 	switch (type) {
// 		case "ambientTemp":
// 		case "objectTemp":
// 			var data = {
// 				time: (new Date()),//Math.round((new Date()).getTime() / 1000) * 1000,
// 				//time: (new Date()).toTimeString().substring(0, 8),
// 				value: value
// 			};
// 			console.log("data: " + JSON.stringify(data));
// 			this[type].push(data);
// 			updateTemperatureGraph();
// 			break;
// 		case "humidity":
// 			// this[type] = value;
// 			// updateHumidityValue();
// 			break;
// 		case "barometer":
// 			// this[type] = value;
// 			// updateBarometerValue();
// 			break;
// 		case "accelerometer":
// 			break;
// 		default:
// 			this[type] = value;
// 			break;
// 	}
// }
// SensorData.prototype.getTempGraphData = function() {
// 	var availableData = Math.min(sensorData.ambientTemp.length, sensorData.objectTemp.length);
// 	var values = [];

// 	for (var i = 0; i < availableData; i++) {
// 		values.push({
// 			x: sensorData.ambientTemp[i].time,
// 			//x: 0,
// 			y: sensorData.ambientTemp[i].value,
// 			z: sensorData.objectTemp[i].value
// 		});
// 	}

// 	if (availableData < 30) {
// 		for (var i = 0; i < 30 - availableData; i++) { 
// 			values.splice(0,0,{x: 0, y: 0, z: 0 }); 
// 		}
// 	}
// 	if (availableData > 30) {
// 		values.splice(0, availableData - 30);
// 	}

// 	// fill in x values
// 	for (var i = 0; i < values.length; i++) {
// 		if (values[i].x == 0) {
// 			values[i].x = new Date((new Date()).getTime() - (values.length - i) * 1000);
// 		}
// 	}

// 	return values;
// }

// var sensorData = new SensorData();

// function onMessage(msg) {
// 	var topic = msg.destinationName;
// 	var tagData = JSON.parse(msg.payloadString);

// 	try {
// 		for (var count in tagData.d) {
// 			prop = tagData.d[count];
// 			var type = prop.p;
// 			var value = prop.v;
// 			console.log(type);
// 			switch (type) {
// 				case "humidity":
// 				case "ambientTemp":
// 				case "objectTemp":
// 				case "barometer":
// 				value = parseFloat(value);
// 				default:
// 				$("#"+type+"Payload").html(topic + "/" + type + " :: " + value);
// 				break;
// 			}
// 			console.log(type, value);
// 			sensorData.setReading(type, value);
// 		}
// 	} catch (e) { console.error(e.stack, e.message); }
// }


// function updateTemperatureGraph() {

// 	var values = sensorData.getTempGraphData();

// 	var maxval = -10000000;
// 	for (var i in values) { 
// 		if (values[i].y > maxval) { maxval = values[i].y; } 
// 		if (values[i].z > maxval) { maxval = values[i].z; } 
// 	}
// 	maxval = Math.floor(maxval * 1.3);

// 	var margin = {
// 		top: 30, 
// 		right: 20, 
// 		bottom: 30, 
// 		left: 50
// 	};
// 	var width = 900 - margin.left - margin.right;
// 	var height = 400 - margin.top - margin.bottom;

// 	// Parse the date / time
// 	var parseDate = d3.time.format("%d-%b-%y").parse;

// 	// Set the ranges
// 	var x = d3.time.scale().range([0, width]);
// 	var y = d3.scale.linear().range([height, 0]);

// 	// Define the axes
// 	var xAxis = d3.svg.axis().scale(x)
// 		.orient("bottom").ticks(5);

// 	var yAxis = d3.svg.axis().scale(y)
// 		.orient("left").ticks(5);

// 	// Define the line
// 	var ambientline = d3.svg.line()
// 		.x(function(d) { return x(d.x); })
// 		.y(function(d) { return y(d.z); });
// 	var objectline = d3.svg.line()
// 		.x(function(d) { return x(d.x); })
// 		.y(function(d) { return y(d.y); });

// 	// Adds the svg canvas
// 	$("#temperatureGraph").html("");
// 	var svg = d3.select("#temperatureGraph")
// 		.append("svg")
// 			.attr("width", width + margin.left + margin.right)
// 			.attr("height", height + margin.top + margin.bottom)
// 		.append("g")
// 			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// 	// Scale the range of the data
// 	x.domain(d3.extent(values, function(d) { return d.x; }));
// 	y.domain([0, maxval]);

// 	// Add the paths.
// 	svg.append("path")
// 		.attr("class", "ambientline")
// 		.attr("d", ambientline(values));

// 	svg.append("path")
// 		.attr("class", "objectline")
// 		.attr("d", objectline(values));

// 	// Add the X Axis
// 	svg.append("g")
// 		.attr("class", "x axis")
// 		.attr("transform", "translate(0," + height + ")")
// 		.call(xAxis);

// 	// Add the Y Axis
// 	svg.append("g")
// 		.attr("class", "y axis")
// 		.call(yAxis);

// 	// svg.append("svg:rect")
// 	// 		.attr("x", 3*width/4 - 20)
// 	// 		.attr("y", 0)
// 	// 		.attr("stroke", "darkblue")
// 	// 		.attr("height", 2)
// 	// 		.attr("width", 40);

// 	// svg.append("svg:text")
// 	// 		.attr("x", 30 + 3*width/4)
// 	// 		.attr("y", 5)
// 	// 		.text("Object Temp (\u00B0C)");

// 	svg.append("svg:rect")
// 			.attr("x", 3*width/4 - 20)
// 			.attr("y", 30)
// 			.attr("stroke", "maroon")
// 			.attr("height", 2)
// 			.attr("width", 40);

// 	svg.append("svg:text")
// 			.attr("x", 30 + 3*width/4)
// 			.attr("y", 35)
// 			.text("Ambient Temp (\u00B0C)");
// } 


// updateTemperatureGraph();

// function updateHumidityValue() {
// 	// var humidity = sensorData.humidity;
// 	// $("#humidityValue").html(humidity);
// }
// function updateBarometerValue() {
// 	// var barometer = sensorData.barometer;
// 	// $("#barometerValue").html(barometer);
// }