var express = require('express');
var app = express();
var fs = require('fs');
var passport = require('passport');
var Strategy = require('passport-http').BasicStrategy;

var routes = require("./lib/routes");

//My functions
eval(fs.readFileSync('config.js', encoding="utf8"));

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

//Load custom configuration file

express.static.mime.define({'application/sparql-query': ['rq']});

app.use(express.static('public'));
routes(app);

//Authenticate user
passport.use(new Strategy(
  function(username, password, cb) {
    if (username === config.user && password === config.password) {
    	return cb(null, username);
    } else {
    	return cb(null, false);
    }
    })
  );

module.exports = app;


