/*
 * Opens a URL (passed as the first argument) and gathers 
 * data on all of the network requests made.
 * 
 * phantomjs resource_gather.js http://live.pennapps.com
 */

var page = require('webpage').create();
var fs = require('fs');
var system = require('system');

var resources = [];

var args = system.args;

if (args.length == 2) {
	var url = args[1];
	page.onResourceReceived = function(response) {
		// console.log('Receive ' + JSON.stringify(response, undefined, 4));
		if (response.stage == "start") {
			resources.push(response);
		}
	};

	page.open(url, function(status) {
		const output = {
			status: status,
			resources: resources,
			html: page.content
		};
		console.log(JSON.stringify(output, undefined, 4));
		phantom.exit();
	});
} else {
	phantom.exit(1);
}
