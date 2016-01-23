# OmntiTestr-Crawler

Crawls a given webpage using a depth-limited search to create an output of what network calls are made on each webpage from a given start URL.

This crawler can handle authenticated websites and is capable of creating new logins for testing.

![Example Output](https://raw.githubusercontent.com/OmniTestr/OmntiTestr-Crawler/master/demo.jpg)

## Installation
Install PhantomJS 1.9.2: https://code.google.com/p/phantomjs/downloads/list
```bash
# Unzip the directory, move it into your path
mv bin/phantomjs /usr/local/bin
phantomjs --version
```

Install CasperJS: http://docs.casperjs.org/en/latest/installation.html

Install node modules:
```node
npm install
```

## Usage
Create a configuration file in `configs/`. These detail the URL for the crawler to start with, along with authentication-related data that is used if logins or registrations are needed.

A sample config looks like this:
```json
{
	"url": "https://news.ycombinator.com/",
	"auth": {
		"login": "https://news.ycombinator.com/login", 
		"registration": "https://news.ycombinator.com/login",
		"accounts": [
			{
				"login": "USERNAME",
				"password": "PASSWORD"
			}
		]
	}
}
```
The accounts are optional; if you don't provide an account, it will attempt to register an account randomly, but this may fail if captchas are used by the site.

```node
node link_follower.js configs/ycombinator.json
```
