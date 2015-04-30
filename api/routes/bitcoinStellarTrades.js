var winston = require('winston'),
  moment    = require('moment'),
  _         = require('lodash'),
  tools     = require('../utils');

function bitcoinPaysharesTrades(params, callback) {
  viewOpts = {
    skip: Number(params.since) || 0
  };

  db.view('bitcoinPaysharesTrades', 'v1', viewOpts, function(error, couchRes){
    if (error) {
      return callback ('CouchDB - ' + error);
    }

    var response = _.pluck(couchRes.rows, 'value');
    
    callback(null, response);
  });
}

module.exports = bitcoinPaysharesTrades;
