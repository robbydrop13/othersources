const leboncoin = require('./api/leboncoin-api');
const pap = require('./api/pap-api');
const mongodb = require('mongodb');
const _ = require('underscore');
const async = require('async');
const deasync = require('deasync');
const mongoURL = require('./config.js').uri();

// Set up
var today = new Date();
var appartList = getCurrentApparts();
var apiSource = "";

// Generic functions
function getCurrentApparts() {
  var currentApparts;
  mongodb.MongoClient.connect(mongoURL, function(err, db) {

    if (err) throw err;

    var appartsCol = db.collection('apparts');

    appartsCol.distinct("id", function(err, appartIds) {
      if (err) throw err;
      currentApparts = appartIds;
    });

    db.close(function(err) {
      if (err) throw err;
    });
  });

  while (currentApparts === undefined) {
    deasync.runLoopOnce();
  }
  return currentApparts;
}

function cartesianProductOf() {
  return _.reduce(arguments, function(a, b) {
    return _.flatten(_.map(a, function(x) {
      return _.map(b, function(y) {
        return x.concat([y]);
      });
    }), true);
  }, [
    []
  ]);
}

function getNewApparts(source, setup) {
  apiSource = source;
  var setupKeys = Object.keys(setup);
  var setupValues = Object.keys(setup).map(function(key) {
    return setup[key];
  });

  cartesianProductOf(...setupValues).forEach(function(elem, index) {
    delaySearchs(elem, index);
  });
}

function delaySearchs(elements, index) {
  setTimeout(function() {
    console.log("1. Processing " + elements);
    searchApparts(elements);
  }, (index) * 2000);
}

function searchApparts(elements, callback) {
  var search;
  switch (apiSource) {
    case "leboncoin":
      search = new leboncoin.Search()
        .setPage(1)
        .setFilter(leboncoin.FILTERS.PARTICULIER) // leboncoin.FILTERS.PARTICULIER, leboncoin.FILTERS.PROFESSIONNELS
        .setCategory(elements[0]) // ventes_immobilières, locations
        .setLocation(elements[1]); // paris, bordeaux, lyon
      break;
    case "pap":
      search = new pap.Search()
        .setPage(1)
        .setCategory(elements[0]) // ventes_immobilières, locations
        .setLocation(elements[1]) // paris, bordeaux, lyon
        .setType(elements[2]); // maisons, appartements
      break;
  }

  search.run().then(function(data) {
    console.log("2. Fetching " + elements);
    switch (apiSource) {
      case "leboncoin":
        getLbcApparts(data.results, elements);
        break;
      case "pap":
        getPapApparts(data.results, elements);
        break;
    }
  }, function(err) {
    console.error(err);
  });

}

function loadApparts(apparts, elements) {
  mongodb.MongoClient.connect(mongoURL, function(err, db) {

    if (err) console.log(err);

    var appartsCol = db.collection('apparts');
    if (apparts.length !== 0) {
      appartsCol.insert(apparts, function(err) {
        if (err) console.log(err);
        console.log("3. " + apparts.length + " apparts loaded in MongoDB " + elements);
      });
    } else {
      console.log("3. No apparts to load for " + elements);
    }

    db.close(function(err) {
      if (err) console.log(err);
    });
  });
}

function filterApparts(apparts) {
  // Filter to keep only today's new results.
  // For date condition, no need to check month (only day) because we get just page 1.
  // For new results, condition is based on lbc id, but I might need to use mainId concatenation.

  apparts = apparts.filter(function(result) {
    return result.date.getDate() == today.getDate() && !appartList.includes(result.id);
  });

  return apparts;
}


// Get apparts functions for each API
function getLbcApparts(results, elements) {
  var apparts = [];
  results = filterApparts(results);

  async.eachSeries(results,
    function(result, callback) {
      result.getDetails().then(function(details) {

        var mainId = details.zip.toString() + details.price.toString() + (details.surface ? details.surface.toString() : 1);
        var typeString = details['type de bien'] ? details['type de bien'] : "";
        var type = 16; // 16 n'existe pas dans l'api seloger mais correspondra à autre...

        switch (typeString) {
          case "Appartement":
            type = 1;
            break;
          case "Maison":
            type = 2;
            break;
          case "Parking":
            type = 3;
            break;
        }

        var appart = {};

        appart.created_at = new Date();
        appart.batch = "";
        appart.mainId = mainId;
        appart.id = details.id ? details.id : "";
        appart.transactionType = elements[0] == "locations" ? 1 : 2;
        appart.type = type;
        appart.creationDate = details.date ? details.date : "";
        appart.title = details.title ? details.title : "";
        appart.label = "";
        appart.description = details.description ? details.description : "";
        appart.price = details.price ? details.price : "";
        appart.rooms = details.rooms ? details.rooms : "";
        appart.bedrooms = -1;
        appart.surface = details.surface ? details.surface : "";
        appart.pm = Math.ceil(details.price / details.surface);
        appart.metro = "";
        appart.arrondissement = details.zip ? details.zip : "";
        appart.city = details.city ? details.city : "";
        appart.country = "France";
        appart.parking = details.parking ? details.parking : "";
        appart.box = details.box ? details.box : "";
        appart.terrasse = details.terrasse ? details.terrasse : "";

        var nbPictures = details.images[0] ? details.images.length : 0;
        appart.nbPictures = nbPictures;

        if (details.images[0] && nbPictures > 0) {
          var images = details.images.map(function(img) {
            return img.replace("//", "http://");
          });
          appart.stdPhotos = images;
          appart.bigPhotos = images.map(function(img) {
            return img.replace("image", "large");
          });
          appart.thbPhotos = images.map(function(img) {
            return img.replace("image", "thumb");
          });
        } else {
          appart.stdPhotos = [];
          appart.bigPhotos = [];
          appart.thbPhotos = [];
        }

        appart.link = details.link ? details.link : "";
        appart.source = "leboncoin";

        appart.typeString = typeString;
        appart.ges = details.ges ? details.ges : "";

        apparts.push(appart);

        callback(null);
      }, function(err) {
        console.log("bob");
        console.error(err);
      });

    },
    function(err) {

      if (err) {
        console.log(err);
      }

      loadApparts(apparts, elements);

    });
}

function getPapApparts(results, elements) {
  var apparts = [];
  results = filterApparts(results);

  async.eachSeries(results,
    function(result, callback) {
      result.getDetails().then(function(details) {

        var mainId = details.location.toString() + details.price.toString() + (details.surface ? details.surface.toString() : 1);
        var typeString = details.type;
        var type = 16; // 16 n'existe pas dans l'api seloger mais correspondra à autre...

        switch (typeString) {
          case "appartements":
            type = 1;
            break;
          case "maisons":
            type = 2;
            break;
        }

        var appart = {};

        appart.created_at = new Date();
        appart.batch = "";
        appart.mainId = mainId;
        appart.id = details.id ? details.id : "";
        appart.transactionType = elements[0] == "location" ? 1 : 2;
        appart.type = type;
        appart.creationDate = details.date ? details.date : "";
        appart.title = details.title ? details.title : "";
        appart.label = "";
        appart.description = details.description ? details.description : "";
        appart.price = details.price ? details.price : "";
        appart.rooms = details.rooms ? details.rooms : "";
        appart.bedrooms = details.bedrooms ? details.bedrooms : -1;
        appart.surface = details.surface ? details.surface : "";
        appart.pm = Math.ceil(details.price / details.surface);
        appart.metro = details.metro ? details.metro : "";
        appart.arrondissement = details.location ? details.location : "";
        appart.city = details.city ? details.city : "";
        appart.country = "France";
        appart.parking = details.parking ? details.parking : "";
        appart.box = details.box ? details.box : "";
        appart.terrasse = details.terrasse ? details.terrasse : "";

        var nbPictures = details.images[0] ? details.images.length : 0;
        appart.nbPictures = nbPictures;

        if (details.images[0] && nbPictures > 0) {
          var images = details.images;
          appart.stdPhotos = images;
          appart.bigPhotos = images;
          appart.thbPhotos = images;
        } else {
          appart.stdPhotos = [];
          appart.bigPhotos = [];
          appart.thbPhotos = [];
        }

        appart.link = details.link ? details.link : "";
        appart.source = "pap";

        appart.typeString = typeString;
        appart.ges = details.ges ? details.ges : "";

        apparts.push(appart);

        callback(null);
      }, function(err) {
        console.log("bob");
        console.error(err);
      });

    },
    function(err) {

      if (err) {
        console.log(err);
      }

      loadApparts(apparts, elements);
    });
}

module.exports.getNewApparts = getNewApparts;