var cheerio = require('cheerio');
var request = require('request');
var child_process = require('child_process');
const escapeStringRegexp = require('escape-string-regexp');
var linkscrape = require('linkscrape');

var start_url = 'http://live.pennapps.com'
var domain = 'pennapps.com';
var url_queue = [start_url];
var url_data = {};

crawlUrls(function(error) {
	if (error) throw error;
	console.log(JSON.stringify(url_data, undefined, 4));
});

function crawlUrls(callback) {
	if(url_queue.length > 0) {
		var url = url_queue.shift();
		console.log('Crawling: ' + url);
		getResources(url, function(error, data) {
			if (error) throw error;
			var links = [];
			url_data[url] = {};
			linkscrape(url, data.html, function(link_data, $) {
				for(var i = 0; i < link_data.length; i++) {
					var link = link_data[i].link;
					if(link && isValidURL(link)) {
						links.push(link);
					}
				}
				
				url_data[url].url = url;
				url_data[url].links = links;
				url_data[url].resources = data.resources;
				url_data[url].status = data.resources;

				for(var i = 0; i < links.length; i++) {
					var link = links[i];
					// If the link is not in the url_data, it has not been visited
					if(url_data[link] == undefined && !url_queue.indexOf(link)) {
						// url_queue.push(link);
					}
				}

				crawlUrls(callback);
			});
		});
	} else {
		callback(null);
	}
}

function getResources(url, callback) {
	const spawn = child_process.spawn;
	const resource_gather = spawn('phantomjs', ['scripts/resource_gather.js', url]);
	var rg_output = "";

	resource_gather.stdout.on('data', (data) => {
		rg_output += "" + data;
	});

	resource_gather.on('close', (code) => {
		if(code == 0) {
			callback(null, JSON.parse(rg_output));
		} else {
			callback(new Error("Resource gather error"));
		}
	});
}

function isValidURL(url) {
	return !url.match(/^mailto:/) && url.match(new RegExp(escapeStringRegexp(domain)));
}

