
var express = require('express');
var sockjs  = require('sockjs');
var http    = require('http');
var mqtt = require('mqtt');
var websocket_multiplex = require('websocket-multiplex');
var path = require('path');
var macUtil = require('getmac');
var cfenv = require('cfenv');
var properties = require('properties');
var Cloudant = require('cloudant');
var Client = require('ibmiotf');

var appClientConfig = {
    "org" : "4rxa4d",
    "id": Date.now().toString(),
    "domain": "internetofthings.ibmcloud.com",
    "auth-key" : "a-4rxa4d-grkivvkg6x",
    "auth-token" : "ey?sMBDkxLa0SjzlpJ"
}
 
var appClient = new Client.IotfApplication(appClientConfig);
appClient.connect();

appClient.on('connect', function() {
  console.log('[IBMIoTf] Connected');
});

var appEnv = cfenv.getAppEnv();
var instanceId = !appEnv.isLocal ? appEnv.app.instance_id : undefined;
var iotService = appEnv.getService('Internet of Things Platform-as');
if(instanceId && iotService && iotService != null) {
  console.log('Instance Id: ' + instanceId);
  start(instanceId, iotService.credentials.apiKey, iotService.credentials.apiToken,
    iotService.credentials.mqtt_host, iotService.credentials.mqtt_s_port);
} else {
  properties.parse('./config.properties', {path: true}, function(err, cfg) {
    if (err) {
      console.error('A file named config.properties containing the device registration from the IBM IoT Cloud is missing.');
      console.error('The file must contain the following properties: apikey and apitoken.');
      throw e;
    }
    macUtil.getMac(function(err, macAddress) {
      if (err)  throw err;
      var deviceId = macAddress.replace(/:/gi, '');
      console.log("Device MAC Address: " + deviceId);
      var org = cfg.apikey.split('-')[1];
      start(deviceId, cfg.apikey, cfg.apitoken, org + '.messaging.internetofthings.ibmcloud.com', 
        '8883');
    });
  });
}
function start(deviceId, apiKey, apiToken, mqttHost, mqttPort) {
  var sockjs_opts = {sockjs_url: "https://cdnjs.cloudflare.com/ajax/libs/three.js/r67/three.js"};
  var org = apiKey.split('-')[1];
  var clientId = ['a', org, deviceId].join(':');
  var client = mqtt.connect("mqtts://" + mqttHost + ":" + mqttPort, {
              "clientId" : clientId,
              "keepalive" : 30,
              "username" : apiKey,
              "password" : apiToken
            });
  client.on('connect', function() {
    console.log('MQTT client connected to IBM IoT Cloud.');
  });
  client.on('error', function(err) {
    console.error('client error' + err);
    process.exit(1);
  });
  client.on('close', function() {
    console.log('client closed');
    process.exit(1);
  });

  var service = sockjs.createServer(sockjs_opts);
  var multiplexer = new websocket_multiplex.MultiplexServer(service);
  var accelChannel = multiplexer.registerChannel('accel');
  var airChannel = multiplexer.registerChannel('air');
  var lightChannel = multiplexer.registerChannel('health');
  var batteryChannel = multiplexer.registerChannel('battery');
  var locationChannel = multiplexer.registerChannel('location');
  var dataBaseChannel = multiplexer.registerChannel('dataBase');
  var scanChannel = multiplexer.registerChannel('scanCommand');
  var connectionChannel = multiplexer.registerChannel('connectionCommand');
  var sensorToggleChannel = multiplexer.registerChannel('sensorToggleCommand');
  var sensorPeriodChannel = multiplexer.registerChannel('sensorPeriodCommand');
  var getterChannel = multiplexer.registerChannel('getterChannel');
  //var clickChannel = multiplexer.registerChannel('click');
  var mqttTopics = {};
  client.on('message', function(topic, message, packet) {
    console.log("received message");
    var topicSplit = topic.split('/');
    topicSplit[2] = '+'; //Replace the type with the wildcard +
    var conns = mqttTopics[topicSplit.join('/')];
    if(conns) {
      for(var i = 0; i < conns.length; i++) {
        var conn = conns[i];
        if(conn) {
          conn.write(message);
        }
      }
    }
  });

  function onConnection(topicPath) {
    return function(conn) {
      var mqttTopic;
      console.log('Entering onConnection()' + 'Topic' + topicPath);
      conn.subscribed = false;
      // These listeners behave very strange.  You would think that events would be 
      // broadcast on a per channel per connection basis but that is not the case.
      // Any event is broadcast across all channel and all connections, hence the
      // checking of the topics and connections.
      conn.on('close', function() {
        if(mqttTopic && this.topic === conn.topic && this.conn.id == conn.conn.id) {
          var conns = mqttTopics[mqttTopic];
          if(conns) {
            var index = conns.indexOf(conn);
            if(index != -1) {
              mqttTopics[mqttTopic].splice(index, 1);
              if(conns.length == 0) {
                client.unsubscribe(mqttTopic);
                delete mqttTopics[mqttTopic];
              }
            }
          } 
        }
      });
      conn.on('data', function(data) {
        var dataObj = JSON.parse(data);
        console.log('Received data. Looking to subscribe')
        if(this.subscribed == false && dataObj.deviceId && this.topic === conn.topic && this.conn.id == conn.conn.id) {
          this.subscribed = true;
          mqttTopic = 'iot-2/type/+/id/' + dataObj.deviceId + topicPath;
          console.log('Subscribing to topic ' + mqttTopic);
          if(!mqttTopics[mqttTopic] || mqttTopics[mqttTopic].length == 0) {
            mqttTopics[mqttTopic] = [conn];
            client.subscribe(mqttTopic, {qos : 0}, function(err, granted) {
              if (err) throw err;
              console.log("subscribed");
            });
          } else {
            mqttTopics[mqttTopic].push(conn);
          }
        }
      });
    };
  };


function dataRequest() {
  return function(conn) {
    console.log("Data channel connected");
    conn.on('close', function() {
        console.log("Data channel close");
    });

    conn.on('data', function(data) {
      var lightData = [];
      var batteryData = [];
      var accelData = [];
      var temperatureData = [];
      var pressureData = [];
      var humidityData = [];
      var rssiData = [];
      var dbList = [];
      var requestObj = JSON.parse(data);
      var uuid = requestObj.uuid;
      var deviceIndex = 0;
      var totalDevices = uuid.length;
      var sent = {};
      for(var a = 0 ; a < totalDevices ; a++) {
        sent[uuid[a]] = false;
      }
      var uuidIndex = {};
      for(var a = 0 ; a < totalDevices ; a++) {
        uuidIndex[uuid[a]] = a;
      }
    	var startDate = requestObj.startDate;
	    var endDate = requestObj.endDate;
      var counter = 0;
	    var doneCounter = 0;
      cloudant.db.list(function(err, allDbs){ //this gets a list of all the databases 
        if (err) {
            throw err;
          }
        for(var i = 0 ; i < allDbs.length ; i++ ) {
          var tempDate = allDbs[i].split('_')[3];
          if ( compareDate(startDate, tempDate) > 0 && compareDate(tempDate, endDate) > 0 ) { //for each database, we check if it is in the correct timeframe.
            counter++;
            var tempInstance = cloudant.db.use(allDbs[i]);
            
            dbList.push(tempInstance);
            

          }// end of if statement
        }//end of for loop
        console.log("Accessing Databases...");
        querryAll(uuid[deviceIndex]);

      });//end of list

      function querryAll(thisUuid) {
        for(var j = 0 ; j < 5 && j < dbList.length ; j++) {
          tempInstance = dbList[j];
          querry(tempInstance, dbList.length, j+1, thisUuid);
        }
      }

      function querry(tempInstance, dblength, index, thisUuid) {
        console.log('querry for ' + thisUuid +" device "+(deviceIndex+1)+ "/"+ totalDevices + " database " + index + "/" + dblength);
            tempInstance.find({ //this will get all the data in a specific instance of a database with a given device id
              "selector": {
                "deviceId" : thisUuid

              },
              "fields": [
                "timestamp",
                "data.d",
                "eventType"

              ],
              "sort": [
                {
                "_id": "asc"
                }
              ]
              }, function(err, result) { //results represents the data comming back from the database.
                if (err) {
                  throw err;
                }
                for (var i = 0; i < result.docs.length; i++) {
                  var tempDataSet = [];
                  switch(result.docs[i].eventType) {
                    case 'health':
                      tempDataSet.push(result.docs[i].timestamp);
                      extraPointsBefore(tempDataSet, uuidIndex[thisUuid], 1);
                      tempDataSet.push(result.docs[i].data.d.light);
                      extraPointsAfter(tempDataSet, uuidIndex[thisUuid], 1);
                      
                      lightData.push(tempDataSet);
                      break;
                    case 'battery':
                      tempDataSet.push(result.docs[i].timestamp);
                      extraPointsBefore(tempDataSet, uuidIndex[thisUuid], 1);
                      tempDataSet.push(result.docs[i].data.d.batteryLevel);
                      extraPointsAfter(tempDataSet, uuidIndex[thisUuid], 1);
                      
                      batteryData.push(tempDataSet);
                      break;
                    case 'location':
                      tempDataSet.push(result.docs[i].timestamp);
                      extraPointsBefore(tempDataSet, uuidIndex[thisUuid], 1);
                      tempDataSet.push(result.docs[i].data.d.rssi);
                      extraPointsAfter(tempDataSet, uuidIndex[thisUuid], 1);
                      
                      rssiData.push(tempDataSet);
                      break;
                    case 'accel':
                      tempDataSet.push(result.docs[i].timestamp);
                      extraPointsBefore(tempDataSet, uuidIndex[thisUuid], 3);
                      tempDataSet.push(result.docs[i].data.d.x);
                      tempDataSet.push(result.docs[i].data.d.y);
                      tempDataSet.push(result.docs[i].data.d.z);
                      extraPointsAfter(tempDataSet, uuidIndex[thisUuid], 3);
                      
                      accelData.push(tempDataSet);
                      break;
                    case 'air':
                      tempDataSet.push(result.docs[i].timestamp);
                      extraPointsBefore(tempDataSet, uuidIndex[thisUuid], 1);
                      tempDataSet.push(result.docs[i].data.d.pressure);
                      extraPointsAfter(tempDataSet, uuidIndex[thisUuid], 1);
                      
                      pressureData.push(tempDataSet);
                      tempDataSet = [];

                      tempDataSet.push(result.docs[i].timestamp);
                      extraPointsBefore(tempDataSet, uuidIndex[thisUuid], 1);
                      tempDataSet.push(result.docs[i].data.d.temperature);
                      extraPointsAfter(tempDataSet, uuidIndex[thisUuid], 1);
                    
                      temperatureData.push(tempDataSet);
                      tempDataSet = [];

                      tempDataSet.push(result.docs[i].timestamp);
                      extraPointsBefore(tempDataSet, uuidIndex[thisUuid], 1);
                      tempDataSet.push(result.docs[i].data.d.humidity);
                      extraPointsAfter(tempDataSet, uuidIndex[thisUuid], 1);
                      
                      humidityData.push(tempDataSet);
                      break;
                    default:
                      break;
                  }
                } // end of for loop
                doneCounter++;
                if(doneCounter == counter && sent[thisUuid] == false) { //this is executed when all databases have been processed and the data has been pushed
                  sent[thisUuid] = true;
                  if(deviceIndex == totalDevices - 1) {
                    sendDataBack(conn, lightData, batteryData, temperatureData, pressureData, humidityData, accelData, rssiData);
                  }
                  else {
                    doneCounter = 0;
                    deviceIndex++;
                    console.log('next device');
                    setTimeout(function() {
                      querryAll(uuid[deviceIndex]);
                    },2000);
                  }
                }
                else if(index+4 < dblength && sent[thisUuid] == false) {
                  setTimeout(function() {
                    console.log('timeout');
                    querry(dbList[index], dblength, index+5, thisUuid);
                  }, 1500);
                }
            });// end of find

      }//end of querry

      //this function adds null to arrays to place the data pont at the correct entry
      function extraPointsBefore(arr, position, points) {
          for(var i = 0 ; i < position ; i+=points) {
              for(var j = 0 ; j < points ; j++) {
                arr.push(null);
              }
          }
      }

      //this function adds null to the array after the data has been set to complete the length
      function extraPointsAfter(arr, position, points) {
        for(var i = (position*points)+points+1 ; i < totalDevices*points + 1; i++) {
          arr.push(null);
        }
      }



    });//end of .on('data')
  }; //end of returning function
};





//this function cheks if the input is between the end and start date. returns 1 if date1 happens before or same day as date2 and -1 for the other way around
function compareDate(inputDate1, inputDate2) {
	var date1 = inputDate1.split('-');
	var date2 = inputDate2.split('-');
	
	if(date1.length != 3 || date2.length != 3 ) { //checks if dates are valid
		return -1;
	}
	if(date1[0] < date2[0]) {
		return 1;
	}
	if(date1[0] == date2[0]) {
		if(date1[1] < date2[1]) {
			return 1;
		}
		if(date1[1] == date2[1]) {
			if(date1[2] <= date2[2]) {
				return 1;
			}
		}
	}
	return -1;
}



function sendDataBack(conn, lightData, batteryData, temperatureData, pressureData, humidityData, accelData, rssiData) {
    var chartData = {};
    chartData.lightData = lightData;
    chartData.batteryData = batteryData;
    chartData.temperatureData = temperatureData;
    chartData.pressureData = pressureData;
    chartData.humidityData = humidityData;
    chartData.accelData = accelData;
    chartData.rssiData = rssiData;
    console.log("Sending back data to the client");
    conn.write(JSON.stringify(chartData));


}

function commandChannelConnected(topicPath) {
  return function(conn) {
      conn.subscribed = false;
        console.log("Command channel connected" + topicPath);
        conn.on('close', function() {
          if(mqttTopic != undefined && mqttTopic && this.topic === conn.topic && this.conn.id == conn.conn.id) {
            var conns = mqttTopics[mqttTopic];
            if(conns) {
              var index = conns.indexOf(conn);
              if(index != -1) {
                mqttTopics[mqttTopic].splice(index, 1);
                if(conns.length == 0) {
                  client.unsubscribe(mqttTopic);
                  delete mqttTopics[mqttTopic];
                }
              }
            } 
          }
        });

    conn.on('data', function(data) {
      var dataObj = JSON.parse(data);
      console.log("Data recieved, sending "+ dataObj.commandName + " command... ");
      appClient.publishDeviceCommand(dataObj.deviceType, dataObj.deviceId, dataObj.commandName, "json", dataObj.payload);
      if(this.subscribed == false && dataObj.deviceId && this.topic === conn.topic && this.conn.id == conn.conn.id) {
          this.subscribed = true;
          mqttTopic = 'iot-2/type/+/id/' + dataObj.deviceId + topicPath;
          console.log('Subscribing to topic ' + mqttTopic);
          if(!mqttTopics[mqttTopic] || mqttTopics[mqttTopic].length == 0) {
            mqttTopics[mqttTopic] = [conn];
            client.subscribe(mqttTopic, {qos : 0}, function(err, granted) {
              if (err) throw err;
              console.log("subscribed");
            });
          } else {
            mqttTopics[mqttTopic].push(conn);
          }
        }
    });
  }
}

accelChannel.onmessage = function(e) {
  cosome.log(e)
}

  accelChannel.on('connection', onConnection('/evt/accel/fmt/json'));
  airChannel.on('connection', onConnection('/evt/air/fmt/json'));
  lightChannel.on('connection', onConnection('/evt/health/fmt/json'));
  batteryChannel.on('connection', onConnection('/evt/battery/fmt/json'));
  locationChannel.on('connection', onConnection('/evt/location/fmt/json'));
  dataBaseChannel.on('connection', dataRequest());
  scanChannel.on('connection', commandChannelConnected("/evt/scanResponse/fmt/json"));
  connectionChannel.on('connection', commandChannelConnected("/evt/connectionResponse/fmt/json"));
  sensorToggleChannel.on('connection', commandChannelConnected("/evt/sensorToggleResponse/fmt/json"));
  sensorPeriodChannel.on('connection', commandChannelConnected("/evt/sensorPeriodResponse/fmt/json"));
  getterChannel.on('connection', commandChannelConnected("/evt/getterResponse/fmt/json"));
  //clickChannel.on('connection', onConnection('/evt/click/fmt/json'));

  var app = express(); /* express.createServer will not work here */
  app.use(express.static(path.join(__dirname, 'public')));
  var server = http.createServer(app);

  service.installHandlers(server, {prefix:'/sensortag'});

  var port = process.env.PORT || 9999;
  server.listen(port, '0.0.0.0');
  console.log(' [*] Listening on port ' + port);

  app.get('/', function (req, res) {
    res.sendfile(__dirname + '/public/stats.html');
  });
};




var me = '6f99adac-7671-4e45-9a80-0ba7638a5eb5-bluemix'; // Set this to your own account
var password = 'dcb7a77744a9d8691e8cc098fe7ba645bb9311fe0311528c86ec21cc5ff8a066';

// Initialize the library with my account.
var cloudant = Cloudant({account:me, password:password});

cloudant.set_cors({ enable_cors: true, allow_credentials: true, origins: ["*"]}, function(err, data) { //enable CORS (cross-origin ressource sharing)
});


