/*
This scrip is handles all the data requests and processig relayed to the server. The server is the place the actual querries to the daya bases are made
We then display the data using Dygraphs (http://dygraphs.com/)
*/
var sockjs_url = '/sensortag';
var sockjs = new SockJS(sockjs_url);

var multiplexer = new WebSocketMultiplex(sockjs);
var dataBaseChannel = multiplexer.channel('dataBase');


//the each entry of the data arrays have a small aray with the timestamp of the datapont always at index 0
var lightData = [];
var batteryData = [];
var accelData = [];
var temperatureData = [];
var pressureData = [];
var humidityData = [];
var UVData = [];
var soundData = [];
var CO2Data = [];
var SO2Data = [];
var COData = [];
var O3Data = [];
var NO2Data = [];
var PMData = [];
var rssiData = [];

//these arrays store a csv formatted string. they are already sorted in the server.
var lightCSV = "";
var batteryCSV = "";
var temperatureCSV = "";
var pressureCSV = "";
var humidityCSV = "";
var UVCSV = "";
var soundCSV = "";
var CO2CSV = "";
var SO2CSV = "";
var COCSV = "";
var O3CSV = "";
var NO2CSV = "";
var PMCSV = "";
var rssiCSV = "";
var accelCSV = "";

var uuid;
var startDate;
var endDate;
var startDatePicker = datepicker("#startdate");
var endDatePicker = datepicker("#enddate");

var timerProcess = null;
var spinner = null;


$('#csvelem').hide();

/*  this function is called when the user clicks on the search button.
	it will take all data from all the databases that are within the time frame.
	the data will then be pushed in the arrays above. to then be displayed on the html page.
*/
function searchOnClick() {
	uuid = document.getElementById('uuid').value;
    startDate = startDatePicker.dateSelected.toJSON().split('T')[0];
    endDate = endDatePicker.dateSelected.toJSON().split('T')[0];
	if(uuid && uuid.length > 0 && endDate && startDate) {
		console.log("Searching for data...");
		$('#csvelem').slideUp();
		uuid.replace(/\s/g, " ");
		uuid = uuid.split(",");
		var requestObj = {};
		requestObj.uuid = uuid;
		requestObj.startDate = startDate;
		requestObj.endDate = endDate;
		var request = JSON.stringify(requestObj);
		dataBaseChannel.send(request);
		spinner = document.createElement("i");
		spinner.setAttribute("class", "fa fa-spinner fa-pulse fa-3x fa-fw");
		document.getElementById('timer').appendChild(spinner);
		checkTimeout();
	}
}

function checkTimeout() { // this is used to see if the server has timed out or not since the server is supposed to send updates every 2 seconds
	timerProcess = setTimeout(function() {
		if(spinner != null) {
			spinner.parentNode.removeChild(spinner);
			renderMessage("The server may have timed out. Refresh the page and try again.");
		}
	}, 3000);
}


dataBaseChannel.onopen = function() {
	console.log("Database channel open");
};

dataBaseChannel.onmessage = function(e) { //this event is triggered when we recieve a message from the server. It could be either in fors of arrays (used to display the min and max values) or in for of csv string to plot the graphs
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
	else if (dataObj.lightData.length == 0 
	&& dataObj.batteryData.length == 0 
	&& dataObj.temperatureData.length == 0 
	&& dataObj.pressureData.length == 0 
	&& dataObj.humidityData.length == 0 
	&& dataObj.UVData.length == 0
	&& dataObj.soundData.length == 0
	&& dataObj.CO2Data.length == 0 
	&& dataObj.rssiData.length == 0
	&& dataObj.accelData.length == 0
	&& dataObj.SO2Data.length == 0
	&& dataObj.COData.length == 0
	&& dataObj.O3Data.length == 0
	&& dataObj.NO2Data.length == 0
	&& dataObj.PMData.length == 0
	&& dataObj.csv) {
		renderMessage("The server has responded but the data you are looking for does not exist. Ckeck if your device ID is correct.")
	}
	else if(!dataObj.csv) {
		lightData = dataObj.lightData;
		batteryData = dataObj.batteryData;
		temperatureData = dataObj.temperatureData;
		pressureData = dataObj.pressureData;
		humidityData = dataObj.humidityData;
		UVData = dataObj.UVData;
		soundData = dataObj.soundData;
		CO2Data = dataObj.CO2Data;
		SO2Data = dataObj.SO2Data;
		COData = dataObj.COData;
		O3Data = dataObj.O3Data;
		NO2Data = dataObj.NO2Data;
		PMData = dataObj.PMData;
		accelData = dataObj.accelData;
		rssiData = dataObj.rssiData;

		setMinMax();
	}
	else if (dataObj.csv) {
		renderCSV(dataObj);
		$('#deviceSelectionDropDown').hide();
		renderGraphs();
	}

};

function MinMax(elmt, unit) {// returns an array [[min], [max]]
	if (elmt.length == 0) {
		return [];
	}
	var min = [];
	var max = [];
	var first = elmt[0];
	for(var i = 1; i < first.length; i++) {
		min.push(first[i]);
		max.push(first[i]);
	}
	for( var i = 1; i < elmt.length; i++ ){
		var temp = elmt[i];
		for(var j = 1 ; j < temp.length ; j++) {
			if(temp[j] != null && (max[j-1] < temp[j] || max[j-1] == null)) {
				max[j-1] = temp[j];
			}
			if(temp[j] != null && (min[j-1] > temp[j] || min[j-1] == null)) {
				min[j-1] = temp[j];
			}
		}
	}
	var out = [];
	var tempMaxString = "";
	var tempMinString = "";
	for(var i = 0 ; i < min.length ; i++) {
		tempMinString += min[i] + unit + ", ";
		tempMaxString += max[i] + unit + ", ";
	}
	tempMaxString = tempMaxString.substring(0, tempMaxString.length - 2);//this gets rid of the comma
	tempMinString = tempMinString.substring(0, tempMinString.length - 2);
	out.push(tempMinString);
	out.push(tempMaxString);
	return out;
}

function setMinMax() {//this function gets the average min max of all the characteristics and writesthemout in the html

	var tempArr = MinMax(temperatureData, " °C");

	$("#temperature-high").html(tempArr[1]);
	$("#temperature-low").html(tempArr[0]);

	var tempArr = MinMax(pressureData, " mbar");

	$("#pressure-high").html(tempArr[1]);
	$("#pressure-low").html(tempArr[0]);

	var tempArr = MinMax(humidityData, " %");

	$("#humidity-high").html(tempArr[1]);
	$("#humidity-low").html(tempArr[0]);

	var tempArr = MinMax(UVData, "");

	$("#UV-high").html(tempArr[1]);
	$("#UV-low").html(tempArr[0]);

	var tempArr = MinMax(soundData, " dB");

	$("#sound-high").html(tempArr[1]);
	$("#sound-low").html(tempArr[0]);

	var tempArr = MinMax(batteryData, " %");

	$("#battery-high").html(tempArr[1]);
	$("#battery-low").html(tempArr[0]);

	var tempArr = MinMax(lightData, " mV");

	$("#light-high").html(tempArr[1]);
	$("#light-low").html(tempArr[0]);

	var tempArr = MinMax(CO2Data, " ppm");

	$("#CO2-high").html(tempArr[1]);
	$("#CO2-low").html(tempArr[0]);

	var tempArr = MinMax(SO2Data, " ppm");

	$("#SO2-high").html(tempArr[1]);
	$("#SO2-low").html(tempArr[0]);

	var tempArr = MinMax(COData, " ppm");

	$("#CO-high").html(tempArr[1]);
	$("#CO-low").html(tempArr[0]);

	var tempArr = MinMax(O3Data, " ppm");

	$("#O3-high").html(tempArr[1]);
	$("#O3-low").html(tempArr[0]);

	var tempArr = MinMax(NO2Data, " ppm");

	$("#NO2-high").html(tempArr[1]);
	$("#NO2-low").html(tempArr[0]);

	var tempArr = MinMax(PMData, "");

	$("#PM-high").html(tempArr[1]);
	$("#PM-low").html(tempArr[0]);

	var tempArr = MinMax(rssiData, " dbm");

	$("#rssi-high").html(tempArr[1]);
	$("#rssi-low").html(tempArr[0]);
}


//this function creates graphs with the packege Dygraphs and puts them into the html elements
function renderGraphs() {
	console.log("rendedring graphs");
	$('#temperatureGraph').hide();
	document.getElementById("temperatureGraph").style.visibility = "hidden";
	$('#pressureGraph').hide();
	document.getElementById("pressureGraph").style.visibility = "hidden";
	$('#humidityGraph').hide();
	document.getElementById("humidityGraph").style.visibility = "hidden";
	$('#UVGraph').hide();
	document.getElementById("UVGraph").style.visibility = "hidden";
	$('#soundGraph').hide();
	document.getElementById("soundGraph").style.visibility = "hidden";
	$('#batteryGraph').hide();
	document.getElementById("batteryGraph").style.visibility = "hidden";
	$('#lightLevelGraph').hide();
	document.getElementById("lightLevelGraph").style.visibility = "hidden";
	$('#CO2Graph').hide();
	document.getElementById("CO2Graph").style.visibility = "hidden";
	$('#SO2Graph').hide();
	document.getElementById("CO2Graph").style.visibility = "hidden";
	$('#COGraph').hide();
	document.getElementById("CO2Graph").style.visibility = "hidden";
	$('#O3Graph').hide();
	document.getElementById("CO2Graph").style.visibility = "hidden";
	$('#NO2Graph').hide();
	document.getElementById("CO2Graph").style.visibility = "hidden";
	$('#PMGraph').hide();
	document.getElementById("PMGraph").style.visibility = "hidden";
	$('#rssiGraph').hide();
	document.getElementById("rssiGraph").style.visibility = "hidden";
	$('#accelerometerGraph').hide();
	document.getElementById("accelerometerGraph").style.visibility = "hidden";


	if(temperatureCSV.length > 0) {
		$('#temperatureGraphContainer').slideDown();
		document.getElementById("temperatureGraph").style.visibility = "visible";
		temperatureGraph = new Dygraph(document.getElementById("temperatureGraph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("temperatureGraph").style.width = "100%"
		$('#temperatureGraph').fadeIn(2000);
		temperatureGraph = new Dygraph(document.getElementById("temperatureGraph") , temperatureCSV, {
			connectSeparatedPoints: true,
			ylabel: "Temperature (°C)",
			fillGraph: true
		});
		document.getElementById("temperatureGraph").style.width = "100%";
	}
	else {
		$('#temperatureGraphContainer').slideUp();
	}

	if(pressureCSV.length > 0) {
		$('#pressureGraphContainer').slideDown();
		document.getElementById("pressureGraph").style.visibility = "visible";
		$('#pressureGraph').fadeIn(2000);
		pressureGraph = new Dygraph(document.getElementById("pressureGraph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("pressureGraph").style.width = "100%"
		pressureGraph = new Dygraph(document.getElementById("pressureGraph") , pressureCSV, {
			connectSeparatedPoints: true,
			ylabel: "Pressure (mbar)",
			fillGraph: true
		});
		document.getElementById("pressureGraph").style.width = "100%";
	}
	else {
		$('#pressureGraphContainer').slideUp();
	}

	if(humidityCSV.length > 0) {
		$('#humidityGraphContainer').slideDown();
		document.getElementById("humidityGraph").style.visibility = "visible";
		$('#humidityGraph').fadeIn(2000);
		humidityGraph = new Dygraph(document.getElementById("humidityGraph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("humidityGraph").style.width = "100%"
		humidityGraph = new Dygraph(document.getElementById("humidityGraph"), humidityCSV, {
			connectSeparatedPoints: true,
			ylabel: "Humidity (%)",
			fillGraph: true
		});
		document.getElementById("humidityGraph").style.width = "100%";
	}
	else {
		$('#humidityGraphContainer').slideUp();
	}

	if(UVCSV.length > 0) {
		$('#UVGraphContainer').slideDown();
		document.getElementById("UVGraph").style.visibility = "visible";
		$('#UVGraph').fadeIn(2000);
		UVGraph = new Dygraph(document.getElementById("UVGraph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("UVGraph").style.width = "100%"
		UVGraph = new Dygraph(document.getElementById("UVGraph"), UVCSV, {
			connectSeparatedPoints: true,
			ylabel: "UV index",
			fillGraph: true
		});
		document.getElementById("UVGraph").style.width = "100%";
	}
	else {
		$('#UVGraphContainer').slideUp();
	}

	if(soundCSV.length > 0) {
		$('#soundGraphContainer').slideDown();
		document.getElementById("soundGraph").style.visibility = "visible";
		$('#soundGraph').fadeIn(2000);
		soundGraph = new Dygraph(document.getElementById("soundGraph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("soundGraph").style.width = "100%"
		soundGraph = new Dygraph(document.getElementById("soundGraph"), soundCSV, {
			connectSeparatedPoints: true,
			ylabel: "Sound Level",
			fillGraph: true
		});
		document.getElementById("soundGraph").style.width = "100%";
	}
	else {
		$('#soundGraphContainer').slideUp();
	}

	if(batteryCSV.length > 0) {
		$('#batteryGraphContainer').slideDown();
		document.getElementById("batteryGraph").style.visibility = "visible";
		$('#batteryGraph').fadeIn(2000);
		batteryGraph = new Dygraph(document.getElementById("batteryGraph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("batteryGraph").style.width = "100%"
		batteryGraph = new Dygraph(document.getElementById("batteryGraph") , batteryCSV, {
			ylabel: "Battery level (%)",
			connectSeparatedPoints: true,
			fillGraph: true,
			valueRange: [0, 110]
		});
		document.getElementById("batteryGraph").style.width = "100%";
	}
	else {
		$('#batteryGraphContainer').slideUp();
	}
	if(lightCSV.length > 0) {
		$('#lightLevelGraphContainer').slideDown();
		document.getElementById("lightLevelGraph").style.visibility = "visible";
		$('#lightLevelGraph').fadeIn(2000);
		lightLevelGraph = new Dygraph(document.getElementById("lightLevelGraph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("lightLevelGraph").style.width = "100%"
		lightLevelGraph = new Dygraph(document.getElementById("lightLevelGraph"), lightCSV, {
			connectSeparatedPoints: true,
			ylabel: "Light level (mV)",
			fillGraph: true
		});
		document.getElementById("lightLevelGraph").style.width = "100%";
	}
	else {
		$('#lightLevelGraphContainer').slideUp();
	}

	if(CO2CSV.length > 0) {
		$('#CO2GraphContainer').slideDown();
		document.getElementById("CO2Graph").style.visibility = "visible";
		$('#CO2Graph').fadeIn(2000);
		CO2Graph = new Dygraph(document.getElementById("CO2Graph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("CO2Graph").style.width = "100%"
		CO2Graph = new Dygraph(document.getElementById("CO2Graph"), CO2CSV, {
			connectSeparatedPoints: true,
			ylabel: "CO2 Level (ppm)",
			fillGraph: true
		});
		document.getElementById("CO2Graph").style.width = "100%";
	}
	else {
		$('#CO2GraphContainer').slideUp();
	}

	if(SO2CSV.length > 0) {
		$('#SO2GraphContainer').slideDown();
		document.getElementById("SO2Graph").style.visibility = "visible";
		$('#SO2Graph').fadeIn(2000);
		SO2Graph = new Dygraph(document.getElementById("SO2Graph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("SO2Graph").style.width = "100%"
		SO2Graph = new Dygraph(document.getElementById("SO2Graph"), SO2CSV, {
			connectSeparatedPoints: true,
			ylabel: "SO2 Level (ppm)",
			fillGraph: true
		});
		document.getElementById("SO2Graph").style.width = "100%";
	}
	else {
		$('#SO2GraphContainer').slideUp();
	}

	if(COCSV.length > 0) {
		$('#COGraphContainer').slideDown();
		document.getElementById("COGraph").style.visibility = "visible";
		$('#COGraph').fadeIn(2000);
		COGraph = new Dygraph(document.getElementById("COGraph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("COGraph").style.width = "100%"
		COGraph = new Dygraph(document.getElementById("COGraph"), COCSV, {
			connectSeparatedPoints: true,
			ylabel: "CO Level (ppm)",
			fillGraph: true
		});
		document.getElementById("COGraph").style.width = "100%";
	}
	else {
		$('#COGraphContainer').slideUp();
	}

	if(O3CSV.length > 0) {
		$('#O3GraphContainer').slideDown();
		document.getElementById("O3Graph").style.visibility = "visible";
		$('#O3Graph').fadeIn(2000);
		O3Graph = new Dygraph(document.getElementById("O3Graph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("O3Graph").style.width = "100%"
		O3Graph = new Dygraph(document.getElementById("O3Graph"), O3CSV, {
			connectSeparatedPoints: true,
			ylabel: "O3 Level (ppm)",
			fillGraph: true
		});
		document.getElementById("O3Graph").style.width = "100%";
	}
	else {
		$('#O3GraphContainer').slideUp();
	}

	if(NO2CSV.length > 0) {
		$('#NO2GraphContainer').slideDown();
		document.getElementById("NO2Graph").style.visibility = "visible";
		$('#NO2Graph').fadeIn(2000);
		NO2Graph = new Dygraph(document.getElementById("NO2Graph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("NO2Graph").style.width = "100%"
		NO2Graph = new Dygraph(document.getElementById("NO2Graph"), NO2CSV, {
			connectSeparatedPoints: true,
			ylabel: "NO2 Level (ppm)",
			fillGraph: true
		});
		document.getElementById("NO2Graph").style.width = "100%";
	}
	else {
		$('#NO2GraphContainer').slideUp();
	}

	if(PMCSV.length > 0) {
		$('#PMGraphContainer').slideDown();
		document.getElementById("PMGraph").style.visibility = "visible";
		$('#PMGraph').fadeIn(2000);
		PMGraph = new Dygraph(document.getElementById("PMGraph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("PMGraph").style.width = "100%"
		PMGraph = new Dygraph(document.getElementById("PMGraph"), PMCSV, {
			connectSeparatedPoints: true,
			ylabel: "PM Index",
			fillGraph: true
		});
		document.getElementById("PMGraph").style.width = "100%";
	}
	else {
		$('#PMGraphContainer').slideUp();
	}
		

	if(rssiCSV.length > 0) {
		$('#rssiGrapgContainer').slideDown();
		document.getElementById("rssiGraph").style.visibility = "visible";
		$('#rssiGraph').fadeIn(2000);
		rssiGraph = new Dygraph(document.getElementById("rssiGraph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("rssiGraph").style.width = "100%"
		rssiGraph = new Dygraph(document.getElementById("rssiGraph"), rssiCSV, {
			connectSeparatedPoints: true,
			ylabel: "Rssi (dbm)",
			valueRange: [-115, -30]
		});
		document.getElementById("rssiGraph").style.width = "100%";
	}
	else {
		$('#rssiGrapgContainer').slideUp();
	}

	if(accelCSV.length > 0) {
		$('#accelerometerGraphContainer').slideDown();
		document.getElementById("accelerometerGraph").style.visibility = "visible";
		$('#accelerometerGraph').fadeIn(2000);
		accelGraph = new Dygraph(document.getElementById("accelerometerGraph"), [0], {}); //for some reason when this line is here, the graphs correctly have 100% width
		document.getElementById("accelerometerGraph").style.width = "100%"
		accelGraph = new Dygraph(document.getElementById("accelerometerGraph"), accelCSV, {
			ylabel: "Acceleration (mg)",
			connectSeparatedPoints: true
		});
		document.getElementById("accelerometerGraph").style.width = "100%";
	}
	else {
		$('#accelerometerGraphContainer').slideUp();
	}

}// end of renderGraphs

function renderCSV(dataObj) { // this fills the cvs variables and creates the appropriate buttons in the dropdown after deleting the old ones to be able to display the csv strings in the text box
	
	var CSVdropDown = document.getElementById("CSVDropDown");
	while(CSVdropDown.firstChild) {
		CSVdropDown.removeChild(CSVdropDown.firstChild);
	}

	lightCSV = dataObj.lightData;
	if (lightCSV != "") {
		var lightCSVelem = document.createElement("li");
		lightCSVelem.setAttribute("onclick", "dataToggle('light')");
		lightCSVelem.appendChild(document.createTextNode("Light"));
		CSVdropDown.appendChild(lightCSVelem);
	}

	batteryCSV = dataObj.batteryData;
	if (batteryCSV != "") {
		var batteryCSVelem = document.createElement("li");
		batteryCSVelem.setAttribute("onclick", "dataToggle('battery')");
		batteryCSVelem.appendChild(document.createTextNode("Battery"));
		CSVdropDown.appendChild(batteryCSVelem);
	}

	temperatureCSV = dataObj.temperatureData;
	if (temperatureCSV != "") {
		var temperatureCSVelem = document.createElement("li");
		temperatureCSVelem.setAttribute("onclick", "dataToggle('temperature')");
		temperatureCSVelem.appendChild(document.createTextNode("Temperature"));
		CSVdropDown.appendChild(temperatureCSVelem);
	}

	pressureCSV = dataObj.pressureData;
	if (pressureCSV != "") {
		var pressureCSVelem = document.createElement("li");
		pressureCSVelem.setAttribute("onclick", "dataToggle('pressure')");
		pressureCSVelem.appendChild(document.createTextNode("Pressure"));
		CSVdropDown.appendChild(pressureCSVelem);
	}

	humidityCSV = dataObj.humidityData;
	if (humidityCSV != "") {
		var humidityCSVelem = document.createElement("li");
		humidityCSVelem.setAttribute("onclick", "dataToggle('humidity')");
		humidityCSVelem.appendChild(document.createTextNode("humidity"));
		CSVdropDown.appendChild(humidityCSVelem);
	}

	UVCSV = dataObj.UVData;
	if (UVCSV != "") {
		var UVCSVelem = document.createElement("li");
		UVCSVelem.setAttribute("onclick", "dataToggle('UV')");
		UVCSVelem.appendChild(document.createTextNode("UV"));
		CSVdropDown.appendChild(UVCSVelem);
	}

	soundCSV = dataObj.soundData;
	if (soundCSV != "") {
		var soundCSVelem = document.createElement("li");
		soundCSVelem.setAttribute("onclick", "dataToggle('sound')");
		soundCSVelem.appendChild(document.createTextNode("sound"));
		CSVdropDown.appendChild(soundCSVelem);
	}

	CO2CSV = dataObj.CO2Data;
	if (CO2CSV != "") {
		var CO2CSVelem = document.createElement("li");
		CO2CSVelem.setAttribute("onclick", "dataToggle('CO2')");
		CO2CSVelem.innerHTML = "CO<sub>2</sub>";
		CSVdropDown.appendChild(CO2CSVelem);
	}

	SO2CSV = dataObj.SO2Data;
	if (SO2CSV != "") {
		var SO2CSVelem = document.createElement("li");
		SO2CSVelem.setAttribute("onclick", "dataToggle('SO2')");
		SO2CSVelem.innerHTML = "SO<sub>2</sub>";
		CSVdropDown.appendChild(SO2CSVelem);
	}

	COCSV = dataObj.COData;
	if (COCSV != "") {
		var COCSVelem = document.createElement("li");
		COCSVelem.setAttribute("onclick", "dataToggle('CO')");
		COCSVelem.appendChild(document.createTextNode("CO"));
		CSVdropDown.appendChild(COCSVelem);
	}

	O3CSV = dataObj.O3Data;
	if (O3CSV != "") {
		var O3CSVelem = document.createElement("li");
		O3CSVelem.setAttribute("onclick", "dataToggle('O3')");
		O3CSVelem.innerHTML = "O<sub>3</sub>";
		CSVdropDown.appendChild(O3CSVelem);
	}

	NO2CSV = dataObj.NO2Data;
	if (NO2CSV != "") {
		var NO2CSVelem = document.createElement("li");
		NO2CSVelem.setAttribute("onclick", "dataToggle('NO2')");
		NO2CSVelem.innerHTML = "NO<sub>2</sub>";
		CSVdropDown.appendChild(NO2CSVelem);
	}

	PMCSV = dataObj.PMData;
	if (PMCSV != "") {
		var PMCSVelem = document.createElement("li");
		PMCSVelem.setAttribute("onclick", "dataToggle('PM')");
		PMCSVelem.innerHTML = "PM<sub>2.5</sub>";
		CSVdropDown.appendChild(PMCSVelem);
	}

	rssiCSV = dataObj.rssiData;
	if (rssiCSV != "") {
		var rssiCSVelem = document.createElement("li");
		rssiCSVelem.setAttribute("onclick", "dataToggle('rssi')");
		rssiCSVelem.appendChild(document.createTextNode("RSSI"));
		CSVdropDown.appendChild(rssiCSVelem);
	}

	accelCSV = dataObj.accelData;
	if (accelCSV != "") {
		var accelCSVelem = document.createElement("li");
		accelCSVelem.setAttribute("onclick", "dataToggle('accel')");
		accelCSVelem.appendChild(document.createTextNode("Accelerometer"));
		CSVdropDown.appendChild(accelCSVelem);
	}

	document.getElementById('csvelem').style.visibility = "visible";
	document.getElementById('csv').value = "";
	
	$('#csvelem').slideDown();

	
}

function dataToggle(type) { // this changes the content of the csv field
	console.log("toggle csv " + type);
	var field = document.getElementById('csv');
	switch(type) {
		case 'light':
			field.value = lightCSV;
			break
		case 'battery':
			field.value = batteryCSV;
			break;
		case 'temperature':
			field.value = temperatureCSV;
			break;
		case 'pressure':
			field.value = pressureCSV;
			break;
		case 'humidity':
			field.value = humidityCSV;
			break;
		case 'UV':
			field.value = UVCSV;
			break;
		case 'sound':
			field.value = soundCSV;
			break;
		case 'CO2':
			field.value = CO2CSV;
			break;
		case 'SO2':
			field.value = SO2CSV;
			break;
		case 'CO':
			field.value = COCSV;
			break;
		case 'O3':
			field.value = O3CSV;
			break;
		case 'NO2':
			field.value = NO2CSV;
			break;
		case 'PM':
			field.value = PMCSV;
			break;
		case 'rssi':
			field.value = rssiCSV;
			break;
		case 'accel':
			field.value = accelCSV;
	}
}


function renderMessage(m) {// this function is used to append any message to the message list and they will dissapear after 5 sec
	var message = document.createElement('li');
	message.appendChild(document.createTextNode(m));
	var container = document.getElementById('messages');
	container.appendChild(message);
	setTimeout(function() {
		container.removeChild(message);
	}, 5000);
}

