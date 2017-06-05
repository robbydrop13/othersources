module.exports = {
  uri: function() {
    return 'mongodb://selogerAdmin:seloger@ds153715.mlab.com:53715/seloger';  
  },
  setup: function() {
    return {
      leboncoin: {
        "categories":["ventes_immobilieres", "locations"], 
        "locations": ["paris", "bordeaux", "lyon"]
      },
      pap: {
        "categories":["vente","location"], 
        "locations": ["paris-75-g439","bordeaux-33-g43588","lyon-69-g43590"],
        "types": ["appartements", "maisons"]
      }
    };
  },
  proxy: function() {
    return "http://51.15.66.2:3128";
  },
  userAgent: function() {
    return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36";
  }
};