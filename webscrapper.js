const puppeteer = require('puppeteer');
var mongo = require('mongodb');

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/mydb";

MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  console.log("Database created!");
  db.close();
});
MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  db.collection("new_crawled_links").drop(function(err, delOK) {
    if (err) throw err;
    if (delOK) console.log("Collection deleted");
    db.close();
  });
});
MongoClient.connect(url, function(err, db) {
  if (err) throw err;
  db.createCollection("new_crawled_links", function(err, res) {
    if (err) throw err;
    console.log("Collection created!");
    db.close();
  });
});
  function uniq(a) {
    var prims = {"boolean":{}, "number":{}, "string":{}}, objs = [];

    return a.filter(function(item) {
        var type = typeof item;
        if(type in prims)
            return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
        else
            return objs.indexOf(item) >= 0 ? false : objs.push(item);
    });
}
async function run() {
  const browser = await puppeteer.launch({ headless: false }); //{ headless: false }
  const page = await browser.newPage();
  var finalLinks = [];
  var checkedLinks =[];
  var externalLinks = [];
  var externalGLinks = [];
  var currentLink = null;
  var referringLinks = [];
  
  
  const responses = new Map();
	page.on('response', response => responses.set(response.url, response));
	page.on('load', () => {
	currentLink = page.url(); 
	const mainResource = responses.get(page.url());
	
	MongoClient.connect(url, function(err, db) {
	if (err) throw err;
	
		var myobj = { url: page.url(), status: mainResource.status};
			db.collection("new_crawled_links").insertOne(myobj, function(err, res) {
			if (err) throw err;
			//console.log("Document inserted");
			db.close();
			});
		});
	});
  
  
	//await page.authenticate({username:"username", password:"Password"});
    await page.goto("http://127.0.0.1:8099/pbs/home", { waitUntil: "networkidle2" });

    var links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll("a"));
		return [].map.call(anchors, a => a.href);
    });
	
	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
			var myquery = { url: page.url() };
			var newvalues = { pagelinks: finalLinks  };
			db.collection("new_crawled_links").updateOne(myquery, {$set : newvalues}, function(err, res) {
			if (err) throw err;
			db.close();
			});
	});
	
	
	/*Removing duplicates from list*/
	finalLinks = links.filter(function(elem, pos){
		return links.indexOf(elem) == pos;
	})
	/*Gather external links from list*/
	externalLinks = finalLinks.filter(function(elem){
		return elem.toString().includes("127.0.0.1:8099") == false;
	})
	/*Removing self addressed links from list*/
	finalLinks = finalLinks.filter(function(elem){
		return elem.toString().includes(page.url()) == false;
	})
	/*Removing external links from list*/
	finalLinks = finalLinks.filter(function(elem){
		return elem.toString().includes("127.0.0.1:8099");
	})
	/*Removing self referencing links from list*/
	finalLinks = finalLinks.filter(function(elem){
		return elem.toString().includes("#") == false;
	})
	
	for(let k = 0; k < finalLinks.length; k++){
		referringLinks.push([finalLinks[k],page.url()])
	};
	console.log(referringLinks);
	console.log("Printing external links")
	console.log(externalLinks.join("\n"))
	/*Initial Loop through list*/
	for (let i = 0; i < finalLinks.length; i++) {
		const url = finalLinks[i];
		
		console.log("Going to:\t" + url);
		await page.goto(`${url}`);
		checkedLinks.push(finalLinks[i]);
		
		links = await page.evaluate(() => {
			const anchors = Array.from(document.querySelectorAll("a"));
			return [].map.call(anchors, a => a.href);
		});
		for(let k = 0; k < links.length; k++){
		referringLinks.push([links[k],page.url()])
	};
		MongoClient.connect("mongodb://localhost:27017/mydb", function(err, db) {
  if (err) throw err;
   myquery = { url: page.url() };
   newvalues = { pagelinks: links };
  db.collection("new_crawled_links").updateOne(myquery, {$set : newvalues}, function(err, res) {
    if (err) throw err;
    db.close();
	});
	});
	
		console.log("No.\t" + checkedLinks.length + "\tTotal:\t" + finalLinks.length + "\tfound:\t" + links.length +  "\t" + url);
		
		/*Gather external links from list*/
		externalGLinks = links.filter(function(elem){
			return elem.toString().includes("127.0.0.1:8099") == false;
		})
		/*Removing external links from list*/
		links = links.filter(function(elem){
			return elem.toString().includes("127.0.0.1:8099");
		})
		/*Removing search links from list*/
		links = links.filter(function(elem){
			return elem.toString().includes("/pbs/search") == false;
		})
		/*Removing self referencing links from list*/
		links = links.filter(function(elem){
			return elem.toString().includes("#") == false;
		})
		/*Removing doc files links from list*/
		links = links.filter(function(elem){
			return elem.toString().includes(".doc") == false;
		})
		/*Removing zip files from list*/
		links = links.filter(function(elem){
			return elem.toString().includes(".zip") == false;
		})
		/*Removing pdf files from list*/
		links = links.filter(function(elem){
			return elem.toString().includes(".pdf") == false;
		})
		/*Removing pps files from list*/
		links = links.filter(function(elem){
			return elem.toString().includes(".pps") == false;
		})
		/*Removingcsv csv files from list*/
		links = links.filter(function(elem){
			return elem.toString().includes(".csv") == false;
		})
		/*Removing xls files from list*/
		links = links.filter(function(elem){
			return elem.toString().includes(".xls") == false;
		})
		/*Removing rtf files from list*/
		links = links.filter(function(elem){
			return elem.toString().includes(".rtf") == false;
		})
		
		finalLinks = finalLinks.concat(links);
		externalLinks = externalLinks.concat(externalGLinks);
		/*Removing duplicates from list*/
		finalLinks = uniq(finalLinks);
	}
	
	for (let l = 0; l < finalLinks.length; l++) {
		var referredList = [];
		
		for(let m = 0; m < referringLinks.length; m++){
			referredList = referringLinks.filter(function(elem){
				return elem[0].includes(finalLinks[l])
			})
		}
		
		MongoClient.connect("mongodb://localhost:27017/mydb", function(err, db) {
		if (err) throw err;
			myquery = { url: finalLinks[l] };
			newvalues = { isOn: referredList };
			db.collection("new_crawled_links").updateOne(myquery, {$set : newvalues}, function(err, res) {
			if (err) throw err;
			db.close();
			});
		});
	}
	externalLinks = uniq(externalLinks);
	
	/*Removing empty links from list*/
		externalLinks = externalLinks.filter(function(e){return e
		})
		/*Removing mailto links from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes("mailto:") == false;
		})
		/*Removing doc files links from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes(".doc") == false;
		})
		/*Removing zip files from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes(".zip") == false;
		})
		/*Removing pdf files from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes(".pdf") == false;
		})
		/*Removing xls files from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes(".xls") == false;
		})
		/*Removing rtf files from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes(".rtf") == false;
		})
		/*Removing pps files from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes(".pps") == false;
		})
		/*Removing csv files from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes(".csv") == false;
		})
		/*Removing self referencing links from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes("#") == false;
		})
		/*Removing search links from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes("/pbs/search") == false;
		})
		/*Removing search links from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes("facebook") == false;
		})
		/*Removing search links from list*/
		externalLinks = externalLinks.filter(function(elem){
			return elem.toString().includes("alpharam") == false;
		})
		console.log(referringLinks);
	console.log("Printing external links")
	console.log(externalLinks)
	console.log(externalLinks.join("\n"))

	for (let j = 0; j < externalLinks.length; j++) {
		const url2 = externalLinks[j];
		
		console.log("Going to:\t" + url2);

		
		await page.goto(`${url2}`, {timeout:18000, waitUntil: "networkidle2"  });
	}		
    browser.close();
	
}

run();