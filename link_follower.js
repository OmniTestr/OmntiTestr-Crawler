var cheerio = require('cheerio');
var request = require('request');
var child_process = require('child_process');
const escapeStringRegexp = require('escape-string-regexp');
var linkscrape = require('linkscrape');
var fs = require('fs');
var parseDomain = require("parse-domain");

if(process.argc < 3) {
	throw new Error("You must pass a start URL as the first argument.");
}
var start_url = process.argv[2];
var parsed_domain = parseDomain(start_url);
if(parsed_domain == null) {
	throw new Error("Unable to parse a domain from what you passed in as the start url ('" + start_url + "')");
}
var domain = parsed_domain.domain + '.' + parsed_domain.tld;

///// CONFIG
// Start url is at depth 0
// Farthest out url has a depth of max_depth
var max_depth = 0;
var output_file_name = 'output.json';
/////

var url_queue = [{ url: start_url, depth: 0 }];
var resources = {};
var visited_urls = {};

crawlUrls(function(error) {
	if (error) throw error;
	var data = JSON.stringify(resources, undefined, 4);
	fs.writeFile(output_file_name, data, function(error) {
		if (error) throw error;
		console.log("Wrote to: " + output_file_name);
	}); 
});

function crawlUrls(callback) {
	if(url_queue.length > 0) {
		var url_object = url_queue.shift();
		var url = url_object.url;
		var depth = url_object.depth;
		console.log('Crawling: ' + url + ' at depth: ' + depth + ' (' + url_queue.length + ' links in queue)');
		getResources(url, function(error, data) {
			if (error) throw error;
			var links = [];
			linkscrape(url, data.html, function(link_data, $) {
				for(var i = 0; i < link_data.length; i++) {
					var link = link_data[i].link;
					if(link && isValidURL(link)) {
						links.push(link);
					}
				}
				
				visited_urls[url] = true;
				for(var i = 0; i < data.resources.length; i++) {
					resource = data.resources[i];
					if(resources[resource.url] == undefined)
						resources[resource.url] = {};
					resources[resource.url].content_type = resource.content_type;
					if (resources[resource.url][resource.method] == undefined)
						resources[resource.url][resource.method] = [];
					resources[resource.url][resource.method].push(url);
				}

				for(var i = 0; i < links.length; i++) {
					var link = links[i];
					// Crop off a trailing '/'
					if(link.length > 0 && link[link.length - 1] == '/')
						link = link.substring(0, link.length - 1);
					// If the link is not in the url_data, it has not been visited
					// Also enacts a depth limit here
					if(visited_urls[link] != true && !containsKeyPair(url_queue, 'url', link) && depth < max_depth) {
						url_queue.push({
							url: link, 
							depth: depth + 1 
						});
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
	const resource_gather = spawn('phantomjs', ['resource_gather.js', url]);
	var rg_output = "";

	resource_gather.stdout.on('data', (data) => {
		rg_output += "" + data;
	});

	resource_gather.on('close', (code) => {
		if(code == 0) {
			var rg_output_parsed = JSON.parse(rg_output);
			var resources = [];
			for (var i = 0; i < rg_output_parsed.resources.length; i++) {
				var raw_resource = rg_output_parsed.resources[i];
				resources.push({
					url: raw_resource.url,
					content_type: raw_resource.contentType,
					method: 'GET'
				});
			}
			rg_output_parsed.resources = resources;
			callback(null, rg_output_parsed);
		} else {
			callback(new Error("Resource gather error"));
		}
	});
}

function isValidURL(url) {
	return !url.match(/^mailto:/) && url.match(new RegExp(escapeStringRegexp(domain)));
}

// Returns true if the array contains an object with a key-value pair
function containsKeyPair(array, key, value) {
	for (var i = 0; i < array.length; i++) {
		if (array[i][key] == value)
			return true;
	}
	return false;
}

