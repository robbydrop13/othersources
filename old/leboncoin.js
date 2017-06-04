const leboncoin = require('leboncoin-api');
const async = require('async');
const mongodb = require('mongodb');


const uri = 'mongodb://selogerAdmin:seloger@ds153715.mlab.com:53715/seloger';

var appartList = [];
var categories = ["ventes_immobilieres","locations"];
var locations = ["paris","bordeaux","lyon"];

var today = new Date();

function loadNewApparts() {
    mongodb.MongoClient.connect(uri, function(err, db) {
                  
        if(err) throw err;

        var appartsCol = db.collection('apparts');
        
        appartsCol.distinct("id", function(err, appartMainIds) {
            if(err) throw err;

            appartList = appartMainIds;
            for (var i=0; i < locations.length; i++) {
                for (var j=0; j< categories.length; j++) { 
                    delaySearchs(i, j, categories[j], locations[i]);  
                }
            }

        });
        
        db.close(function (err) {
            if(err) throw err;
        });
    });
}

function delaySearchs (i, j, category, location) {
    setTimeout (function() {
        console.log("1. Processing " + category + " - " + location);
        searchApparts(category, location);
    }, (i + 4*j) * 1000);
} 

function searchApparts(category, location, callback) {
    var search = new leboncoin.Search()
    .setPage(1)
    .setFilter(leboncoin.FILTERS.PARTICULIER) // leboncoin.FILTERS.PARTICULIER, leboncoin.FILTERS.PROFESSIONNELS
    .setCategory(category) // ventes_immobilières, locations
    .setLocation(location); // paris, bordeaux, lyon
    
    search.run().then(function (data) {
        console.log("2. Fetching " + category + " - " + location + ".");
        getAppartsDetails(data.results, category, location);
    }, function (err) {
        console.error(err);
    });
    
}

function getAppartsDetails(results, category, location) {
    var apparts = [];
    // Filter to keep only today's new results.
    // For date condition, no need to check month (only day) because we get just page 1.
    // For new results, condition is based on lbc id, but I might need to use mainId concatenation.
    
    results = results.filter(function(result){ return result.date.getDate() == today.getDate() && !appartList.includes(result.id); });

    async.eachSeries(results, 
        function (result, callback) {
            // setTimeout(function() {
            result.getDetails().then(function (details) {

                var mainId = details.zip.toString() + details.price.toString() + (details.surface ? details.surface.toString():1); 
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
                appart.transactionType = category == "locations" ? 1 : 2;
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
                    var images = details.images.map(function (img) { return img.replace("//","http://"); });
                    appart.stdPhotos = images;
                    appart.bigPhotos = images.map(function (img) { return img.replace("image", "large"); });
                    appart.thbPhotos = images.map(function (img) { return img.replace("image", "thumb"); });
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
            }, function (err) {
                console.log("bob");
                console.error(err);
            });
            // },10000);

        }, 
        function(err) {

            if (err) {
                console.log(err);
            }

            mongodb.MongoClient.connect(uri, function(err, db) {
              
                if(err) console.log(err);

                var appartsCol = db.collection('apparts');
                if (apparts.length !== 0) {
                    appartsCol.insert(apparts, function(err) {
                        if(err) console.log(err);
                        console.log("3. " + apparts.length + " apparts loaded in MongoDB " + category + " - " + location + ".");
                    });
                } else {
                    console.log("3. No apparts to load for " + category + " - " + location + ".");
                }

                db.close(function (err) {
                    if(err) console.log(err);
                });
            });
        });
}


//searchApparts("locations","paris");
loadNewApparts();

// voir si je prends les pages 2, 3, 4, ...
// voir si je clean le creation date qui n'a pas le même format que dans seloger avec le script python

// catch and retry en cas d'erreur (node:12019) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1): Error: getaddrinfo ENOTFOUND www.leboncoin.fr www.leboncoin.fr:80
// idem Cannot read property 'trim' of null

// attention pour tester j'ai mis une erreur ligne 56 dans item.js