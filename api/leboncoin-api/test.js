const leboncoin = require('./lib/item');
const search = require('./lib/search');

new search.Search()
	.setPage(1)
    .setQuery("renove")
    .run().then(function (data) {
	data.results[0].getDetails().then(function (details) {
        console.log(details); // the item 0 with more data such as description, all images, author, ...
    }, function (err) {
        console.error(err);
    });         
}, function (err) {
                done(err);
});

/*var item = leboncoin.Item({id: '903589901'});
item.getPhoneNumber().then(function (number) {
	console.log(number);
}, function (error) {
	console.error(error);
})
*/