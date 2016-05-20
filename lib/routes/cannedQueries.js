var Strategy = require('passport-http').BasicStrategy;
var functions = require('./../functions');
var bodyParser = require('body-parser');
var passport = require('passport');
var express = require('express');
var config = require('config');
var debug = require('debug');
var http = require('http');
var fs = require('fs');

var cannedQueries = express.Router();
var parseJson = bodyParser.json({ extended: false });

passport.use(new Strategy(
  function(username, password, cb) {
    if (
      config.get("app.authentication") === false ||
      (config.get("app.authentication") === true &&
      username === config.get("app.user") &&
      password === config.get("app.password"))
      )
       {
    	return cb(null, username);
    } else {
    	return cb(null, false);
    }
    })
  );

cannedQueries.route('/')
	.get(function(request,response) {
		var dirPath = "public/api/" + request.savedparams.type;
		var result = functions.getHydraTemplate("Collection",request.path);
		var siteRootUrl = functions.getSiteRootUrl();
		var queryName = "";
		var query = {};
		var sendList = function(err,files) {
			if (err) {
				response.status(500).send("Something went wrong when listing the content of the folder.");
			} else {
				for (file of files) {
					queryName = functions.stringBefore(file,'.');
					query = {
						"@id" : siteRootUrl + request.path + queryName,
						"@type" : "Query",
						"label" : queryName
					}
					result.members.push(query);
				}
				result = JSON.stringify(result,null,'\t');
				response.set('Content-Type', "application/ld+json");
				response.send(result);
			}
		};
		fs.readdir(dirPath,sendList);
});

cannedQueries.route('/:name([\\w-]+):dot(\.)?:extension(\\w+)?')
	.all(function (request,response,next) {
		var type = request.savedparams.type;
		var name = request.params.name ;
		request.sparqlFilePath = './public/api/' + type +
														'/' + name + '.rq';

		//If the URL fragment matches a query file name, go on with the request
		fs.stat(request.sparqlFilePath,function(err, stats){
			if (err && request.method != "PUT") {
				response.status(404).send(type + "/" + name + ': This query does not exist.\n');
			} else if (err && request.method === "PUT") {
				next();
			}
			else {
				request.fileExists = true;
				next();
			}
		});
	})
	.get(function(request,response) {
		var type = request.savedparams.type;
		var name = request.params.name;
		var extensions = config.get('typeByExtension.' + type);
		var filepath = request.sparqlFilePath;
		var urlParams = request.query;
		request.queryVariables = {};

		for (key in urlParams) {
			if (key.substring(0,1) === '$') {
				var variableName = '?' + key.substring(1,key.length + 1);
				request.queryVariables[variableName] = urlParams[key];
			}
		}
		functions.initializeQuery(request,response,functions.sparqlQuery);
	});

	cannedQueries.route('/:name([\\w-]+)')
		.put(passport.authenticate('basic', { session: false }),parseJson,
		function(request,response) {
			var name = request.params.name;
      var contentType = request.headers["Content-Type"];
      var type = request.savedparams.type;
      var query = "";

			if (request.body.query && request.body.endpoint) {
              if (request.body.query.length > config.get('app.maxQueryLength')) {
      					response.status(413)
      					.send("Query text over " + config.get('app.maxQueryLength') + " bytes is not allowed.\n")
      				} else {
      							request.sparqlQuery = request.body.query;
      							functions.testQuery(request,response,functions.createUpdateQuery);
      				} //end of else
			} else if (request.query.query && request.query["endpoint"]) {
              query = request.query.query;
              if (query.length > config.get('app.maxQueryLength')) {
                response.status(413)
                .send("Query text over " + config.get('app.maxQueryLength') + " bytes is not allowed.\n")
              } else {
                    request.sparqlQuery = query;
                    request.endpoint = request.query.endpoint;
                    functions.testQuery(request,response,functions.createUpdateQuery);
              } //end of else
      }
      else {
        var message = "You must pass your SPARQL query either as a JSON object, with 'Content-Type: application/json' header:\n\n"
        + "Example: {\"query\": \"select * where {?s ?p ?o} limit 10\", \"endpoint\":\"http://somedomain.net/sparql\"}\n\n"
        + "or as URL encoded parameters:\n\n"
        + "Example: " + siteRootUrl + "/api/" + type + "/" + name + "?query=" + encodeURIComponent("?select * where {?s ?p ?o} limit 10")
        + "&endpoint=" + encodeURIComponent("http://somedomain.net/sparql") + "\n";
        response.status(400)
        .send(message)
      }

		})
		.post(parseJson, function (request,response,next) {
			var type = request.savedparams.type;

			if (type === "update") {
				var name = request.params.name;
				var urlParams = request.query;
				var body = request.body;
				var rawVariables = {};
				request.queryVariables = {};

				if (Object.getOwnPropertyNames(body).length > 0) {
					rawVariables = body ;
				} else {
					rawVariables = urlParams;
				}
				for (key in rawVariables) {
					if (key.substring(0,1) === '$') {
						var variableName = '?' + key.substring(1,key.length + 1);
						request.queryVariables[variableName] = rawVariables[key];
					}
				}
				functions.initializeQuery(request,response,functions.sparqlQuery);

			} else {
				next();
			}
		})
		.delete(passport.authenticate('basic', { session: false }),
		function(request,response) {
			var name = request.params.name;
			var type = request.savedparams.type;
			var filepath = request.sparqlFilePath;

			fs.unlink(filepath, function (err) {
				if (err) {
					debug(err);
					response.status(500).send(name + ": There was an error deleting the query.\n" + err)
				} else {
					response.status(200).send(name + ": The query was deleted.\n")
				}
			});
		});

		module.exports = cannedQueries;
