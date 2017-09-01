/*
This script is used to make querries to a specific data base when the name of it is known to get all of its data.
*/
var sockjs_url = '/sensortag';
var sockjs = new SockJS(sockjs_url);

var multiplexer = new WebSocketMultiplex(sockjs);
var bulkDataChannel = multiplexer.channel('bulkData');

var dataBaseName;

var bulkData = null;

var timerProcess = null;
var spinner = null;

//this function is callsed when the used clicks on the query button to get all the data from a specified database.
function queryBulkData() {
    dataBaseName = document.getElementById('databaseName').value;
    if (databaseName != null && databaseName.value.length > 0) {
        console.log("Querying bulk...");
        $('#csvelem').slideUp();
        bulkDataChannel.send(JSON.stringify({"databaseName":dataBaseName}));
        spinner = document.createElement("i");
        spinner.setAttribute("class", "fa fa-spinner fa-pulse fa-3x fa-fw");
        document.getElementById('timer').appendChild(spinner);
        checkTimeout();
    }
}

bulkDataChannel.onopen = function() {
	console.log("Bulk Data channel open");
};

bulkDataChannel.onmessage = function(e) { //when we recieve bulk data from a database, we store that data and create buttons to select devices to look at dataof specific devices one at a time
    console.log("Response from server received!");
    var dataObj = JSON.parse(e.data);
    if (dataObj.message) {
		renderMessage(dataObj.message);
	}
	else if (dataObj.update && timerProcess) {
		if(dataObj.update != "done") {
			clearTimeout(timerProcess);
			checkTimeout();
		}
		else {
			
			clearTimeout(timerProcess);
			if(spinner != null) {
				spinner.parentNode.removeChild(spinner);
			}
		}
	}
    else {
        $('#deviceSelectionDropDown').show();
        eraseMinMax();
        document.getElementById("deviceToggleButton").innerHTML = "Device";
        bulkData = dataObj;
        document.getElementById('csv').value = "";
        $('#csvelem').slideDown();
        var deviceListDropDown = document.getElementById("DeviceListDropDown");
        while(deviceListDropDown.firstChild) {
            deviceListDropDown.removeChild(deviceListDropDown.firstChild);
        }
        for(i in bulkData) {
            var device = document.createElement("li");
            device.setAttribute("onclick", "deviceToggle('"+ i + "')");
            device.appendChild(document.createTextNode(i));
            deviceListDropDown.appendChild(device);
        }
        clearAllGraphs();
    }
}

function deviceToggle(deviceName) { //this is trigered once the user clicks on a device, it will get the appropriate data in the bulk data and display it.
    console.log("device toggle for device " + deviceName);
    document.getElementById("deviceToggleButton").innerHTML = deviceName;
    document.getElementById('csv').value = "";
    var thisDevice = bulkData[deviceName];
	renderCSV(thisDevice); //these two funtions are defined in the historicalDashboard.js file
    renderGraphs();
}

function clearAllGraphs() {
	temperatureGraph = new Dygraph(document.getElementById("temperatureGraph"), [0], {});
	pressureGraph = new Dygraph(document.getElementById("pressureGraph"), [0], {});
	humidityGraph = new Dygraph(document.getElementById("humidityGraph"), [0], {});
    UVGraph = new Dygraph(document.getElementById("UVGraph"), [0], {});
    soundGraph = new Dygraph(document.getElementById("soundGraph"), [0], {});
	batteryGraph = new Dygraph(document.getElementById("batteryGraph"), [0], {});
	lightLevelGraph = new Dygraph(document.getElementById("lightLevelGraph"), [0], {});
	CO2Graph = new Dygraph(document.getElementById("CO2Graph"), [0], {});
    SO2Graph = new Dygraph(document.getElementById("SO2Graph"), [0], {});
    COGraph = new Dygraph(document.getElementById("COGraph"), [0], {});
    O3raph = new Dygraph(document.getElementById("O3Graph"), [0], {});
    NO2Graph = new Dygraph(document.getElementById("NO2Graph"), [0], {});
    PMGraph = new Dygraph(document.getElementById("PMGraph"), [0], {});
	rssiGraph = new Dygraph(document.getElementById("rssiGraph"), [0], {});
	accelGraph = new Dygraph(document.getElementById("accelerometerGraph"), [0], {});
}

function eraseMinMax() {
    $("#temperature-high").html("");
	$("#temperature-low").html("");

    $("#pressure-high").html("");
	$("#pressure-low").html("");

    $("#humidity-high").html("");
	$("#humidity-low").html("");

    $("#UV-high").html("");
	$("#UV-low").html("");

    $("#sound-high").html("");
	$("#sound-low").html("");

    $("#battery-high").html("");
	$("#battery-low").html("");

    $("#light-high").html("");
	$("#light-low").html("");

    $("#CO2-high").html("");
	$("#CO2-low").html("");

    $("#SO2-high").html("");
	$("#SO2-low").html("");

    $("#CO-high").html("");
	$("#CO-low").html("");

    $("#O3-high").html("");
	$("#O3-low").html("");

    $("#NO2-high").html("");
	$("#NO2-low").html("");

    $("#PM-high").html("");
	$("#PM-low").html("");

    $("#rssi-high").html("");
	$("#rssi-low").html("");
}