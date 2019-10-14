var express     = require('express'),
    bodyParser  = require('body-parser'),
    fs          = require('fs'),
    path        = require('path'),
    passport    = require("passport"),
    mongo        = require("mongodb").MongoClient,
    LocalStrategy = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose");
var mongoose      = require("mongoose");
var User          = require("./models/user");
var Document      = require("./models/document");

var url = process.env.MONGODB_URI || "mongodb://localhost/data";
mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});



var app =  express();
app.use(require("express-session")({
  secret: "Anything at all",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json({extended: true }));
const port = process.env.PORT || 3000;

passport.use(new LocalStrategy(User.authenticate()));
//reads and en/decodes the session
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());









 // send pdf matching the id
 app.get('/documentPDF/:id', (req, res) => {

    var id = req.params.id;
    Document.findById(id, "filePath", function(err, document) {
      if(err) {
        console.log("Error getting document by id");
        res.statusCode = 404;
        res.send();
      } else {
      const stream = fs.createReadStream(document.filePath);
      res.writeHead(200, {
          'Content-disposition': 'attachment; filename="' + encodeURIComponent(path.basename(document.filePath))  + '"',
          'Content-type': 'application/pdf',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET'
      });
      stream.pipe(res);
    }
    });
});

app.get("/importDocuments", (req, res) => {

var numberOfFiles;
const dir = "./newFiles";
  fs.readdir(dir, (err, files) => {
  //console.log(files.length);
   var body = "{ \"numberOfFiles\":\"" + files.length + "\"}"
   res.send(JSON.parse(body));
  });
});


// send specs of all documents
app.get("/documents", async function (req, res) {

  // promise to get all entrys from db and add them to an array, then merge to json obj
  var infoArray = await new Promise((resolve, reject) => {
    Document.find({} , (err, documents) => {
      if(err) {
        reject(err);
        console.log("Error finding documents");
      } else {
        var documentInfo = [];
        documents.map(document => {
        
        var docData = "{ \"year\" : " + document.year + ", \"month\" : " + document.month + ", \"institution\" : \"" + document.institution + "\", \"importance\" : " + document.importance + ", \"description\" : \"" + document.description + "\",\"id\" : \"" + document._id.toString() + "\"}";
        //var docData = "{ \"year\": \"" + document.year + "\",\"month\": \"" + document.month + "\",\"institution\": \"" + document.institution + "\",\"importance\": \"" + document.importance + "\",\"description\": \"" + document.description + "\",\"id\": \"" + document._id.toString() + "\"}";
        documentInfo.push(docData);

      })
    
      resolve(documentInfo);
      }
    })
  });
    // .replace(/"/g,"")
  var data = "{ \"documentInfo\": [";
  var comma = "";
  for(var i = 0; i < infoArray.length; i++) {
    if(i > 0) {
      comma = ",";
    }
    data = data + comma + infoArray[i];
  }
    data = data + "]}";

  var data = JSON.parse(data);
  //console.log(data);

  res.statusCode = 200;
  res.setHeader('Access-Control-Allow-Origin',"*");
  res.setHeader('Access-Control-Allow-Methods',"POST, GET");

  res.send(data);
  
});



// receive specifications after sending pdf and return with id
app.post('/currentDocumentData', (req, res) => {
  var year = req.body.year;
  var month = req.body.month;
  var institution = req.body.institution;
  var importance = req.body.importance;
  var description = req.body.description;
  var filePath = "./files/otherExample.pdf";

  // console.log(req.body);
  if(req.body.hasOwnProperty('year') && req.body.hasOwnProperty('month') && req.body.hasOwnProperty('institution') && req.body.hasOwnProperty('importance') && req.body.hasOwnProperty('description')){
    if(year != null && month != null && institution != "" && importance != null)
    {
      makedbEntry(year, month, institution, importance, description, filePath);
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET'
    }); 
    } else {
      res.statusCode = 400;    
    }
  } else {
    res.statusCode = 400;    
  }
 
  res.send();
});


function makedbEntry(yearvar, monthvar, institutionvar, importancevar, descriptionvar, filePathvar) {
    var doc = new Document({
      year: yearvar,
      month: monthvar,
      institution: institutionvar,
      importance: importancevar,
      description: descriptionvar,
      filePath: filePathvar
    });
   
    doc.save(function(err, document){
      if(err) {
        console.log("Error adding to DB");
      } else {
        console.log("Successfully saved doc to db");
      }
      console.log(document);
    });
}



// Getting a PDF file from the server via HTTP POST (streaming version).
//
app.get('/document', function(req, res, next) {

  const filePath = './example.pdf';
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
      'Content-disposition': 'attachment; filename="' + encodeURIComponent(path.basename(filePath))  + '"',
      'Content-type': 'application/pdf',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET'
  });
  stream.pipe(res);
});


require('./app/routes')(app, {});
app.listen(port, () => {
  console.log('The app listening on port: ' + port);
});

