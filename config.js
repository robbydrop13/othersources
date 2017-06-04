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
  }
};