
/*
 * Used to get login cookies for a given config.
 * Pass in the path to the config as an argument to this script.
 * An object of cookies, messages and errors will be returned via stdin.
 * The messages and errors are usually empty, but will capture errors that occur while parsing client side JS.
 * This will use an account if one is provided in the config, otherwise it will register a random new account
 * and save it in the config for future use.
 * If a cookie is not present, this script will get new ones.
 * 
 * Usage: casperjs credential_grabber.js 'configs/bonvoyage.json'
 */

var fs = require('fs');
var cookieFilename = 'login_cookies.json';
var args = require('system').args;

var errors = [];
var messages = [];

if (args.length == 5) {
	var config_path = args[4];
	var config_data = fs.read(config_path);
	var config = JSON.parse(config_data);

	var data = fs.read(cookieFilename);
	var allCookies = {};
	if(data != "")
		allCookies = JSON.parse(data);
	if (allCookies[config.url] == undefined) {
		// No cookies have been stored for this config, need to fetch them
		var casper = require('casper').create({
			pageSettings: {
				loadImages: false,//The script is much faster when this field is set to false
				loadPlugins: false,
				userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36'
			},
			// verbose: true,
			logLevel: "debug"
		});

		casper.options.clientScripts = ['lib/jquery-2.2.0.min.js'];

		casper.on('remote.message', function(message) {
			messages.push(message);
		});

		casper.on("page.error", function(error){
			errors.push(error)
		});

		casper.start();

		if(!config.auth.accounts || config.auth.accounts.length == 0) {
			// Register a random new account
			casper.thenOpen(config.auth.registration);

			casper.then(function() {
				// Generate a new account
				var account = {
					name: randomUsername(),
					password: randomPassword(),
					email: randomEmail(),
					phone: randomPhoneNumber()
				};
				config.auth.accounts = [account];
				// Register with it
				this.evaluate(submitForm, 
					{
						account: account,
						submit_regex: /(create|register|sign up)/
					});
			});

			// casper.then(function() {
			// 	this.capture('register.png');
			// });
		}

		casper.thenOpen(config.auth.login);

		casper.then(function() {
			// Login with an account
			if(config.auth.accounts.length > 0) {
				var account = config.auth.accounts[0];
				this.evaluate(submitForm, 
					{
						account: account,
						submit_regex: /(login|sign in)/
					});
			} else {
				throw new Error("Failed to create a new account via registration");
			}
		});

		casper.then(function() {
			// this.capture('login.png');

			// Store cookies after login
			allCookies[config.url] = phantom.cookies;
			fs.write(cookieFilename, JSON.stringify(allCookies, undefined, 4));

			// Store (possibly) new accounts
			fs.write(config_path, JSON.stringify(config, undefined, 4));

			sendOutput(phantom.cookies);
		});

		casper.run();
	} else {
		sendOutput(allCookies[config.url]);
		phantom.exit();
	}
} else {
	throw new Error("You must pass a path to a config file.");
}

function sendOutput(cookies) {
	const output = {
		cookies: cookies,
		messages: messages,
		errors: errors
	}
	console.log(JSON.stringify(output, undefined, 4));
}

function randomEmail() {
	return randomUsername() + '@gmail.com';
}

function randomPhoneNumber() {
	s = "";
	for (var i = 0; i < 10; i++) {
		s += randomNumber();
	}
	return s;
}

function randomNumber() {
	return Math.floor(Math.random() * 10);
}

function randomUsername() {
	var s = 'test';
	for(var i = 0; i < 6; i++) {
		s += randomNumber();
	}
	return s;
}

// From: @hajikelist at http://stackoverflow.com/questions/1497481/javascript-password-generator
function randomPassword() {
	var length = 10;
	var string = "abcdefghijklmnopqrstuvwxyz"; //to upper 
	var numeric = '0123456789';
	var punctuation = '!@#$%^&*()_+~`|}{[]\:;?><,./-=';
	var password = "";
	var character = "";
	var crunch = true;
	while (password.length < length) {
		entity1 = Math.ceil(string.length * Math.random()*Math.random());
		entity2 = Math.ceil(numeric.length * Math.random()*Math.random());
		entity3 = Math.ceil(punctuation.length * Math.random()*Math.random());
		hold = string.charAt( entity1 );
		hold = (entity1%2==0)?(hold.toUpperCase()):(hold);
		character += hold;
		character += numeric.charAt( entity2 );
		character += punctuation.charAt( entity3 );
		password = character;
	}
	return password;
}

function submitForm(account, submit_regex) {
	$("input[type=text]").each(function(_, elem) {
		// if (($(elem).attr('id') + " " + $(elem).attr('class')).toLowerCase().match(/(user)/)) {
		// 	if (account.username)
		// 		$(elem).val(account.username);
		if (($(elem).attr('id') + " " + $(elem).attr('class')).toLowerCase().match(/(first|last|full|user|name)/)) {
			if (account.name)
				$(elem).val(account.name);
		} else if (($(elem).attr('id') + " " + $(elem).attr('class')).toLowerCase().match(/(phone|number)/)) {
			if (account.phone)
				$(elem).val(account.phone);
		}
	});

	if (account.email)
		$("input[type=email]").val(account.email);
	if (account.password)
		$("input[type=password]").val(account.password);

	$("form").each(function(_, elem) {
		var val = $(elem).find('[type=submit]').val();
		var text = $(elem).find('[type=submit]').text();
		if ((val + " " + text).toLowerCase().match(submit_regex)) { 
			console.log("matched submit button: " + submit_regex);
			$(elem).submit(); 
			return false;  // Skip all other inputs
		}
	});
}

