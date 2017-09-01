/*
This script handles all stream of data comming from the server which is subscribed to mqtt topics that envioros are publishing
*/
var sockjs_url = '/sensortag';
var sockjs = new SockJS(sockjs_url);

var multiplexer = new WebSocketMultiplex(sockjs);

//Websocket variables
var air  = multiplexer.channel('air');
var accel  = multiplexer.channel('accel');
var light = multiplexer.channel('health');
var soundChannel = multiplexer.channel('sound');
var CO2Channel = multiplexer.channel('CO2');
var gasesChannel = multiplexer.channel('gases');
var battery = multiplexer.channel('battery');
var locationChannel = multiplexer.channel('location');
var getterChannel = multiplexer.channel('getterChannel');

var gatewayType = "BeagleBone";
var currentConnectedDevices = [];
var connectionSelected = null;

var connectionUpdateTimer = null;
var deviceNameSent = null;

$('#temperaturebox').hide();
$('#pressurebox').hide();
$('#humiditybox').hide();
$('#UVbox').hide();
$('#soundbox').hide();
$('#PMbox').hide();
$('#CO2box').hide();
$('#SO2box').hide();
$('#CObox').hide();
$('#O3box').hide();
$('#NO2box').hide();


//$('#accelGraph').fadeOut(1000);
//$('#tempGraph').fadeOut(1000);
document.getElementById('accelGraph').style.visibility = "hidden"
document.getElementById('tempGraph').style.visibility = "hidden";

function updateTimer() { //this timer is used to notify the user if the stream of data stops, we then assume that the device has disconnected.
	if(deviceNameSent) {
		connectionUpdateTimer = setTimeout(function() {
			$('#deviceStatus').html(deviceNameSent + " (Disconnected)");
		}, 6000);
	}
}

function sendCommand(channel, gatewayId,gatewayType, commandName, payloadJSONObj) { //this function sends a message to the server to relay to the gateway via mqtt
  var out = JSON.stringify({deviceId:gatewayId, deviceType: gatewayType, commandName:commandName, payload:JSON.stringify(payloadJSONObj) });
  console.log("sending " + out);
  channel.send(out);
}

//This OnClickListener comunicates with the gateway to get a list of all connected devices. 
document.getElementById('getterbox').addEventListener('click' , function() {
  console.log("get click");
  var gatewayUuid = document.getElementById('uuid').value;
  if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
      sendCommand(getterChannel, gatewayUuid, gatewayType, "getter", {data : {type:"connectedDevices"}} );
      connectionlist = document.getElementById('listconnecteddevices');
      while(connectionlist.firstChild) {
        connectionlist.removeChild(connectionlist.firstChild);
      }
  }

});

//callback function to the getter channel and handles messages with the list of connected devices or the info of a specific device
getterChannel.onmessage = function(e) {
  console.log("message recieved " + JSON.stringify(JSON.parse(e.data).d));
  var data = JSON.parse(e.data);
  switch(data.type) {
    case 'connectedDevices':
			var connectionlist = document.getElementById('listconnecteddevices');
      while(connectionlist.firstChild) {
        connectionlist.removeChild(connectionlist.firstChild);
      }
      currentConnectedDevices = data.d;
      for(i in currentConnectedDevices) {
        var tempLocalName = currentConnectedDevices[i].localName;
        var tempDeviceId = currentConnectedDevices[i].deviceId;
        var ul = document.getElementById('listconnecteddevices');
        var li = document.createElement('li');
        li.appendChild(document.createTextNode(tempLocalName + ":" + tempDeviceId));
        li.setAttribute("id", tempLocalName + ":" + tempDeviceId);
        li.setAttribute("class", "clickableListElement");
        li.addEventListener("click", function() {
          if(connectionSelected != null) {
            connectionSelected.setAttribute("style", "background-color: white");
          }
          connectionSelected = this;
          connectionSelected.setAttribute("style", "background-color: #f1f1f1");
        });
        ul.appendChild(li);
      }
      break;
    case 'deviceInfo':
      $('#temperaturebox').hide();
      $('#pressurebox').hide();
      $('#humiditybox').hide();
			$('#UVbox').hide();
			$('#soundbox').hide();
			$('#PMbox').hide();
      $('#CO2box').hide();
			$('#SO2box').hide();
			$('#CObox').hide();
			$('#O3box').hide();
			$('#NO2box').hide();
			$('#accelGraph').hide();
			$('#tempGraph').hide();
			document.getElementById('accelGraph').style.visibility = "hidden"
			document.getElementById('tempGraph').style.visibility = "hidden";
      info = data.d;
      if(info.status == "connected") {
        var data = JSON.stringify({"deviceId": info.deviceId});
        if(info.weatherSensorOn) {
          $('#temperaturebox').fadeIn(2000);
          $('#pressurebox').fadeIn(2000);
          $('#humiditybox').fadeIn(2000);
					$('#UVbox').fadeIn(2000);
					document.getElementById('tempGraph').style.visibility = "visible"
					$('#tempGraph').fadeIn(2000);
					sensorData.temperature = [];
					if(info.lastTemperatureData && info.lastPressureData && info.lastHumidityData) {
						sensorData.setReading("temperature", parseFloat(info.lastTemperatureData));
						$("#temperaturevalue").html(info.lastTemperatureData + " °C");
						sensorData.setReading("pressure", parseFloat(info.lastPressureData));
						$("#pressurevalue").html(info.lastPressureData + " mbar");
						sensorData.setReading("humidity", parseFloat(info.lastHumidityData));
						$("#humidityvalue").html(info.lastHumidityData + "%");
						sensorData.setReading("UV", parseInt(info.lastUVData));
						document.getElementById("UVvalue").innerHTML = info.lastUVData;
					}
        }
				soundChannel.send(data);
				if(info.micSensorOn) {
					$('#soundbox').fadeIn(2000);
					if(info.lastSoundData) {
						sensorData.setReading("sound", parseInt(info.lastSoundData));
  					$("#soundvalue").html(info.lastSoundData + " dB");
					}
				}
				air.send(data);
        if (info.CO2SensorOn) {
          $('#CO2box').fadeIn(2000);
					if(info.lastCO2Data) {
						sensorData.setReading("CO2", parseInt(info.lastCO2Data));
  					$("#CO2value").html(info.lastCO2Data + " ppm");
					}
        }
				CO2Channel.send(data);
				if (info.SO2SensorOn == 1) {
          $('#SO2box').fadeIn(2000);
					if(info.lastSO2Data) {
						sensorData.setReading("SO2", parseFloat(info.lastSO2Data));
  					$("#SO2value").html(info.lastSO2Data + " ppm");
					}
        }
				if (info.COSensorOn == 1) {
          $('#CObox').fadeIn(2000);
					if(info.lastCOData) {
						sensorData.setReading("CO", parseFloat(info.lastCOData));
  					$("#COvalue").html(info.lastCOData + " ppm");
					}
        }
				if (info.O3SensorOn == 1) {
          $('#O3box').fadeIn(2000);
					if(info.lastO3Data) {
						sensorData.setReading("O3", parseFloat(info.lastO3Data));
  					$("#O3value").html(info.lastO3Data + " ppm");
					}
        }
				if (info.NO2SensorOn == 1) {
          $('#NO2box').fadeIn(2000);
					if(info.lastNO2Data) {
						sensorData.setReading("NO2", parseFloat(info.lastNO2Data));
  					$("NO2value").html(info.lastNO2Data + " ppm");
					}
        }
				if (info.PMSensorOn == 1) {
          $('#PMbox').fadeIn(2000);
					if(info.lastPMData) {
						sensorData.setReading("PM", parseFloat(info.lastPMData));
  					$("#PMvalue").html(info.lastPMData + " ug/m3");
					}
        }
				gasesChannel.send(data);
				
        if (info.accelSensorOn) {
					document.getElementById('accelGraph').style.visibility = "visible"
					$('#accelGraph').fadeIn(2000);
					sensorData.accelerometer = [];
					if(info.lastAccelXData && info.lastAccelYData && info.lastAccelZData) {
						var accelObj = {'x' : 0, 'y' : 0, 'z' : 0};
						accelObj.x = parseFloat(info.lastAccelXData);
						accelObj.y = parseFloat(info.lastAccelYData);
						accelObj.z = parseFloat(info.lastAccelZData);
						sensorData.setReading("accelerometer", accelObj);
					}
        }
				accel.send(data);
				$("#light_indicator").html("");
				if(info.lastLightData) {
					$("#light_indicator").html(info.lastLightData + " mV");
				}
				light.send(data);
				$("#batteryvalue").html("");
				$("#live_autonomy").html("");
				if(info.lastBatteryData && info.lastBatteryLifeData) {
					$("#batteryvalue").html(info.lastBatteryData + "%");
					$("#live_autonomy").html(info.lastBatteryLifeData + " hours");
				}
        battery.send(data);
        locationChannel.send(data);
				updateTimer();
      }

  }
};

getterChannel.onopen = function() {
  console.log("Getter channel open");
};

function connectOnClick() { //this is called when we chick on the conect button after selecting a device out of theconnected device list.
	console.log("click");
  if(connectionSelected != null) {
    var id = connectionSelected.getAttribute("id");
    id = id.split(":");
    var gatewayUuid = document.getElementById('uuid').value;
    if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
			deviceNameSent = id[0];
      sendCommand(getterChannel, gatewayUuid, gatewayType, "getter", {data : {localName : id[0], deviceId: id[1], type:'deviceInfo'}} );
    }
  }
}


//all the .onmessage functioin are trigered when the server relays messages from mqtt through the websocket, they all contain the live data comming from the enviro that is selected.
CO2Channel.onmessage = function(e) {
  var data = jQuery.parseJSON(e.data);
  sensorData.setReading("CO2", parseFloat(data.d.CO2));
  $("#CO2value").html(data.d.CO2 + " ppm");
}

gasesChannel.onmessage = function(e) {
  var data = jQuery.parseJSON(e.data);
  sensorData.setReading("SO2", parseFloat(data.d.SO2));
  $("#SO2value").html(data.d.SO2 + " ppm");
	sensorData.setReading("CO", parseFloat(data.d.CO));
  $("#COvalue").html(data.d.CO + " ppm");
	sensorData.setReading("O3", parseFloat(data.d.O3));
  $("#O3value").html(data.d.O3 + " ppm");
	sensorData.setReading("NO2", parseFloat(data.d.NO2));
  $("#NO2value").html(data.d.NO2 + " ppm");
	sensorData.setReading("PM", parseFloat(data.d.PM));
  $("#PMvalue").html(data.d.PM + " ug/m3");
}


air.onmessage = function(e) {
  var data = JSON.parse(e.data);
  sensorData.setReading("temperature", parseFloat(data.d.temperature));
  $("#temperaturevalue").html(data.d.temperature + " °C");
  sensorData.setReading("pressure", parseFloat(data.d.pressure));
  $("#pressurevalue").html(data.d.pressure + " mbar");
  sensorData.setReading("humidity", parseFloat(data.d.humidity));
  $("#humidityvalue").html(data.d.humidity + "%");
	sensorData.setReading("UV", data.d.UV);
	document.getElementById("UVvalue").innerHTML = data.d.UV;
};

accel.onmessage = function(e) {
	var data = jQuery.parseJSON(e.data);
	var accelObj = {'x' : 0, 'y' : 0, 'z' : 0};
	accelObj.x = parseFloat(data.d.x);
	accelObj.y = parseFloat(data.d.y);
	accelObj.z = parseFloat(data.d.z);
	sensorData.setReading("accelerometer", accelObj);
}

light.onmessage = function (e) {
	var data = jQuery.parseJSON(e.data);
	$("#light_indicator").html(data.d.light + " mV");
}

soundChannel.onmessage = function (e) {
	var data = jQuery.parseJSON(e.data);
	$("#soundvalue").html(data.d.soundLevel + " dB");
}

battery.onmessage = function(e) {
	var data = jQuery.parseJSON(e.data);
	$("#batteryvalue").html(data.d.batteryLevel + "%");
	$("#live_autonomy").html(data.d.batteryLife + " hours");
}

locationChannel.onmessage = function(e) {
	var data = jQuery.parseJSON(e.data);
	$("#rssi").html(data.d.rssi + " dBm");
  $("#deviceStatus").html(data.localName + " (Connected)");
	if (connectionUpdateTimer) {
		clearTimeout(connectionUpdateTimer);
		updateTimer();
	}
}


//This is a helper object to display the live data.
function SensorData() {
	this.accelerometer = [];
	this.pressure =  0;
	this.humidity = 0;
	this.UV = 0;
	this.soundLevel = 0;
	this.temperature = [];
	this.PM = 0;
	this.CO2 = 0;
	this.SO2 = 0;
	this.CO = 0;
	this.O3 = 0;
	this.NO2 = 0;
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
		case "UV":
			this[type] = value;
			updateUVGaugeValue();
    case "CO2":
      this[type] = value;
      updateCO2GaugeValue();
			break;
		case "sound":
      this[type] = value;
      updateSoundGaugeValue();
			break;
		case "PM":
      this[type] = value;
      updatePMGaugeValue();
			break;
		case "SO2":
			this[type] = value;
			updateSO2GaugeValue();
			break;
		case "CO":
			this[type] = value;
			updateCOGaugeValue();
			break;
		case "O3":
			this[type] = value;
			updateO3GaugeValue();
			break;
		case "NO2":
			this[type] = value;
			updateNO2GaugeValue();
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
	//renderTemperatureGaugeColor(sensorData.temperature[sensorData.temperature.length - 1].value);
  TemperatureGauge.getInstance().set(sensorData.temperature[sensorData.temperature.length - 1].value);
}

function updateHumidityGaugeValue() {
	HumidityGauge.getInstance().set(sensorData.humidity);
}

function updatepressureGaugeValue() {
	PressureGauge.getInstance().set(sensorData.pressure);
}

function updatePMGaugeValue() {
	PMGauge.getInstance().set(sensorData.PM);
}

function updateSoundGaugeValue() {
	SoundGauge.getInstance().set(sensorData.sound);
}

function updateUVGaugeValue()
{
    UVGauge.getInstance().set(sensorData.UV);
		var label = document.getElementById('UVlabel');
		if(sensorData.UV < 3) {
        label.innerHTML = "LOW";
        label.style.color = "#8CD600";
    }
    else if(sensorData.UV < 6) {
        label.innerHTML = "MODERATE";
        label.style.color = "#F9E814";
    }
    else if(sensorData.UV < 8) {
        label.innerHTML = "HIGH";
        label.style.color = "#F77F00";
    }
    else if(sensorData.UV < 11) {
        label.innerHTML = "VERY HIGH";
        label.style.color = "#EF2B2D";
    }
    else {
        label.innerHTML = "EXTREME";
        label.style.color = "#9663C4";
    }
}

function updateCO2GaugeValue() {
  CO2Gauge.getInstance().set(sensorData.CO2);
}

function updateSO2GaugeValue() {
  SO2Gauge.getInstance().set(sensorData.SO2);
}

function updateCOGaugeValue() {
  COGauge.getInstance().set(sensorData.CO);
}

function updateO3GaugeValue() {
  O3Gauge.getInstance().set(sensorData.O3);
}

function updateNO2GaugeValue() {
  NO2Gauge.getInstance().set(sensorData.NO2);
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

function toggleGraph(name) {
	$('#'+name).slideToggle();
}

function closeGraph(name) {
	$('#'+name).fadeOut();
}

$(document).ready(function(){
 
    
});



