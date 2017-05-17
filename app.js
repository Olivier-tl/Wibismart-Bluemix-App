
var express = require('express');
var sockjs  = require('sockjs');
var http    = require('http');
var mqtt = require('mqtt');
var websocket_multiplex = require('websocket-multiplex');
var path = require('path');
var macUtil = require('getmac');
var cfenv = require('cfenv');
var properties = require('properties');


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
  var sockjs_opts = {sockjs_url: "http://cdnjs.cloudflare.com/ajax/libs/three.js/r67/three.js"};
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
  //var clickChannel = multiplexer.registerChannel('click');
  var mqttTopics = {};
  client.on('message', function(topic, message, packet) {
    console.log("received message")
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
        if(dataObj.deviceId && this.topic === conn.topic && this.conn.id == conn.conn.id) {
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

  accelChannel.on('connection', onConnection('/evt/accel/fmt/json'));
  airChannel.on('connection', onConnection('/evt/air/fmt/json'));
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