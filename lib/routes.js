var debug = require('debug');
var fs = require('fs');
var passport = require('passport');
var config = require('config');
var http = require('http');

//My functions
var functions = require('./functions');

module.exports = function(app) {


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
			request.queryText = query;
			functions.sparqlQuery(request, response,functions.sendQueryResults);	
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
			request.queryText = query;
			functions.sparqlQuery(request, response,functions.sendQueryResults);	
	}
   	});
	
});

app.get('/update/*',
passport.authenticate('basic', { session: false }),
function(request,response, next) {
	next();
});

app.get('/:type(tables|graphs|update)/:name([\\w-]+):dot(\.)?:extension(\\w+)?',function(request,response, next) {
	var sparqlPath = "public/" + request.params.type;
	var sparqlFiles = fs.readdirSync(sparqlPath);
	var name = request.params.name;
	var foundQuery = false;
	var pathParametersIndex = 0;
	request.queryVariables = {};

	for (key in sparqlFiles) {

		//If the URL fragment matches a query file name, return the query text
		if (functions.stringBefore(sparqlFiles[key],'.') == name) {
			fs.readFile(sparqlPath + '/' + sparqlFiles[key],'utf8', function (err, data) {
	  			if (err) {throw err} else {request.queryText = data};

	  			for (key in request.query) {

	  				if (key.substring(0,1) == '$') {
	  					var variableName = '?' + key.substring(1,key.length + 1);
	  					request.queryVariables[variableName] = request.query[key];
	  				}
	  			}

	  			if (request.params.extension) {
					var foundExtension = false;
					for (var extension in config.get('typeByExtension.' + request.params.type)) {
						if (extension == request.params.extension) {
							request.headers.accept = config.get('typeByExtension.' + request.params.type + '.' + extension);
							foundExtension = true;
						}
					}
					if (foundExtension == false) {
						var extensions = '';
						for (var i = 0; config.get('typeByExtension.' + request.params.type).length; i++) {
						extensions += config.get('typeByExtension.' + request.params.type) + " ";
					}
						response.status(400).send(request.path + ': extension "'
							+ request.params.extension + '" not valid for ' + [request.params.type] + '. Authorized extensions: '
							+ extensions + '\n');
					} else {
						functions.sparqlQuery(request, response,functions.sendQueryResults);	
					}
	  			} else {
	  				if (request.headers.accept) {

	  				} else {
	  					request.headers.accept = config.get('app.defaultAccept.' + request.params.type);
	  				}
			functions.sparqlQuery(request, response,functions.sendQueryResults);	
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

app.post('/:type(tables|graphs)/:name([\\w-]+)',
passport.authenticate('basic', { session: false }),
function(request,response) {
	var sparqlPath = "public/" + request.params.type;
	var name = request.params.name;
	var filepath = sparqlPath + '/' + name + '.rq';
	var query = '';
	var fileExists = false;

	request.on('data', function (data) {
     	 // Append data.
      	query += data;
  	});
  	
  	request.on('end', function () {
      	if (query === undefined) {
			response.status(400)
			.send("You must pass your SPARQL query as data to create or modify a query.\n")
		} else if (query.length > config.get('app.maxQueryLength')) {
			response.status(413)
			.send("Query text over " + config.get('app.maxQueryLength') + " bytes is not allowed.\n")
		} else {

			fs.stat(filepath,function(err, stats){
					if (!err) {
						fileExists = true;
					}
				});
			
			// Test the POSTed query
			var testUrl = "http://localhost:" + request.socket.localPort + "/sparql?query=" + encodeURIComponent(query);
			http.get(testUrl, (res) => {
				var result = "";
				res.on('data', (data) => {
					result += data;
				});
				res.on('end', () => {
				    if (res.statusCode == 200) {
						fs.writeFile(filepath,query,'utf8', function (err) {
							if (err) {
								debug(err);
								response.status(500).send("There was an error saving the query.\n")
							} else {
								if (fileExists === true) { 
									response.status(200)
									.send("The query /" + request.params.type + "/" + name + " was updated.\n\n" + query)
								} else {
									response.status(201)
									.send("The query /" + request.params.type + "/" + name + " was created.\n\n" + query)
								}
							}	
						});	
					} else {
						var errorText = "There was an error testing the query (HTTP code "
							+ res.statusCode + "):.\n" + result + "\n\nYour query:\n" + query; 
						debug(errorText);
						response.status(400).send(errorText);
					}
				});
	   		});	//end of http.get
		} //end of else
}); //end of request.on
});

app.delete('/:type(tables|graphs)/:name([\\w-]+)',
passport.authenticate('basic', { session: false }),
function(request,response) {
	var sparqlPath = "public/" + request.params.type;
	var name = request.params.name;
	var filepath = sparqlPath + '/' + name + '.rq';

	fs.stat(filepath,function(err, stats){
		if (err) {
			response.status(404).send(name + ": This query doesn't exist.\n")
		} else {
			fs.unlink(filepath, function (err) {
				if (err) {
					debug(err);
					response.status(500).send(name + ": There was an error deleting the query.\n" + err)
				} else {
					response.status(200).send(name + ": The query was deleted.\n")
				}
			});
		}
	});
});


app.post('/', function(request,response) {
	if (request.get('Content-Type') == "application/coffee-pot-command") {
		response.sendStatus(418).end();
	} else {
		response.sendStatus(405).end();
	}
});

app.get('/',function(request,response) {
	response.sendStatus(200).end();
});

}