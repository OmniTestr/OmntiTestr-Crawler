/*
 * Opens a URL (passed as the first argument) and gathers 
 * data on all of the network requests made.
 * 
 * Usage: phantomjs resource_gather.js http://live.pennapps.com <optional cookie JSON string>
 */

var page = require('webpage').create();
var fs = require('fs');
var system = require('system');

var resources = [];

var args = system.args;

if (args.length >= 2) {

	var url = args[1];

	if(args.length >= 3) {
		var raw_cookies = args[2];
		var cookies = JSON.parse(raw_cookies);
		phantom.cookies = cookies;
	}

	page.onResourceReceived = function(response) {
		// console.log('Receive ' + JSON.stringify(response, undefined, 4));
		if (response.stage == "start") {
			resources.push(response);
		}
	};

	// page.onResourceError = function(resourceError) {
	// 	console.error(resourceError.url + ': ' + resourceError.errorString);
	// };

	page.open(url, function(status) {
		const output = {
			status: status,
			resources: resources,
			html: page.content
		};
		var file = "" + Math.floor(Math.random() * 10000);
		page.render('crawler_images/' + file + ".png");
		console.log(JSON.stringify(output, undefined, 4));
		phantom.exit();
	});
} else {
	phantom.exit(1);
}
