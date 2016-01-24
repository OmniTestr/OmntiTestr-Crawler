var cheerio = require('cheerio');
var request = require('request');
var child_process = require('child_process');
const escapeStringRegexp = require('escape-string-regexp');
var linkscrape = require('linkscrape');
var fs = require('fs');
var parseDomain = require("parse-domain");
var path = require('path');
var parse = require('url-parse');

if(process.argc < 3) {
	throw new Error("You must pass a config as the first argument.");
}
var config_path = process.argv[2];
var config_data = fs.readFileSync(config_path);
var config = JSON.parse(config_data);

var parsed_domain = parseDomain(config.url);
if (parsed_domain == null) {
	throw new Error("Unable to parse a domain from what you passed in as the start url ('" + config.url + "')");
}
var domain = parsed_domain.domain + '.' + parsed_domain.tld;

///// CONFIG
// Start url is at depth 0
// Farthest out url has a depth of max_depth
var max_depth = 2;
var max_links = 20;
/////

var output_file_name = 'outputs/' + path.parse(config_path).name + '.json';
var url_queue = [{ url: config.url, depth: 0 }];
var resources = {};
var visited_urls = {};
var n = 0;

getCookies(config_path, function(error, cookies) {
	if (error) throw error;
	console.log(cookies);
	console.log('Cookies Loaded.');

	crawlUrls(cookies, function(error) {
		if (error) throw error;
		var data = JSON.stringify(resources, undefined, 4);
		fs.writeFile(output_file_name, data, function(error) {
			if (error) throw error;
			console.log("Wrote to: " + output_file_name + '.');
		}); 
	});
});

function crawlUrls(cookies, callback) {
	if(url_queue.length > 0 && n < max_links) {
		var url_object = url_queue.shift();
		n++;
		var url = url_object.url;
		var depth = url_object.depth;
		getResources(url, cookies, function(error, data) {
			if (error) throw error;
			var links = [];
			if (data.html) {
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
						var parsed_url = parse(resource.url, true);
						resources[resource.url].protocol = parsed_url.protocol;
						resources[resource.url].query = parsed_url.query;
						resources[resource.url].hash = parsed_url.hash;
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
						if(visited_urls[link] != true && !containsKeyPair(url_queue, 'url', link) && depth < max_depth && (n + url_queue.length) < max_links) {
							url_queue.push({
								url: link, 
								depth: depth + 1 
							});
						}
					}

					console.log('Crawled: ' + url + ' at depth: ' + depth + ' (' + url_queue.length + ' links left in queue, ' + n + ' links parsed)');
					crawlUrls(cookies, callback);
				});
			} else {
				console.log('Crawled: ' + url + ' at depth: ' + depth + ' (' + url_queue.length + ' links left in queue, ' + n + ' links parsed)');
				crawlUrls(cookies, callback);
			}
		});
	} else {
		callback(null);
	}
}

function getResources(url, cookies, callback) {
	const spawn = child_process.spawn;
	var args = ['--ssl-protocol=any', 'resource_gather.js', url];
	if (cookies)
		args.push(JSON.stringify(cookies));
	const resource_gather = spawn('phantomjs', args);
	var rg_output = "";

	resource_gather.stdout.on('data', (data) => {
		if (!("" + data).match(/\*\*\* WARNING/))
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

function getCookies(config_path, callback) {
	const spawn = child_process.spawn;
	const cookie_fetch = spawn('casperjs', ['credential_grabber.js', config_path]);
	var cookie_output = "";

	cookie_fetch.stdout.on('data', (data) => {
		cookie_output += "" + data;
	});

	cookie_fetch.on('close', (code) => {
		if(code == 0) {
			var cookie_output_parsed = JSON.parse(cookie_output);
			callback(null, cookie_output_parsed.cookies);
		} else {
			console.error(cookie_output);
			callback(new Error("Cookie fetching error, code: " + code));
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

