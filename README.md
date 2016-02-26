# SPARQL router 0.1.0b (Same as 0.1.0, but still no documentation)

#### A NodeJS/Express application to serve canned SPARQL queries to the world.

## Description

[SPARQL](https://en.wikipedia.org/wiki/SPARQL) is the query language to retrieve data from RDF triple stores. I often had the issue that fellow developers or data fanatics asked for data that was in a triple store, but they don't know SPARQL.

This module solves the issue:

1. You write the query and gives it a name (e.g. `biggest-asian-cities`)
2. You save it under /tables or /graphs, depending on the query type (SELECT, CONSTRUCT, DESCRIBE)
3. You give the URL to your fellow developer, picking the right format for their usage:
	- `http:/yourhost/tables/biggest-asian-cities.csv` for manipulations as a spreadsheet
	- `http:/yourhost/tables/biggest-asian-cities.json` as input for a Web app
	- `http:/yourhost/tables/biggest-asian-cities.xml` if they are into XML...
4. They get fresh updated results from the store every time they hit the URL!

## Features

- Exposes SPARQL queries as simple URLs, with choice of format
- A canned query is a simple `.rq` file located in `/public/tables` or `/public/graphs` depending on the query type (SELECT, CONSTRUCT, DESCRIBE)
- Besides FTP and SSH, you can POST a new canned query to /tables/{query-name} or /graphs/{query-name} (if authenticated)
- Supports content negotiation (via the `Accept` HTTP header)
- Possibility to GET or POST SPARQL queries on `/sparql`

**Demo** (to do)

**[Upcoming features](https://github.com/ColinMaudry/sparql-router/issues?q=is%3Aissue+is%3Aopen+-label%3Abug)**

**[Known issues](https://github.com/ColinMaudry/sparql-router/issues?q=is%3Aissue+is%3Aopen+label%3Abug)**

## Requirements

[NodeJS and NPM](https://nodejs.org/en/download/stable/) must be installed.

They are also available in most Linux package managers as `nodejs` and `npm`.

## Installation

With the test framework:

```bash
npm install sparql-router 
```

Without:
```bash
npm install sparql-router --production
```

## Configuration

The config file must be created as a copy of `config_template.js`, be in the same directory, and be called `config.js`

```bash
cp config_template.js config.js
```

The most important part is the endpoint configuration, where you configure the default SPARQL endpoint to be used by the queries.

- `hostname`: the address where the SPARQL endpoint is deployed. Example: `http://mydomain.com`
- `port`: the port number on which the SPARQL endpoint runs. 
- `queryPath`: this is the path used to make the full endpoint URL.
If the endpoint is `http://mydomain.com/data/sparql`, `queryPath` must be `/data/sparql`.
- `queryParameterName`: When passing a custom query to a SPARQL endpoint, you must use a URL parameter (Example: `http://mydomain.com/data/sparql?query=select%20*%20where%20%7B%3Fs%20%3Fp%20%3Fo%7D%20limit%201`). It's usally `query`, but in case your endpoint uses a different parameter name, you can change it here. 
- `headers`: an object in which you can add custom headers that will be sent with all SPARQL queries to the configured endpoint.
- `defaultAccept`: when no format is provided by the user request, these content types are returned by default

### Test

I haven't found a proper way to mock a triple store for testing purposes. As a consequence, an actual triple store, that I maintain, is used as the default triple store for tests.

This means that, with the default configuration, tests can only succeed if your computer/server is connected to Internet.

To run the tests:

```bash
npm test
```
Tests rely on [mocha](http://mochajs.org/) and 
[supertest](https://www.npmjs.com/package/supertest).

## Use it

To do

## Change log

#### 0.1.0

- Enabled canned queries
- Extension (.csv, .xml, etc.) defines the format returned by the endpoint
- Passthrough queries via `/sparql`
- Create new canned queries by HTTP POST, SSH or FTP
- Basic auth for POST and DELETE

## License

MIT license

If you use it, I really appreciate public statements such as [a tweet](https://twitter.com/intent/tweet?text=Wow%2C%20thanks%20%40CMaudry%20for%20making%20SPARQL%20router!%20https%3A%2F%2Fgithub.com%2FColinMaudry%2Fsparql-router%20%23SPARQL)!