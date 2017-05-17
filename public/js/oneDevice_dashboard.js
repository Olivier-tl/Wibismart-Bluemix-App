
var sockjs_url = '/sensortag';
var sockjs = new SockJS(sockjs_url);

var multiplexer = new WebSocketMultiplex(sockjs);

var air  = multiplexer.channel('air');
var accel  = multiplexer.channel('accel');

function connectOnClick() {
	var uuid = document.getElementById('uuid').value;
	var data = JSON.stringify({"deviceId": uuid});
	air.send(data);
	accel.send(data);
	//$('#uuid').hide();
	//$('#uuidConfirm').hide();
}

accel.onopen = function() {
  console.log("accel open");
};


air.onmessage = function(e) {
  var data = jQuery.parseJSON(e.data);
  sensorData.setReading("temperature", parseFloat(data.d.temperature));
  $("#temperaturevalue").html(data.d.temperature + " °Celsius");
  sensorData.setReading("pressure", parseFloat(data.d.pressure));
  $("#pressurevalue").html(data.d.pressure + " mb");
  sensorData.setReading("humidity", parseFloat(data.d.humidity));
  $("#humidityvalue").html(data.d.humidity + "%");
};

accel.onmessage = function(e) {
	var data = jQuery.parseJSON(e.data);
	var accelObj = {'x' : 0, 'y' : 0, 'z' : 0};
	accelObj.x = parseFloat(data.d.x);
	accelObj.y = parseFloat(data.d.y);
	accelObj.z = parseFloat(data.d.z);
	sensorData.setReading("accelerometer", accelObj);
}
function SensorData() {
	this.accelerometer = [];
	this.pressure =  0;
	this.humidity = 0;
	this.temperature = [];
}

SensorData.prototype.setReading = function(type, value) {
	//console.log("new value for " + type, value);

	switch (type) {
		case "temperature":
			var data = {
				//time: Math.round((new Date()).getTime() / 1000) * 1000,
				time: (new Date()).toTimeString().substring(3, 8), // this supress the hours
				value: value
			};
			this[type].push(data);
			updateTemperatureGaugeValue();
			renderLineChartTemperature();
			break;
		case "humidity":
			this[type] = value;
			updateHumidityGaugeValue();
			break;
		case "pressure":
			this[type] = value;
			updatepressureGaugeValue();
			break;
		case "accelerometer":
			var data = {
				//time: Math.round((new Date()).getTime() / 1000) * 1000,
				time: (new Date()).toTimeString().substring(3, 8), // this supress the hours
				value: value
			};
			this[type].push(data);
			renderLineChartAccelerometer();
			break;
		default:
			break;
	}
}
SensorData.prototype.getTempGraphData = function() {
	var availableData = sensorData.temperature.length;
	var values = [];

	for (var i = 0; i < availableData; i++) {
		values.push({
			x: sensorData.temperature[i].time,
			y: sensorData.temperature[i].value,
		});
	}

	if (availableData < 30) {
		for (var i = 0; i < 30 - availableData; i++) { 
			values.splice(0,0,{x: 0, y: 0}); 
		}
	}
	if (availableData > 30) {
		values.splice(0, availableData - 30);
	}

	// fill in x values
	for (var i = 0; i < values.length; i++) {
		if (values[i].x == 0) {
			values[i].x = (new Date()).toTimeString().substring(3, 8);//new Date((new Date()).getTime() - (values.length - i) * 1000);
		}
	}
	return values;
}

SensorData.prototype.getAccelGraphData = function() {
	var availableData = sensorData.accelerometer.length;
	console.log("Available data length : " + sensorData.accelerometer.length);
	console.log("First value: " + sensorData.accelerometer[0].value.x + ', ' + sensorData.accelerometer[0].value.y + ', ' + sensorData.accelerometer[0].value.z);

	var values = [];

	for (var i = 0; i < availableData; i++) {
		values.push({
			x: sensorData.accelerometer[i].value.x,
			y: sensorData.accelerometer[i].value.y,
			z: sensorData.accelerometer[i].value.z,
			time: sensorData.accelerometer[i].time,
		});
	}

	if (availableData < 30) {
		for (var i = 0; i < 30 - availableData; i++) { 
			values.splice(0,0,{x: 0, y: 0, z: 0, time: 0}); 
		}
	}
	if (availableData > 30) {
		values.splice(0, availableData - 30);
	}

	// fill in the time values
	for (var i = 0; i < values.length; i++) {
		if (values[i].time == 0) {
			values[i].time = (new Date()).toTimeString().substring(3, 8);//new Date((new Date()).getTime() - (values.length - i) * 1000);
		}
	}
	return values;
}

function getDataSet(key, data){
    var dataSet = [];
    for (var i = 0; i < data.length; i++) {
        dataSet.push(data[i][key]);
    }
	return dataSet;
}

var sensorData = new SensorData();

function onMessage(msg) {
	var topic = msg.destinationName;
	var tagData = JSON.parse(msg.payloadString);
	console.log("Are we even going here ? ");

	try {
		for (var count in tagData.d) {
			prop = tagData.d[count];
			var type = prop.p;
			var value = prop.v;
			
			// As you may notice, this switch case have no reason to exist.
			switch (type) {
				case "temperature":
				case "humidity":
				case "pressure":
					value = parseFloat(value);
					break;
				case "accelerometer":
					value = parseFloat(value);
				default:
				$("#"+type+"Payload").html(topic + "/" + type + " :: " + value);
				break;
			}
			//console.log(type, value);
			sensorData.setReading(type, value);
		}
	} catch (e) { console.error(e.stack, e.message); }
}

function updateTemperatureGaugeValue() {
	renderTemperatureGaugeColor(sensorData.temperature[sensorData.temperature.length - 1].value);
    TemperatureGauge.getInstance().set(sensorData.temperature[sensorData.temperature.length - 1].value);
}

function updateHumidityGaugeValue() {
	HumidityGauge.getInstance().set(sensorData.humidity);
}

function updatepressureGaugeValue() {
	PressureGauge.getInstance().set(sensorData.pressure);
}


function renderLineChartTemperature(){
	var temperatureData = sensorData.getTempGraphData();
	var temperatureValues = getDataSet("y", temperatureData);
	var maximum = Math.max.apply(Math, temperatureValues);
	var minimum = Math.min.apply(Math, temperatureValues);

	TemperatureChart.getInstance().data.datasets[0].data = temperatureValues;
	TemperatureChart.getInstance().data.labels = getDataSet("x", temperatureData);
	TemperatureChart.getInstance().options.scales.yAxes[0].ticks.min = minimum-5;
	TemperatureChart.getInstance().options.scales.yAxes[0].ticks.max = maximum+5;
	TemperatureChart.getInstance().update();
}

function renderLineChartAccelerometer() {
	var accelerometerData = sensorData.getAccelGraphData();
	console.log("accelerometerData : " + accelerometerData);
	AccelerometerChart.getInstance().data.datasets[0].data = getDataSet("x", accelerometerData);
	AccelerometerChart.getInstance().data.datasets[1].data = getDataSet("y", accelerometerData);
	AccelerometerChart.getInstance().data.datasets[2].data = getDataSet("z", accelerometerData);
	AccelerometerChart.getInstance().data.labels = getDataSet("time", accelerometerData);
	AccelerometerChart.getInstance().update();

}

$(document).ready(function(){
 
    
});



