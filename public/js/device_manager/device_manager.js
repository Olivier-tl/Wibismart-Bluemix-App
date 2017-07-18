
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
}

hideAllSettings();

document.getElementById('scanbox').addEventListener('click', function() {
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

document.getElementById('getterbox').addEventListener('click' , function() {
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

scanChannel.onmessage = function(e) {
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
  for(i in currentDiscoveredDevices) {
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
    if (!alreadyHere) {
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

function connectOnClick() {
  console.log("connect click");
  if(scanSelected != null) {
    var id = scanSelected.getAttribute("id");
    id = id.split(":");
    var gatewayUuid = document.getElementById('uuid').value;
    if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
      sendCommand(connectionChannel, gatewayUuid, gatewayType, "connectTo", {data : {localName : id[0], deviceId: id[1]}} );
      scanSelected.parentNode.removeChild(scanSelected);
      scanSelected = null;
    }
  }
}

function disconnectOnClick() {
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

function getSettings() {
  if(connectionSelected != null) {
    var id = connectionSelected.getAttribute("id");
    id = id.split(":");
    var gatewayUuid = document.getElementById('uuid').value;
    if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
      sendCommand(getterChannel, gatewayUuid, gatewayType, "getter", {data : {localName : id[0], deviceId: id[1], type:'deviceInfo'}} );
    }
  }
}

function weatherSubmitClick() {
  var gatewayUuid = document.getElementById('uuid').value;
  if(gatewayUuid != null && gatewayUuid != undefined && gatewayUuid.length > 0) {
    if(selectedDeviceInfo != null && selectedDeviceInfo.status == "connected") {
      if(document.getElementById("checkbox-weather").checked != selectedDeviceInfo.weatherSensorOn) {
        if(selectedDeviceInfo.weatherSensorOn == true) {
          sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "weatherOnChar", value: "off"}} );
        }
        else if(selectedDeviceInfo.weatherSensorOn == false) {
          sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "weatherOnChar", value: "on"}} );
        }
      }
      if (parseFloat(document.getElementById("weather-range-slider").value) != selectedDeviceInfo.weatherperiod) {
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
    if(selectedDeviceInfo != null && selectedDeviceInfo.status == "connected") {
      if(document.getElementById("checkbox-CO2").checked != selectedDeviceInfo.CO2SensorOn) {
        if(selectedDeviceInfo.CO2SensorOn == true) {
          sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "CO2OnChar", value: "off"}} );
        }
        else if(selectedDeviceInfo.CO2SensorOn == false) {
          sendCommand(sensorToggleChannel, gatewayUuid, gatewayType, "sensorToggle", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "CO2OnChar", value: "on"}} );
        }
      }
      if (parseFloat(document.getElementById("CO2-range-slider").value) != selectedDeviceInfo.CO2period) {
        sendCommand(sensorPeriodChannel, gatewayUuid, gatewayType, "sensorPeriod", {data : {localName : selectedDeviceInfo.localName, deviceId: selectedDeviceInfo.deviceId, sensor: "CO2PeriodChar", value: document.getElementById("CO2-range-slider").value}} );
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

disconnectionChannel.onmessage = function(e) {
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

sensorToggleChannel.onmessage = function(e) {
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

sensorPeriodChannel.onmessage = function(e) {
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
        checkboxAccel.checked = false;
        checkboxweather.checked = false;
        checkboxlight.checked = false;
        checkboxCO2.checked = false;
        var accelRangeSlider = document.getElementById('accelerometer-range-slider');
        var weatherRangeSlider = document.getElementById('weather-range-slider');
        var lightRangeSlider = document.getElementById('light-range-slider');
        var CO2RangeSlider = document.getElementById('CO2-range-slider');
        accelRangeSlider.value = "";
        weatherRangeSlider.value = "";
        lightRangeSlider.value = "";
        CO2RangeSlider.value = "";
        hideAllSettings();
        
      }
      else {
        var header = document.getElementById("devicename");
        header.innerText = info.localName + " (Connected)";
        var checkboxAccel = document.getElementById('checkbox-accelerometer');
        var checkboxweather = document.getElementById('checkbox-weather');
        var checkboxlight = document.getElementById('checkbox-light');
        var checkboxCO2 = document.getElementById('checkbox-CO2');
        checkboxAccel.checked = info.accelSensorOn;
        checkboxweather.checked = info.weatherSensorOn;
        checkboxlight.checked = info.lightSensorOn;
        checkboxCO2.checked = info.CO2SensorOn;
        var accelRangeSlider = document.getElementById('accelerometer-range-slider');
        var weatherRangeSlider = document.getElementById('weather-range-slider');
        var lightRangeSlider = document.getElementById('light-range-slider');
        var CO2RangeSlider = document.getElementById('CO2-range-slider');
        accelRangeSlider.value = info.accelperiod;
        weatherRangeSlider.value = info.weatherperiod;
        lightRangeSlider.value = info.lightperiod;
        CO2RangeSlider.value = info.CO2period;
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
          $("#CO2settings").slideUp();
        }
        else if (info.CO2SensorOn == null) {
          $("#CO2settings").slideUp();
        }
        
      }

  }
};

function renderMessage(e) {
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
