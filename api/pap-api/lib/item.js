const cheerio = require('cheerio');
const request = require('request');
const url = require('url');
const iconv = require('iconv-lite');
const cleanString = require('./utils').cleanString;
const config = require('../../../config.js');

const Item = function(options) {
    if (!(this instanceof Item))
        return new Item(options);

    options = options || {};

    for (var i in options) {
        if (!options.hasOwnProperty(i)) {
            continue;
        }
        this[i] = options[i];
    }
    if (this.link) {
        this.id = this.link.split('-').reverse()[0];
    }
    return this;
};

Item.prototype.getUrl = function() {
    if (this.link) {
        if (!this.link.startsWith("http")) {
            return "http://" + this.link;
        }
        return this.link;
    }
    var category = this.category;
    return "http://www.pap.fr/annonce/" + category + "-" + this.id;
};

var parseDescription = function($) {
    return $('.item-description').text();
};

var parseImages = function($) {
    // Attention ici il y a un piège : les images se chargent suite à un script, il faut pas regarder directement dans le code source en ligne mais faire .html()
    const images = [];
    $(".owl-carousel-thumbs > a > img").each(function(index, entry) {
        images.push($(entry).attr('src'));
    });

    return images;
};

var parseMeta = function($) {
    var output = {};
    $('meta').each(function(idex, elem) {
        const key = $(elem).attr('itemprop');
        const value = $(elem).attr('content');
        if (key && value) {
            output[key] = value;
        }
    });
    return output;
};

Item.prototype.getDetails = function() {
    var url = this.getUrl();
    var self = this;
    return new Promise(
        function(resolve, reject) {
            request.get({
                uri: url,
                encoding: null,
                gzip: true,
                proxy: config.proxy(),
                headers: {
                    'User-Agent': config.userAgent()
                }
            }, function(err, res, body) {
                if (err) {
                    return reject(err);
                }
                body = iconv.decode(body, 'iso-8859-1');

                const opts = {
                    normalizeWhitespace: true,
                    decodeEntities: true
                };
                const $ = cheerio.load(body, opts);

                const meta = parseMeta($);

                self.images = parseImages($);
                self.description = parseDescription($);

                resolve(self);
            });
        });
};

// Number pas encore fait.
Item.prototype.getPhoneNumber = function() {
    var self = this;
    return new Promise(
        function(resolve, reject) {
            if (!!self.phoneNumber) {
                return resolve(self.phoneNumber);
            }
            getPhoneNumberAddress(self.id).then(function(url) {
                if (!url.startsWith("http")) {
                    url = "http:" + url;
                }
                parsePhoneNumberImage(url).then(function(phoneNumber) {
                    self.phoneNumber = phoneNumber;
                    return resolve(self.phoneNumber);
                }, reject);
            }, reject);
        });
};

module.exports.Item = Item;
module.exports.parseMeta = parseMeta;
module.exports.parseImages = parseImages;
module.exports.parseDescription = parseDescription;