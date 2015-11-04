'use strict';

const Binbase = require('../models/binbase');
const BinbaseOrg = require('../models/binbaseOrg');

const _ = require('lodash');
//_.mixin({
//  'inspect': function(value) {
//    return require('circular-json').stringify(value);
//  }
//});


/** looks up and returns data for given bin (6 digit credit card prefix) */
function fetch(bin) {
  return Binbase.findOne({bin: bin}).populate('orgRef');
}



//todo figure out how to leverage kraken config with arbitrary entry point
const databaseConfig = { "host": "localhost", "database": "seedprotokraken" };
const db = require('../lib/database');
db.config(databaseConfig);

// to run:
// uncomment commands below and run:
// $ node lib/binbaseService.js data/bins_iso_8_9.csv

//importData();
reimportData()
//updateRegulatedBanks()


function importData() {

  var Transform = require('stream').Transform;
  var csv = require('csv-streamify');
  var csvToJson = csv({objectMode: true, delimiter: ';', newline: '\r\n'});

  var JSONStream = require('JSONStream');
  var jsonToStrings = JSONStream.stringify(false);

  var toBinbase = new Transform({objectMode: true});
  toBinbase._transform = function(data, encoding, done) {
    var obj = {
      bin: data[0]
      , cardBrand: data[1]
      , issuingOrg: data[2]
      , cardType: data[3]
      , cardCategory: data[4]
      , countryIso: data[6]
      , orgWebsite: data[9]
      , orgPhone: data[10]
    };
    handleSave(obj, toBinbase, done);
  };

  var filename = process.argv[2] || 'data/test.csv';
  console.log('filename: ' + filename);

  var fs = require('fs');
  var inStream = fs.createReadStream(filename);
  var outStream = fs.createWriteStream('data/import.log');

  inStream
    .pipe(csvToJson)
    .pipe(toBinbase)
    .pipe(jsonToStrings)
    .pipe(outStream);
//    .pipe(process.stdout);

}

function handleSave(data, stream, done) {
  var savedOrg;
  var binbase = new Binbase(data);
//  console.log('binbase: ' + binbase); //.inspect());
  BinbaseOrg.findOne({name: data.issuingOrg}).exec()
    .then(function(org) {
//      console.log('found org:' + org);
      if (!org) {
        var orgData = {
          name: data.issuingOrg
          , countryIso: data.countryIso
          , website: data.orgWebsite
          , phone: data.orgPhone
        };
        return BinbaseOrg.create(orgData)
      } else {
        return org
      }
    })
    .then(function(org) {
//      console.log('saved org:' + org ? org.inspect : org);
      savedOrg = org;
      binbase.orgRef = org._id;
      return binbase.save()
    })
    .then(function(result) {
      stream.push(result);
//      console.log('save result: ' + result);
      done();
    })
    .catch(function(error) {
      console.error('error saving: ' + binbase + ' - ' + error + ', stack: ' + error.stack);
      done();
    });
}



function reimportData() {
  //BinbaseOrg.remove({})
  //  .then(function() {
  //    return Binbase.remove({});
  //  })
  Binbase.remove({})
    .then(function() {
      importData();
    });
}



/** assigns isRegulated for orgs matching the contents given file */
function updateRegulatedBanks() {

  var Transform = require('stream').Transform;
  var csv = require('csv-streamify');
  var csvToJson = csv({objectMode: true, delimiter: ';', newline: '\n'});
  var JSONStream = require('JSONStream');
  var jsonToStrings = JSONStream.stringify(false);

  var bankHandler = new Transform({objectMode: true});
  bankHandler._transform = function(data, encoding, done) {
    console.log('data: ' + data);
    handleRegulatedBank(data, bankHandler, done);
  };

  var filename = process.argv[2] || 'data/regulatedbanks.txt';
  console.log('filename: ' + filename);

  var fs = require('fs');
  var inStream = fs.createReadStream(filename);
  var outStream = fs.createWriteStream('data/updatebank.log');

  inStream
    .pipe(csvToJson)
    .pipe(bankHandler)
    .pipe(jsonToStrings)
    .pipe(outStream);
//    .pipe(process.stdout);

}

function handleRegulatedBank(bankName, stream, done) {
  BinbaseOrg.findOne({name: bankName}).exec()
    .then(function(org) {
      if (org) {
        org.isRegulated = true;
        return org.save();
      } else {
        console.error("binbaseOrg not found: " + bankName);
        return org;
      }
    })
    .then(function(result) {
      stream.push('bank: ' + bankName + ' - ' + result);
      console.log('save result: ' + result);
      done();
    })
    .catch(function(error) {
      console.error('error updating bank: ' + bankName + ' - ' + error + ', stack: ' + error.stack);
      done();
    });
}

/** refreshes the Binbase data from BinbaseOrg isRegulated flag */
function denormalizeIsRegulated() {
// from mongo shell:
  //bbo = db.getCollection('binbaseorgs')
  //bb = db.getCollection('binbase)
  //bigbanks = bbo.distinct("name",{"isRegulated":true})
  //bb.update({issuingOrg:{$in:bigbanks}}, {$set:{isRegulated:true}}, {multi:true})
}

//reimportData();
//updateRegulatedBanks();


module.exports = {
  fetch: fetch
  , importData: importData
  , reimportData: reimportData
  , updateRegulatedBanks: updateRegulatedBanks
};
