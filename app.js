var express = require('express');
var app = express();
var fs = require('fs');
var http = require('follow-redirects').http;
var debug = require('debug');

express.static.mime.define({'application/sparql-query': ['rq']});

//Load custom configuration file
eval(fs.readFileSync('config.js', encoding="utf8"));

app.use(express.static('public'))





app.get('/tables/:name(\.:extension)?',function(request,response,next) {
	console.log("Has extension " + request.params.extension);
	var foundExtension = false;
	for (var extension in config.typeByExtension) {
		if (extension == request.params.extension) {
			console.log("Matched extension " + extension);
			console.log("Value " + config.typeByExtension[extension]);
			request.headers['Accept'] = config.typeByExtension[extension];
			foundExtension = true;
			next();
		}

	}
	if (foundExtension == false) {
		var extensions = '';
		for (var extension in config.typeByExtension) {
		extensions += extension + " ";
	}
		response.status(400).send(request.path + ': extension "'
			+ request.params.extension + '" not valid. Authorized extensions: '
			+ extensions + '\n');
	}
});

app.get('/query',function(request,response) {
	var query = request.query.query;
	if (query == undefined) 
		{
			response.redirect(301, '/sparql');
		} else {
			response.redirect(301, '/sparql?query=' + query);	
	}
});

app.get('/sparql',function(request,response) {
	var query = request.query.query;
	debug(query);
	if (query == undefined) 
		{
			response.status(400).send("With GET, you must pass your SPARQL query in the 'query' parameter");
		} else {
			getQuery(request, response, query);	
	}
});

app.get('/sparql',function(request,response) {
	var query = request.query.query;
	debug(query);
	if (query == undefined) 
		{
			response.status(400).send("With GET, you must pass your SPARQL query in the 'query' parameter");
		} else {
			getQuery(request, response, query);	
	}
});

app.post('/query',function(request,response) {
	response.redirect(301, '/sparql');
});

app.post('/sparql',function(request,response) {
	var query = '';

   	request.on('data', function (data) {
     	 // Append data.
      	query += data;
  	});

   	request.on('end', function () {
      	if (query == undefined) {
			response.status(400).send("With POST, you must pass your SPARQL query as data.");
		} else {
			getQuery(request, response, query);	
	}
   	});
	
});

app.get('/:type(tables|graphs)/:name(\\w+):dot(\.)?:extension(\\w+)?',function(request,response) {
	var sparqlPath = __dirname + "/public/" + request.params.type;
	var sparqlFiles = fs.readdirSync(sparqlPath);
	var name = request.params.name;
	var foundQuery = false;

	for (key in sparqlFiles) {

		//If the URL fragment matches a query file name, return the query text
		if (stringBefore(sparqlFiles[key],'.') == name) {
			fs.readFile(sparqlPath + '/' + sparqlFiles[key],'utf8', function (err, data) {
	  			if (err) throw err;
	  			if (request.params.extension) {
					var foundExtension = false;
					for (var extension in config.typeByExtension[request.params.type]) {
						if (extension == request.params.extension) {
							request.headers.accept = config.typeByExtension[request.params.type][extension];
							foundExtension = true;
						}
					}
					if (foundExtension == false) {
						var extensions = '';
						for (var i = 0; config.typeByExtension[request.params.type].length; i++) {
						extensions += config.typeByExtension[request.params.type][i] + " ";
					}
						response.status(400).send(request.path + ': extension "'
							+ request.params.extension + '" not valid for ' + [request.params.type] + '. Authorized extensions: '
							+ extensions + '\n');
					} else {
						getQuery(request, response, data);
					}
	  			} else {
	  				getQuery(request, response, data);
	  			}
			});	 
			foundQuery = true;
		}
	};
	//Otherwise, return 404
	if (foundQuery == false) {
		response.status(404).send(request.params.type + "/" + request.params.name + ': This query does not exist.\n');
	}
});

app.get('/',function(request,response) {
	response.send("Hello");
});



module.exports = app;

function stringBefore(str, sep) {
 var i = str.indexOf(sep);

 if(i > 0)
  return  str.slice(0, i);
 else
  return str;     
}

function getQuery(request,response, data) {
	var queryPath = config.endpoint.queryPath + '?'
		+ config.endpoint.queryParameterName + '=' + encodeURIComponent(data);
	var options = {
		  hostname: config.endpoint.host,
		  port: config.endpoint.port,
		  path: queryPath,
		  method: 'GET',
		  headers: {}
	};
	if (request.get('accept')) options.headers['Accept'] = request.get('accept');

	debug("Accept: " + request.get('accept'));

	var req = http.request(options, (res) => {
	  	debug(`HEADERS: ${JSON.stringify(res.headers)}`);
		res.setEncoding('utf8');
		res.on('data', (data) => {
			debug("Returned format: " + res.headers["content-type"]);
			response
			.status(res.statusCode)
			.set('Content-Type', res.headers["content-type"]).send(data);
		});
		res.on('end', () => {
		   debug('No more data in response.')
		})
	});
	req.on('error', (e) => {
		console.log('Error: problem with request: ${e.message}');
		response.status(500).send('Problem with request: ${e.message}\n');
	});
	req.end();
};
