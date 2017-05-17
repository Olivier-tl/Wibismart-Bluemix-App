var HumidityGauge = (function () {
    var instance;

    function createInstance() {
        var opts = {
          lines: 12, // The number of lines to draw
          angle: 0.3, // The length of each line
          lineWidth: 0.1, // The line thickness

          limitMax: 'false',   // If true, the pointer will not go past the end of the gauge
          colorStart: '#5bc0de',   // Colors
          colorStop: '#5bc0de',    // just experiment with them
          strokeColor: '#FFFFFF',   // to see which ones work best for you
          generateGradient: true
        };
        var target = document.getElementById('humiditygauge'); // your canvas element
        var gauge = new Donut(target).setOptions(opts); // create sexy gauge!
        gauge.maxValue = 100; // set max gauge value
        gauge.maxValue = 100; // set max gauge value
        gauge.animationSpeed = 15; // set animation speed (32 is default value)
        gauge.set(5); // set actual value
        return gauge;
        }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();

var PressureGauge = (function () {
    var instance;

    function createInstance() {
        var opts = {
          lines: 12, // The number of lines to draw
          angle: 0.01, // The length of each line
          lineWidth: 0.20, // The line thickness
          pointer: {
            length: 0.8, // The radius of the inner circle
            strokeWidth: 0.030, // The rotation offset
            color: '#000000' // Fill color
          },
          colorStart: '#01579B',   // Colors
          colorStop: '#01579B',    // just experiment with them
          strokeColor: '#E0E0E0',   // to see which ones work best for you
          generateGradient: true
        };
        var target = document.getElementById('pressuregauge'); // your canvas element
        var gauge = new Gauge(target).setOptions(opts); // create sexy gauge!
        gauge.maxValue = 1500; // set max gauge value
        gauge.animationSpeed = 1; // set animation speed (32 is default value)
        gauge.set(5); // set actual value
        return gauge;
        }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();

var TemperatureGauge = (function () {
    var instance;

    function createInstance() {
        var opts = {
          lines: 12, // The number of lines to draw
          angle: 0.01, // The length of each line
          lineWidth: 0.20, // The line thickness
          pointer: {
            //length: 1, // The radius of the inner circle
            //strokeWidth: 0.030, // The rotation offset
            //color: '#000000' // Fill color
          },
           colorStart: '#f39c12',   // Colors
           colorStop: '#f39c12',
          strokeColor: '#E0E0E0',   //grey part to see which ones work best for you
          generateGradient: true
        };
        var target = document.getElementById('temperaturegauge'); // your canvas element
        var gauge = new Gauge(target).setOptions(opts); // create sexy gauge!
        gauge.maxValue = 35; // set max gauge value
        gauge.minValue = -30
        gauge.animationSpeed = 1; // set animation speed (32 is default value)
        gauge.set(1); // set actual value
        return gauge;
        }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();




function renderTemperatureGaugeColor(temperature){
    if(temperature<0){
        TemperatureGauge.getInstance().setOptions({colorStart:'#68e8e4', colorStop: '#68e8e4'})
    }
    else if(temperature<10){
        TemperatureGauge.getInstance().setOptions({colorStart:'#68a0e8', colorStop: '#68a0e8'})
    }
    else if(temperature<25){
        TemperatureGauge.getInstance().setOptions({colorStart:'#fcc754', colorStop: '#fcc754'})
    }else{
        TemperatureGauge.getInstance().setOptions({colorStart:'#fc6d54', colorStop: '#fc6d54'})
    }
}

var TemperatureChart = (function () {
    var instance;
    //console.log(LabelQueue.getInstance());

function createInstance() {
    //separator
    var config = {
            type: 'line',
            data: {
                labels:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
                datasets: [{
                    label: "Temperature Evolution",
                    backgroundColor: "rgba(91, 192, 222, 0.2)",
                    borderColor: "#5BC0DE",//"rgba(46, 204, 113, 1)",
                    pointBorderColor: "#5BC0DE",//"rgba(46, 204, 113, 1)",
                    pointStrokeColor: "#5BC0DE",
                    data: []//getTempData(),//JSON.parse(temperaturelist),

                }]
            },
            options: {
              animation: false,
              title: {
                display: false,
                text: "Temperature data (Celsius)",
                fontSize: 24,
                fontFamily: 'Josefin Sans',
                padding: 20
              },
              legend: {
                display: false,
                
              },
              scales: {
                  xAxes: [{
                    gridLines: {
                        display:false
                    }
                 }],
                    yAxes: [{
                      ticks: {
                        min: 20,
                        max: 40
                      }
                    }]
                }
            }
        };

    var ctx = document.getElementById("temperaturelinechart").getContext("2d");
    var myChart = new Chart(ctx, config);

    return myChart;
    }

return {
    getInstance: function () {
        if (!instance) {
            instance = createInstance();
        }
        return instance;
    }
};
})();

var AccelerometerChart = (function () {
    var instance;

    function createInstance() {

    //space alloc
        var config = {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: "X axis",
                    backgroundColor: "rgba(14, 75, 154, 0.2)",
                    borderColor: "rgba(14, 75, 154, 1)",
                    pointBorderColor: "rgba(14, 75, 154, 1)",
                    pointStrokeColor: "#fff",
                    data: []

                },
                {
                    label: "Y axis",
                    backgroundColor: "rgba(46, 204, 113, 0.2)",
                    borderColor: "rgba(46, 204, 113, 1)",
                    pointBorderColor: "rgba(46, 204, 113, 1)",
                    pointStrokeColor: "#fff",
                    data: []

                },
                {
                    label : "Z axis",
                    backgroundColor: "rgba(91, 192, 222, 0.2)",
                    borderColor: "rgba(91, 192, 222, 1)",
                    pointBorderColor: "rgba(91, 192, 222, 1)",
                    pointStrokeColor: "#fff",
                    data: []

                }

                ]
            },
            options: {
              legend: {
                position: 'top'
              },
              animation: false,
              scales: {
              xAxes: [{
                    gridLines: {
                        display:false
                    }
                }],
                yAxes: [{
                      gridLines: {
                        display: true
                      },
                      ticks: {
                        min: -4000,
                        max: 4000
                      }
                    }]
                }
            }
        };

        var ctx = document.getElementById("acccelerometerlinechart").getContext("2d");
        var myChart = new Chart(ctx, config);
        return myChart;
        }

    return {
        getInstance: function () {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();

