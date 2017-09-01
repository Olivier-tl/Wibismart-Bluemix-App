/*
The device manager's purpose is to comunicate with a gateway that is connected to the IBM Watson IoT platform
there are multiple websockets each with its own purpose to send specific commands to the gateway.
With the device manager interface, you can scan for devices, connect/disconnect to/from a specifc device, turn on and off sensor and finally you can change the period of sensors.
*/
var sockjs_url = '/sensortag';
var sockjs = new SockJS(sockjs_url);

var multiplexer = new WebSocketMultiplex(sockjs);
//all these channels are used to comunicate with the gateway. they require a specific payload that will be compatible with the back end.
var scanChannel = multiplexer.channel('scanCommand');//commands the gateway to scan. payload: {}
var connectionChannel = multiplexer.channel('connectionCommand');//commands the gateway to connect to a device payload: {data : {localName : "Enviro A43", deviceId: "112233445566"}}
var disconnectionChannel = multiplexer.channel('disconnectionCommand'); //commands the gateway to disconnect to a device. payload: {data : {localName : "Enviro A43", deviceId: "112233445566"}}
var sensorToggleChannel = multiplexer.channel('sensorToggleCommand');//commands the gateway to turn one of the sensors of a connected device on or off. payload: {data : {localName : "Enviro A43", deviceId: "112233445566", sensor: "lightOnChar", value: "off"}}
var sensorPeriodChannel = multiplexer.channel('sensorPeriodCommand');//commands the gateway to change the period of a sensor of a connected device. payload: {data : {localName : "Enviro A43", deviceId: "112233445566", sensor: "weatherPeriodChar", value: "10"}}
var getterChannel = multiplexer.channel('getterChannel');//gets information from the gateway. payload; {{data : {localName : "Enviro A43", deviceId: "112233445566", type: "connectedDevices"}}}
var gatewayId = "506583dd5c62";
var gatewayId2 = "506583dd346a";
var gatewayType = "BeagleBone";

var currentDiscoveredDevices = [];
var currentConnectedDevices = [];

var waitingScan = false;
var scanSelected = null;
var scanTimeout = null;

var connectionSelected = null;
var selectedDeviceInfo = null;

function hideAllSettings() {
  $("#accelsettings").slideUp();
  $("#weathersettings").slideUp();
  $("#lightsettings").slideUp();
  $("#CO2settings").slideUp();
  $("#gasessettings").slideUp();
}

hideAllSettings();

document.getElementById('scanbox').addEventListener('click', function() { //this is the OnClickListener for the scan button
  console.log("scan click");
  if(!waitingScan) {
    var gatewayUuid = document.getElementById('uuid').value;
    if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
      sendCommand(scanChannel, gatewayUuid, gatewayType, "scan", {} );
      waitingScan = true;
      currentDiscoveredDevices = [];
      var scanlist = document.getElementById('listdevicesfound');
      while(scanlist.firstChild) {
        scanlist.removeChild(scanlist.firstChild);
      }
      var loading = document.createElement('i');
      loading.setAttribute("class", "fa fa-spinner fa-pulse fa-3x fa-fw");
      this.appendChild(loading);
      scanTimeout = setTimeout(function() {
        if (document.getElementById('scanbox').lastChild == loading) {
          document.getElementById('scanbox').removeChild(loading);
        }
        waitingScan = false;
        var ul = document.getElementById('messages');
        var li = document.createElement('li');
        li.appendChild(document.createTextNode("The scan request timed out. Make sure the gateway UUID is correct, and ensure that it is connected."));
        ul.appendChild(li);
        setTimeout(function() {
          li.parentNode.removeChild(li);
        }, 5000);
      }, 13000);
    }
  }

});

document.getElementById('getterbox').addEventListener('click' , function() { //this is the OnClickListener for to get the connected devices to the gateway
  console.log("get click");
  var gatewayUuid = document.getElementById('uuid').value;
  if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
      sendCommand(getterChannel, gatewayUuid, gatewayType, "getter", {data : {type:"connectedDevices"}} );
      var connectionlist = document.getElementById('listconnecteddevices');
      while(connectionlist.firstChild) {
        connectionlist.removeChild(connectionlist.firstChild);
      }
  }
  document.getElementById("devicename").innerText = "";
  connectionSelected = null;
  hideAllSettings();

});

scanChannel.onopen = function() {
  console.log("Scan channel open");
};

scanChannel.onmessage = function(e) { //this callback handles the list of discovered devices and displays them.
  waitingScan = false;
  if (scanTimeout) {
    clearTimeout(scanTimeout);
  }
  var scanlist = document.getElementById('listdevicesfound');
  console.log("message recieved " + JSON.stringify(JSON.parse(e.data).d));
  if(document.getElementById("scanbox").lastElementChild.getAttribute("class") == "fa fa-spinner fa-pulse fa-3x fa-fw") {
    document.getElementById("scanbox").removeChild(document.getElementById("scanbox").lastElementChild);
  }
  currentDiscoveredDevices = JSON.parse(e.data).d;
  for(i in currentDiscoveredDevices) { //we check if the device we recieved is already in our list
    var tempLocalName = currentDiscoveredDevices[i].localName;
    var tempDeviceId = currentDiscoveredDevices[i].deviceId;
    var ul = document.getElementById('listdevicesfound');
    var items = ul.getElementsByTagName("li");
    var alreadyHere = false;
    if(ul.firstChild) {
      for(i in items) {
        if (typeof i != "number" && i == tempLocalName + ":" + tempDeviceId) {
          alreadyHere = true;
        }
      }
    }
    if (!alreadyHere) { // if we dont already have this device in our list, we create an element with a lostener to be able to select it.
      var li = document.createElement('li');
      li.appendChild(document.createTextNode(tempLocalName + ":" + tempDeviceId));
      li.setAttribute("id", tempLocalName + ":" + tempDeviceId);
      li.setAttribute("class", "clickableListElement");
      li.addEventListener("click", function() {
        if(scanSelected != null) {
          scanSelected.setAttribute("style", "background-color: white");
        }
        scanSelected = this;
        scanSelected.setAttribute("style", "background-color: #f1f1f1");
      });
      ul.appendChild(li);
    }
  }
};

function connectOnClick() { //this function is called when we click on the connect button to connect to a specific device we have selected in the list of discovered devices
  console.log("connect click");
  if(scanSelected != null) {
    var id = scanSelected.getAttribute("id");
    id = id.split(":");
    var gatewayUuid = document.getElementById('uuid').value;
    if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
      sendCommand(connectionChannel, gatewayUuid, gatewayType, "connectTo", {data : {localName : id[0], deviceId: id[1]}} );
      scanSelected.parentNode.removeChild(scanSelected); // we remove the element from the discovered list once we send the connection command
      scanSelected = null;
    }
  }
}

function disconnectOnClick() { // this function is called when we disconnect a selected device in the connected device list
  console.log("disconnect click");
  if(connectionSelected != null) {
    var id = connectionSelected.getAttribute("id");
    id = id.split(":");
    var gatewayUuid = document.getElementById('uuid').value;
    if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
      sendCommand(disconnectionChannel, gatewayUuid, gatewayType, "disconnectTo", {data : {localName : id[0], deviceId: id[1]}} );
    }
  }
}

function getSettings() { // this is called to get information about a specific device such as which sensors are curretly on and what each of their peroid is 
  if(connectionSelected != null) {
    var id = connectionSelected.getAttribute("id");
    id = id.split(":");
    var gatewayUuid = document.getElementById('uuid').value;
    if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
      sendCommand(getterChannel, gatewayUuid, gatewayType, "getter", {data : {localName : id[0], deviceId: id[1], type:'deviceInfo'}} );
    }
  }
}

//all the submit functions below are to potentially send a new setting configuration to the gateway about a specific sensor for an enviro. such as turn the sensor on/off or change its period
function weatherSubmitClick() {
  var gatewayUuid = document.getElementById('uuid').value;
  if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
    if(selectedDeviceInfo != null && selectedDeviceInfo.status == "connected") {
      if(document.getElementById("checkbox-weather").checked != selectedDeviceInfo.weatherSensorOn) { //we check if the settings have been changed compared to current ones
        if(selectedDeviceInfo.weatherSensorOn == true) {
          sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "weatherOnChar", value: "off"}} );
        }
        else if(selectedDeviceInfo.weatherSensorOn == false) {
          sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "weatherOnChar", value: "on"}} );
        }
      }
      if (parseFloat(document.getElementById("weather-range-slider").value) != selectedDeviceInfo.weatherperiod) { // if the period also changed compared to the current period we can change it
        sendCommand(sensorPeriodChannel, gatewayUuid, gatewayType, "sensorPeriod", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "weatherPeriodChar", value: document.getElementById("weather-range-slider").value}} );
      }
    }
  }
}

function accelSubmitClick() {
  var gatewayUuid = document.getElementById('uuid').value;
  if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
    if(selectedDeviceInfo != null && selectedDeviceInfo.status == "connected") {
      if(document.getElementById("checkbox-accelerometer").checked != selectedDeviceInfo.accelSensorOn) {
        if(selectedDeviceInfo.accelSensorOn == true) {
          sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "accelOnChar", value: "off"}} );
        }
        else if(selectedDeviceInfo.accelSensorOn == false) {
          sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "accelOnChar", value: "on"}} );
        }
      }
      if (parseFloat(document.getElementById("accelerometer-range-slider").value) != selectedDeviceInfo.accelperiod) {
        sendCommand(sensorPeriodChannel, gatewayUuid, gatewayType, "sensorPeriod", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "accelPeriodChar", value: document.getElementById("accelerometer-range-slider").value}} );
      }
    }
  }
}

function lightSubmitClick() {
  var gatewayUuid = document.getElementById('uuid').value;
  if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
    if(selectedDeviceInfo != null && selectedDeviceInfo.status == "connected") {
      if(document.getElementById("checkbox-light").checked != selectedDeviceInfo.lightSensorOn) {
        if(selectedDeviceInfo.lightSensorOn == true) {
          sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "lightOnChar", value: "off"}} );
        }
        else if(selectedDeviceInfo.lightSensorOn == false) {
          sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "lightOnChar", value: "on"}} );
        }
      }
      if (parseFloat(document.getElementById("light-range-slider").value) != selectedDeviceInfo.lightperiod) {
        sendCommand(sensorPeriodChannel, gatewayUuid, gatewayType, "sensorPeriod", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "lightPeriodChar", value: document.getElementById("light-range-slider").value}} );
      }
    }
  }
}

function CO2SubmitClick() {
  var gatewayUuid = document.getElementById('uuid').value;
  if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
    var altitude = document.getElementById("altitude-range-slider").value;
    if(selectedDeviceInfo != null && selectedDeviceInfo.status == "connected" && selectedDeviceInfo.CO2calib != true) {
      if(document.getElementById("checkbox-CO2").checked != selectedDeviceInfo.CO2SensorOn || selectedDeviceInfo.altitude==null || selectedDeviceInfo.altitude != altitude) {
        if(altitude >0 || altitude <= 0) {
            if(document.getElementById("checkbox-CO2").checked == true) {
              if (altitude >0 || altitude <= 0) {
                sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "CO2OnChar", value: "on", altitude: altitude}} );
              }
              
            }
            else if(document.getElementById("checkbox-CO2").checked == false) {
              sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "CO2OnChar", value: "off", altitude: altitude}} );
            }
        }
        else {
            renderMessage({data:JSON.stringify({message:"Your altitude is not valid..."})});
          }
      }
      if (parseFloat(document.getElementById("CO2-range-slider").value) != selectedDeviceInfo.CO2period) {
        sendCommand(sensorPeriodChannel, gatewayUuid, gatewayType, "sensorPeriod", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "CO2PeriodChar", value: document.getElementById("CO2-range-slider").value}} );
      }
    }
  }
}

function CO2Calibrate() { //this function is special, it is used for callibrating the CO2 sensor, the gateway knows how to handle this event by looking at the "value" attribute of the payload
  var gatewayUuid = document.getElementById('uuid').value;
  if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
    if(!selectedDeviceInfo.CO2Calibrating) {
      sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "CO2OnChar", value: "CO2Calib"}} );
    }
    else if (selectedDeviceInfo.CO2Calibrating==true) {
      renderMessage({data:JSON.stringify({message:"Your sensor is already calibrating..."})});
    }
 }
  
}

function gasesSubmitClick() {
  var gatewayUuid = document.getElementById('uuid').value;
  if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
    if(selectedDeviceInfo != null && selectedDeviceInfo.status == "connected") {
        var checkboxSO2 = document.getElementById('checkbox-SO2');
        var checkboxCO = document.getElementById('checkbox-CO');
        var checkboxO3 = document.getElementById('checkbox-O3');
        var checkboxNO2 = document.getElementById('checkbox-NO2');
        var checkboxPM = document.getElementById('checkbox-PM');
      if(checkboxSO2.checked != selectedDeviceInfo.SO2SensorOn || checkboxCO.checked != selectedDeviceInfo.COSensorOn || checkboxO3.checked != selectedDeviceInfo.O3SensorOn || checkboxNO2.checked != selectedDeviceInfo.NO2SensorOn) {
        sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "gasesOnChar", value: [checkboxPM.checked , checkboxSO2.checked, checkboxCO.checked, checkboxO3.checked, checkboxNO2.checked]}} );
      }
      if (parseFloat(document.getElementById("gases-range-slider").value) != selectedDeviceInfo.gasesperiod) {
        sendCommand(sensorPeriodChannel, gatewayUuid, gatewayType, "sensorPeriod", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "gasesPeriodChar", value: document.getElementById("gases-range-slider").value}} );
      }
    }
  }
}

connectionChannel.onopen = function() {
  console.log("Connection channel open");
};

connectionChannel.onmessage = function(e) {
  renderMessage(e);
};

disconnectionChannel.onopen = function() {
  console.log("Disconnection channel open");
};

disconnectionChannel.onmessage = function(e) { //This event trigers when there is a disconnection confirmation message
  renderMessage(e);
  var message = JSON.parse(e.data).message;
  if (message.indexOf("successful") > 0) {
    hideAllSettings();
    if(connectionSelected != null) {
      var header = document.getElementById("devicename");
      var id = connectionSelected.getAttribute("id");
      id = id.split(':');
      header.innerText = id[0] + " (Disconnected)";
      connectionSelected.parentNode.removeChild(connectionSelected);
    }
  }
};

sensorToggleChannel.onopen = function() {
  console.log("Sensor toggle channel open");
};

sensorToggleChannel.onmessage = function(e) { // every time we recieve a confirmation message on this cahannel, we ask again for the device info to get it updated
  console.log("message recieved " + JSON.parse(e.data).message);
  renderMessage(e);
  var gatewayUuid = document.getElementById('uuid').value;
  if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0 && selectedDeviceInfo != null) {
    sendCommand(getterChannel, gatewayUuid, gatewayType, "getter", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, type:'deviceInfo'}} );
  }
};

sensorPeriodChannel.onopen = function() {
  console.log("Sensor period channel open");
};

sensorPeriodChannel.onmessage = function(e) {// every time we recieve a confirmation message on this cahannel, we ask again for the device info to get it updated
  console.log("message recieved " + JSON.parse(e.data).message);
  renderMessage(e);
  var gatewayUuid = document.getElementById('uuid').value;
  if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0 && selectedDeviceInfo != null) {
    sendCommand(getterChannel, gatewayUuid, gatewayType, "getter", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, type:'deviceInfo'}} );
  }
};

getterChannel.onopen = function() {
  console.log("Getter channel open");
};

getterChannel.onmessage = function(e) { //This event trigers when we recieve the list of connected device of the information about one of the connected devices
  console.log("message recieved " + JSON.stringify(JSON.parse(e.data).d));
  var data = JSON.parse(e.data);
  switch(data.type) {
    case 'connectedDevices': // if we recieve connected devices we empty the current list and refull it with the new list
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
    case 'deviceInfo': // if we recieve information about a device, it means tht tit has been selected therefore we fill all the setting feilds to the ones we just recieved
      var info = data.d;
      selectedDeviceInfo = info;
      if(info.status == 'disconnected') {
        var header = document.getElementById("devicename");
        header.innerText = info.localName + " (Disconnected)";
        if (connectionSelected != null) {
          connectionSelected.parentNode.removeChild(connectionSelected);
          connectionSelected = null;
        }
        var checkboxAccel = document.getElementById('checkbox-accelerometer');
        var checkboxweather = document.getElementById('checkbox-weather');
        var checkboxlight = document.getElementById('checkbox-light');
        var checkboxCO2 = document.getElementById('checkbox-CO2');
        var checkboxSO2 = document.getElementById('checkbox-SO2');
        var checkboxCO = document.getElementById('checkbox-CO');
        var checkboxO3 = document.getElementById('checkbox-O3');
        var checkboxNO2 = document.getElementById('checkbox-NO2');
        var checkboxPM = document.getElementById('checkbox-PM');
        checkboxAccel.checked = false;
        checkboxweather.checked = false;
        checkboxlight.checked = false;
        checkboxCO2.checked = false;
        checkboxSO2.checked = false;
        checkboxCO.checked = false;
        checkboxO3.checked = false;
        checkboxNO2.checked = false;
        checkboxPM.checked = false;
        var accelRangeSlider = document.getElementById('accelerometer-range-slider');
        var weatherRangeSlider = document.getElementById('weather-range-slider');
        var lightRangeSlider = document.getElementById('light-range-slider');
        var CO2RangeSlider = document.getElementById('CO2-range-slider');
        var gasesRangeSlider = document.getElementById('gases-range-slider');
        accelRangeSlider.value = "";
        weatherRangeSlider.value = "";
        lightRangeSlider.value = "";
        CO2RangeSlider.value = "";
        gasesRangeSlider.value = "";
        hideAllSettings();
        
      }
      else {
        var header = document.getElementById("devicename");
        header.innerText = info.localName + " (Connected)";
        var checkboxAccel = document.getElementById('checkbox-accelerometer');
        var checkboxweather = document.getElementById('checkbox-weather');
        var checkboxlight = document.getElementById('checkbox-light');
        var checkboxCO2 = document.getElementById('checkbox-CO2');
        var checkboxSO2 = document.getElementById('checkbox-SO2');
        var checkboxCO = document.getElementById('checkbox-CO');
        var checkboxO3 = document.getElementById('checkbox-O3');
        var checkboxNO2 = document.getElementById('checkbox-NO2');
        var checkboxPM = document.getElementById('checkbox-PM');
        checkboxAccel.checked = info.accelSensorOn;
        checkboxweather.checked = info.weatherSensorOn;
        checkboxlight.checked = info.lightSensorOn;
        checkboxCO2.checked = info.CO2SensorOn;
        checkboxSO2.checked = info.SO2SensorOn;
        checkboxCO.checked = info.COSensorOn;
        checkboxO3.checked = info.O3SensorOn;
        checkboxNO2.checked = info.NO2SensorOn;
        checkboxPM.checked = info.PMSensorOn;
        var accelRangeSlider = document.getElementById('accelerometer-range-slider');
        var weatherRangeSlider = document.getElementById('weather-range-slider');
        var lightRangeSlider = document.getElementById('light-range-slider');
        var CO2RangeSlider = document.getElementById('CO2-range-slider');
        var gasesRangeSlider = document.getElementById('gases-range-slider');
        accelRangeSlider.value = info.accelperiod;
        weatherRangeSlider.value = info.weatherperiod;
        lightRangeSlider.value = info.lightperiod;
        CO2RangeSlider.value = info.CO2period;
        gasesRangeSlider.value = info.gasesperiod;
        if (info.accelSensorOn != null) {
          $("#accelsettings").slideDown();
        }
        else if (info.accelSensorOn == null) {
          $("#accelsettings").slideUp();
        }

        if (info.weatherSensorOn != null) {
          $("#weathersettings").slideDown();
        }
        else if (info.weatherSensorOn == null) {
          $("#weathersettings").slideUp();
        }

        if (info.lightSensorOn != null) {
          $("#lightsettings").slideDown();
        }
        else if (info.lightSensorOn == null) {
          $("#lightsettings").slideUp();
        }

        if (info.CO2SensorOn != null) {
          $("#CO2settings").slideDown();
        }
        else if (info.CO2SensorOn == null) {
          $("#CO2settings").slideUp();
        }
        if (info.SO2SensorOn != null) {
          $("#gasessettings").slideDown();
        }
        else if (info.SO2SensorOn == null) {
          $("#gasessettings").slideUp();
        }
        
      }

  }
};

function renderMessage(e) { //this function attaches a message at the top of the page that will stay there for 5 seconds
  var message = JSON.parse(e.data).message;
  var ul = document.getElementById('messages');
  var li = document.createElement('li');
  li.appendChild(document.createTextNode(message));
  ul.appendChild(li);
  setTimeout(function() {
    li.parentNode.removeChild(li);
  }, 5000);
}



function sendCommand(channel, gatewayId,gatewayType, commandName, payloadJSONObj) { //this function sends a message to the server to relay to the gateway via mqtt
  var out = JSON.stringify({deviceId:gatewayId, deviceType: gatewayType, commandName:commandName, payload:JSON.stringify(payloadJSONObj) });
  console.log("sending " + out);
  channel.send(out);
}



$(document).ready(function(){
    //console.log(document.getElementById("b0:b4:48:e4:95:83"));

    $('.side-label').removeClass("active");
    $('#devicemanager').addClass( "active" );



});
