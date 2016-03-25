var request = require('supertest');
var fs = require('fs');
var http = require('follow-redirects').http;
var app = require('./../app');
var config = require('config');

before(function() {
  process.env.NODE_ENV = 'test';
});

describe('Basic tests', function() {

	it('App runs and / returns 200', function(done) {
		request(app)
			.get('/')
			.expect('Content-Type',/html/)
			.expect(200, done)
	});
	
	it('The configured endpoint returns 200 and JSON SPARQL results', function(done) {
		request(app)
			.get('/tables/test') 
			.set('Accept', 'application/sparql-results+json')
			.expect(200)
			.expect('Content-Type', /json/, done);
	});
	it('The configured endpoint returns 200 and CSV results', function(done) {
		request(app)
			.get('/tables/test') 
			.set('Accept', 'text/csv')
			.expect(200)
			.expect('Content-Type', /csv/, done);
	});
	it('The configured endpoint has data loaded', function(done) {
		request(app)
			.get('/tables/test') 
			.set('Accept', 'application/sparql-results+json')
			.expect(200)
			.expect(function(response) {
				if (response.body.results.bindings.length > 0) {
					return "Response has results."; }
				else {
					throw new Error("No result from the endpoint.");
				}
			})
			.end(function (error) {
			if (error) return done(error);
			done();
			});
	});
	it('POST typically designed to brew coffee is ineffective.', function(done) {
		request(app)
			.post('/')
			.set('Content-Type','application/coffee-pot-command')
			.expect(418, done)
	});
}); 
describe('GET results from canned queries', function() {
	it('/random/random returns 404', function(done) {
		request(app)
			.get('/random/random') 
			.expect(404, done);
	});
	it('/tables/random returns 404', function(done) {
		request(app)
			.get('/tables/random') 
			.expect(404, done);
	});
	it('/tables/test.csv returns text/csv results', function(done) {
		request(app)
			.get('/tables/test.csv')
			.expect('Content-Type', /text\/csv/) 
			.expect(200, done);
	});
	it('/graphs/test.rdf returns application/rdf+xml or XML results.', function(done) {
		request(app)
			.get('/graphs/test.rdf')
			.expect('Content-Type', /(\/xml|rdf\+xml)/) 
			.expect(200, done);
	});
	it('/tables/test.xxx returns 400', function(done) {
		request(app)
			.get('/tables/test.xxx')
			.expect(400, done);
	});
}); 

describe('GET results from canned queries, populating query variables', function() {
	it('/tables/test?$o="dgfr" returns 200 and single result', function(done) {
		request(app)
			.get('/tables/test?$o="dgfr"')
			.expect(function(response) {
				if (response.body.results.bindings.length == 1 &&
					response.body.results.bindings[0].s.value == "http://colin.maudry.com/ontologies/dgfr#" &&
					response.body.results.bindings[0].p.value == "http://purl.org/vocab/vann/preferredNamespacePrefix") {
					return "Variable successfully replaced."; }
				else {
					throw new Error("Variable not applied successfully.");
				}
			})
			.expect(200, done);
	});
	it('/tables/test2?$under_score="dgfr" returns 200 and single result', function(done) {
		request(app)
			.get('/tables/test2?$under_score="dgfr"')
			.expect(function(response) {
				if (response.body.results.bindings.length == 1 &&
					response.body.results.bindings[0].s.value == "http://colin.maudry.com/ontologies/dgfr#" &&
					response.body.results.bindings[0].p.value == "http://purl.org/vocab/vann/preferredNamespacePrefix") {
					return "Variable successfully replaced."; }
				else {
					throw new Error("Variable not applied successfully.");
				}
			})
			.expect(200, done);
	});
	it('Longer variable names are not replaced (?o replaced, not ?obelix)', function(done) {
		request(app)
			.get('/tables/test3?$o="dgfr"')
			.expect(function(response) {
				if (response.body.results.bindings.length == 1 &&
					response.body.results.bindings[0].obelix.value == "http://colin.maudry.com/ontologies/dgfr#" &&
					response.body.results.bindings[0].p.value == "http://purl.org/vocab/vann/preferredNamespacePrefix") {
					return "Variable successfully replaced."; }
				else {
					console.log(JSON.stringify(response.body));

					throw new Error("Longer variable was affected.");
				}
			})
			.expect(200, done);
	});
	it('Populated variables that are present in the SELECT clause are removed (no subquery support).', function(done) {
		request(app)
			.get('/tables/test4?$o="dgfr"')
			.expect(function(response) {
				if (response.body.results.bindings.length == 1 &&
					response.body.results.bindings[0].o == undefined &&
					response.body.results.bindings[0].p.value == "http://purl.org/vocab/vann/preferredNamespacePrefix") {
					return "Variable successfully replaced."; }
				else {
					console.log(JSON.stringify(response.body));

					throw new Error("Longer variable was affected.");
				}
			})
			.expect(200, done);
	});
}); 

describe('GET results from UPDATE canned queries, with basic auth', function() {
	it('/update/test returns 200', function(done) {
		request(app)
			.get('/update/test')
			.auth('user','password')
			.expect(200, done);
	});
	it('/update/toast returns 404', function(done) {
		request(app)
			.get('/update/toast')
			.auth('user','password')
			.expect(404, done);
	});
	it('/update/test without crendentials returns 401', function(done) {
		request(app)
			.get('/update/test')
			.expect(401, done);
	});
}); 

describe('Create, modify or delete canned queries, with basic auth', function() {
	this.timeout(4000);
	it('POST a query update via data', function(done) {
		request(app)
			.post('/tables/test')
			.auth('user','password')			
			.send('select * where {?s ?p ?o} limit 1')
			.expect(200, done);
	});
	it('POST a new query via data', function(done) {
		request(app)
			.post('/tables/new')
			.auth('user','password')
			.send('select * where {?s ?p ?o} limit 1')
			.expect(201, done);
	});
	it('...and the POSTed query works', function(done) {
		request(app)
			.get('/tables/new')
			.set('Accept', 'application/sparql-results+json')
			.expect(200)
			.expect('Content-Type', /json/, done);
	});
	it('An invalid query is rejected and not created.', function(done) {
		request(app)
			.post('/tables/new-with-error')
			.auth('user','password')
			.send('zelect * where {?s ?p ?o} limit 1')
			.expect(400, done);
	});
	it('An empty query is rejected and not created.', function(done) {
		request(app)
			.post('/tables/new-with-error')
			.auth('user','password')
			.send('')
			.expect(400, done);
	});
	it('POSTing a too big query returns a 413 Request too large.', function(done) {
		var bigQuery = "{select * where {?s ?p ?o} limit 1'}";
		while (bigQuery.length < config.get('app.maxQueryLength')) {
			bigQuery += ",{select * where {?s ?p ?o} limit 1'}";
		} 
		request(app)
			.post('/tables/new')
			.auth('user','password')
			.send(bigQuery)
			.expect(413, done);
	});
	it('DELETE the new query, with credentials.', function(done) {
		request(app)
			.delete('/tables/new')
			.auth('user','password')
			.expect(200, done);
	});
	it('The DELETEd new query is gone.', function(done) {
		request(app)
			.get('/tables/new')
			.expect(404, done);
	});
	it('DELETE an inexistent query returns 404.', function(done) {
		request(app)
			.delete('/tables/random')
			.auth('user','password')
			.expect(404, done);
	});

}); 

//Only test authentication if it's on
describe('Authentication', function() {
	it('DELETE a query with no credentials returns 401.', function(done) {
		request(app)
			.delete('/tables/test')
			.expect(401, done);
	});
	it('DELETE a query with good username but no password returns 401.', function(done) {
		request(app)
			.delete('/tables/test')
			.auth('user','')
			.expect(401, done);
	});
	it('DELETE a query with no username and good password returns 401.', function(done) {
		request(app)
			.delete('/tables/test')
			.auth('','password')
			.expect(401, done);
	});
	it('POST a new query with no credentials returns 401.', function(done) {
		request(app)
			.post('/tables/new')
			.send('select * where {?s ?p ?o} limit 1')
			.expect(401, done);
	});

});

describe('POST and GET queries in passthrough mode', function() {
	this.timeout(4000);
	it('GET queries to /sparql are passed through', function(done) {
		request(app)
			.get('/sparql?query=select%20*%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D%20limit%201')
			.expect(200)
			.expect('Content-Type', /xml|json|csv/, done)

	});
	it('GET queries to /query are 301 redirected to /sparql', function(done) {
		request(app)
			.get('/query?query=select%20*%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D%20limit%201')
			.expect('Location', '/sparql?query=select * where {?s ?p ?o} limit 1')
			.expect(301, done)
	});
	it('GET malformed queries to /sparql returns 400', function(done) {
		request(app)
			.get('/sparql?query=zelect%20*%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D%20limit%201')
			.expect(400, done);
	});
	it('POST queries to /sparql are passed through to the endpoint.', function(done) {
		request(app)
			.post('/sparql')
			.send('select * where {?s ?p ?o} limit 1')
			.expect(200)
			.expect('Content-Type', /xml|json|csv/, done);
	});
	it('POST queries to /query are 301 redirected to /sparql', function(done) {
		request(app)
			.post('/query')
			.send('select * where {?s ?p ?o} limit 1')
			.expect('Location', '/sparql')
			.expect(301, done)
	});
	it('POST malformed queries to /sparql returns 400', function(done) {
		request(app)
			.post('/sparql')
			.send('zelect * where {?s ?p ?o} limit 1')
			.expect(400, done);
	});
});



