/*
This script is used to toggle the view to chage the search mode between historical mode and bulk mode.
*/

var currentMode = "";

$('#historicalInputs').hide();
$('#bulkInputs').hide();

function switchToggle(mode) {
    switch(mode) {
        case 'historical':
            if(currentMode != 'historical') {
                $('#historicalInputs').slideDown(750);
                $('#bulkInputs').slideUp(750);
                currentMode = 'historical';
            }
            break;
        case 'bulk':
            if(currentMode != 'bulk')  {
                $('#historicalInputs').slideUp(750);
                $('#bulkInputs').slideDown(750);
                currentMode = 'bulk'
            }
            break;
        
    }
}

function toggleGraph(name) {
	$('#'+name).slideToggle();
}

function closeGraph(name) {
	$('#'+name).fadeOut();
}