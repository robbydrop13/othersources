const cheerio = require('cheerio');
const request = require('request');
const url = require('url');
const iconv = require('iconv-lite');

const item = require('./item');
const cleanString = require('./utils').cleanString;

const userAgent = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36';

const Search = function(options) {
  if (!(this instanceof Search))
    return new Search(options);

  options = options || {};

  this.setType(options.type); // type de bien appartement, maison, garage, parking, ... possibilité d'en avoir plusieurs
  this.setCategory(options.category); // location ou vente
  this.setLocation(options.location); // paris-75-g439, bordeaux-33-g43588, lyon-69-g43590
  this.setPage(options.page); // numéro de page
};

Search.prototype.type = "appartements";
Search.prototype.category = "location";
Search.prototype.location = null;
Search.prototype.page = 1;

Search.prototype.setType = function(type) {
  if (!!type) {
    this.type = type;
  }
  return this;
};

Search.prototype.setLocation = function(location) {
  if (!!location) {
    this.location = location;
  }
  return this;
};

Search.prototype.setCategory = function(category) {
  if (!!category) {
    this.category = category;
  }
  return this;
};

Search.prototype.setPage = function(page) {
  if (parseInt(page) == page) {
    this.page = page;
  }
  return this;
};

Search.prototype.getUrl = function() {
  const hostname = "www.pap.fr";
  const protocol = "http";
  const pathname = "annonce/" + this.category + "-" + this.type + "-" + this.location + "-" + this.page;

  const escapeOld = require('querystring').escape;
  require('querystring').escape = function(value) {
    return encodeURIComponent(value).replace(/%20/g, '+');
  };
  output = url.format({
    hostname: hostname,
    protocol: protocol,
    pathname: pathname
  });
  require('querystring').escape = escapeOld;
  return output;
};

const frenchMonth = {
  'janvier': 0,
  'février': 1,
  'mars': 2,
  'avril': 3,
  'mai': 4,
  'juin': 5,
  'juillet': 6,
  'aôut': 7,
  'septembre': 8,
  'octobre': 9,
  'novembre': 10,
  'décembre': 11,
};

var parseNbResult = function($) {
  //return $('.compteur-annonces strong').text(); // pour le nombre total
  return $('.search-results-item>.box-header-favoris').length; // pour le nombre de résultats sur la page
};

var convertStringDateToDate = function(dateString) {
  const dates = dateString.split(" ");
  const date = new Date();

  date.setDate(parseInt(dates[0]));
  date.setMonth(frenchMonth[dates[1]]);
  date.setYear(parseInt(dates[2]));

  return date;
};

var parseDate = function($) {
  //return convertStringDateToDate($.find('.item_absolute > .item_supp').text().replace("Urgent", ""))
  return convertStringDateToDate($.find('.date').text().replace(/^(.*?)\/ /g, ""))
};

var parseImages = function($) {
  const images = [];
  images.push('www.pap.fr/' + $.find('.thumb').attr('href'));
  return images;
};

var parseTitle = function($) {
  return $.find('a.title-item > span.h1').text();
};

var parseLink = function($) {
  return "www.pap.fr" + $.find('.btn-details').attr('href');
};

var parseLocation = function($) {
  return parseInt($.find('.item-description > strong').text().match(/\([^\)]*\)/g, "")[0].replace(/\(|\)/g, ""));
};

var parseCity = function($) {
  return $.find('.item-description > strong').text().split(" ")[0];
};

var parseMetro = function($) {
  return $.find('.item-transports').text();
};

var parseItems = function($, regex) {
  for (i = 0; i < 3; i++) {
    var li = $.find('.item-summary > li').eq(i).text();

    if (li.match(regex)) {
      if (regex == "/Surface/g") {
        return parseInt(li.replace(/[^0-9\.]+/g, "").slice(0, -1));
      } else {
        return parseInt(li.replace(/[^0-9\.]+/g, ""));
      }
    }
  }
};

var parsePrice = function($) {
  return parseInt(cleanString($.find('.price > strong').text().replace(/\./g, '')))
};

var parseEntries = function($, category, type) {
  var output = [];


  $('.search-results-list > .search-results-item:has(>div.box-header-favoris)').each(function(index, entry) {
    var $entry = $(entry);
    var title = parseTitle($entry);
    var date = parseDate($entry);
    var images = parseImages($entry);
    var link = parseLink($entry);
    var location = parseLocation($entry);
    var city = parseCity($entry);
    var metro = parseMetro($entry);
    var rooms = parseItems($entry, /Pièce/g);
    var bedrooms = parseItems($entry, /Chambre/g);
    var surface = parseItems($entry, /Surface/g);
    var price = parsePrice($entry);

    output.push(new item.Item({
      title: title,
      category: category,
      type: type,
      link: link,
      images: images,
      location: location,
      city: city,
      metro: metro,
      rooms: rooms,
      bedrooms: bedrooms,
      surface: surface,
      price: price,
      date: date
    }));
  });

  return output;
};

Search.prototype.run = function(url, category, type) {
  var self = this;
  if (url == null) {
    url = this.getUrl();
  }
  if (category == null) {
    category = this.category;
  }
  if (type == null) {
    type = this.type;
  }
  return new Promise(
    function(resolve, reject) {
      request.get({
        uri: url,
        encoding: null,
        gzip: true,
        headers: {
          'User-Agent': userAgent // optional headers
        }
      }, function(err, res, body) {
        if (err) {
          return reject(err);
        }
        // decode the encoding
        body = iconv.decode(body, 'iso-8859-1');
        const opts = {
          normalizeWhitespace: true,
          decodeEntities: true
        };
        // load the html page in cheerio
        const $ = cheerio.load(body, opts);

        const output = {
          page: self.page,
          nbResult: parseNbResult($),
          results: parseEntries($, category, type)
        };

        resolve(output);
      });
    });
}

module.exports.Search = Search;

module.exports.convertStringDateToDate = convertStringDateToDate;
module.exports.parseDate = parseDate;
module.exports.parseNbResult = parseNbResult;
module.exports.parseImages = parseImages;
module.exports.parseTitle = parseTitle;
module.exports.parseLink = parseLink;
module.exports.parseLocation = parseLocation;
module.exports.parseCity = parseCity;
module.exports.parseMetro = parseMetro;
module.exports.parseItems = parseItems;
module.exports.parsePrice = parsePrice;
module.exports.parseEntries = parseEntries;