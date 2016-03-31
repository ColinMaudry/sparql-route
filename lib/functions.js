var fs = require('fs');
var http = require('http');
var https= require('https');
var debug = require('debug');
var config = require('config');
var sparqljs = require('sparqljs');

/*
MIT License (MIT)

Copyright (c) 2016 Colin Maudry (http://colin.maudry.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
*/

module.exports.stringBefore = function(str, sep) {
 var i = str.indexOf(sep);

 if(i > 0)
  return  str.slice(0, i);
 else
  return str;     
};

module.exports.timeDiff = function(t1, t2) {
    var s = t2[0] - t1[0];
    var ms = t2[1] - t1[1];
    return (s*1e9 + ms)/1e6 + " ms";
};

module.exports.sparqlQuery = function(request,response, callback) {
	var result = "";
	var scheme = {};

 	if (request.queryVariables && Object.keys(request.queryVariables).length > 0) {
 		request = module.exports.populateCustomQueryVariables(request);
 	}

	if (config.get('endpoint.scheme') == 'https') {scheme = https} else {scheme = http};
	
	var options = module.exports.getHttpOptions(request);

	if (request.get('accept')) options.headers['Accept'] = request.get('accept');

	debug("Accept: " + request.get('accept'));

	t1 = process.hrtime();

	var req = scheme.request(options, (res) => {
	  	debug(`HEADERS: ${JSON.stringify(res.headers)}`);
		res.setEncoding('utf8');
		res.on('data', (data) => {
			result += data;
		});
		res.on('end', () => {
			t2 = process.hrtime();
			if (res.headers["content-type"]) {
				response.set('Content-Type', res.headers["content-type"]);
			}
			if (typeof callback === "function") {
				callback(res,result,response);
			}
		
			debug("Query time: " + module.exports.timeDiff(t1,t2));
			debug('No more data in response.');
		})
	});
	req.on('error', (e) => {
		console.log('Error: problem with request: ' + e.message);
		response.status(500).send('problem with request: ' + e.message + '\n');
	});
	req.write(request.queryText);
	req.end();

};

module.exports.sendQueryResults = function (res,result,response) {
	response
		.status(res.statusCode)
		.send(result);
};

module.exports.getHttpOptions = function(request) {
	var queryType = request.params.type;
	var queryPath = "";
	var method = "";
	var body = {};
	var headers = {};
	if (queryType == 'update') {
		queryPath = config.get('endpoint.updatePath') + '?'+ config.get('endpoint.updateParameterName') + '=' + encodeURIComponent(request.queryText);
		method = 'POST';
		headers['content-type'] = "application/x-www-form-urlencoded";
		headers['content-length'] = Buffer.byteLength(request.queryText);
	} else {
		queryPath = config.get('endpoint.queryPath') + '?'+ config.get('endpoint.queryParameterName') + '=' + encodeURIComponent(request.queryText);
		method = 'GET';
	}
		
	var options = {
		  hostname: config.get('endpoint.hostname'),
		  port: config.get('endpoint.port'),
		  path: queryPath,
		  method: method,
		  headers: headers,
		  body: body
	};
	return options;
};

module.exports.populateCustomQueryVariables = function(request) {

	//Replaced variables are stripped from the SELECT clause
	if (request.params.type == "tables") {
		//SPARQL query is turned into a JSON object
		request.queryText = module.exports.stripVariableFromSelectClause(request.queryVariables, request.queryText);
	}

	//Replace all occurences of variables name in query string
	for (var variableName in request.queryVariables) {
		//Escape special characters
		var variableNameRegex = new RegExp(variableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^\\w])","g");
		var variableValue = request.queryVariables[variableName];
		request.queryText = request.queryText.replace(variableNameRegex,variableValue + "$1");
	}
	return request;
};

module.exports.stripVariableFromSelectClause = function (queryVariables, queryText) {
	var SparqlParser =  sparqljs.Parser;
	var parser = new SparqlParser();
	var SparqlGenerator =  sparqljs.Generator;
	var generator = new SparqlGenerator();

	var queryObject = parser.parse(queryText);


	for (var variableName in queryVariables) {
		for (selectVariableIndex in queryObject.variables) {
			if (queryObject.variables[selectVariableIndex] == variableName) {
				queryObject.variables.splice(selectVariableIndex, 1);
			}
 			 
		}
	}

	queryText = generator.stringify(queryObject);
	return queryText;
};

module.exports.getPublicPort = function() {
	if (config.get('app.public.port') != 80 && config.get('app.public.port') != "") {
		return ":" + config.get('app.publicPort');
	} else {
		return "";
	}
};


