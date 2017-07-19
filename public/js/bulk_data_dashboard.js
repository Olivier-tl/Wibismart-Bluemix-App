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

bulkDataChannel.onmessage = function(e) {
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
    }
}

function deviceToggle(deviceName) {
    document.getElementById("deviceToggleButton").innerHTML = deviceName;
    document.getElementById('csv').value = "";
    var thisDevice = bulkData[deviceName];
	renderCSV(thisDevice);
    renderGraphs();
}

function eraseMinMax() {
    $("#temperature-high").html("");
	$("#temperature-low").html("");

    $("#pressure-high").html("");
	$("#pressure-low").html("");

    $("#humidity-high").html("");
	$("#humidity-low").html("");

    $("#battery-high").html("");
	$("#battery-low").html("");

    $("#light-high").html("");
	$("#light-low").html("");

    $("CO2-high").html("");
	$("CO2-low").html("");

    $("#rssi-high").html("");
	$("#rssi-low").html("");
}