const leboncoin = require('../api/leboncoin-api');
var search = new leboncoin.Search()
    .setPage(1)
    //.setQuery("maison")
    .setFilter(leboncoin.FILTERS.PARTICULIER) // leboncoin.FILTERS.PARTICULIER, leboncoin.FILTERS.PROFESSIONNELS
    .setCategory("ventes_immobilieres") // ventes_immobilières, locations
    .setRegion("ile_de_france") // ile_de_france, acquitaine, rhone
    .setLocation("paris") // paris, bordeaux, lyon
    .addSearchExtra("ps", 19) // ps (prix min), pe (prix max), sqs (surface min), sqe (surface max), ros (room min), roe (room max)
 
search.setCategory("locations");

search.run().then(function (data) {
    //console.log(data.page); // the current page 
    //console.log(data.nbResult); // the number of results for this search 
    console.log(data.body); // the array of results 
    console.log(data.nbResult);
    //console.log(data.results.length);
    data.results[0].getDetails().then(function (details) {
        //console.log(details); // the item 0 with more data such as description, all images, author, ... 
    }, function (err) {
        console.error(err);
    });
    data.results[0].getPhoneNumber().then(function (phoneNumer) {
        //console.log(phoneNumer); // the phone number of the author if available 
    }, function (err) {
        console.error(err); // if the phone number is not available or not parsable (image -> string)  
    });
}, function (err) {
    console.error(err);
});

// Script node pour récupérer les annonces
// 0/ jouer avec l'api pour voir si tout fonctionne bien et comment ça marche (les différents champs / limites, ...)
// 1/ cron toutes les dix minutes pour récupérer les derniers apparts (uniquement page 1, TBC sort date desc)
// 2/ rechercher sur localisation Paris / Lyon / Bordeaux (TBC j'utilise setRegion, ou setLocation, TBD je prends tout et trie après)
// 3/ ... uniquement sur les particuliers (TBC setFilters professionnels et si intéressant, TBC je prends tout et trie après)
// 4/ ... sur location et vente immobilière
// 4bis/ ... et utiliser les searchExtra params (prix max, min, ... ? TBC car pas sur d'avoir besoin si je prends tout et fouille dans ma DB après)
// 5/ enregistrer les données dans la base mongodb, en appuyant les champs sur ceux de se loger (TBC faire le mapping variables)
// 6/ voir comment l'intégrer dans le pipeline en python. Notamment pour le batch : le communiquer entre les deux projets ? ou laisser vide et ajouter le batch sur les apaprts qui ont un batch vide et du coup rejoint le pipeline classique ? ou recréer un pipeline de 0 ?
// 7/ creuser la question des quota api, et voir sinon comment proxifier mes appels
// 8/ attention à ne pas ajouter deux fois le même appart (condition sur une combinaison de critères pour le unique id comme seloger ou unique id leboncoin pour tester)

//i img undefined??
