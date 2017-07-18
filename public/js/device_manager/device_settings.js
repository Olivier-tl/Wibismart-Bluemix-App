

$(document).ready(function(){
    console.log("sanity check");
    console.log(settings);
    console.log(settings['accelerometerOn']);
    console.log(typeof(settings['accelerometerOn']));
    console.log(settings['accelerometerPeriod']);
    console.log(typeof(settings['accelerometerPeriod']));

    $("#accelerometer-range-slider").ionRangeSlider({
    min: 0.1,
    max: 25.5,
    from: settings['accelerometerPeriod'],
    step: 0.1
    });

    $("#weather-range-slider").ionRangeSlider({
    min: 0.1,
    max: 25.5,
    from: settings['weatherPeriod'],
    step: 0.1
    });

    $("#light-range-slider").ionRangeSlider({
    min: 0.1,
    max: 25.5,
    from: settings['lightPeriod'],
    step: 0.1
    });

    $('#checkbox-accelerometer').prop('checked', settings['accelerometerOn']);
    $('#checkbox-weather').prop('checked', settings['weatherOn']);
    $('#checkbox-light').prop('checked', settings['lightOn']);




});