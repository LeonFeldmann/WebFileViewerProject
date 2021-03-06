module.exports = function (app, validateToken, checkBodyForValidAttributes, currentDir) {
const mongoose = require('mongoose');
const Schemata = require('../../models/user');
const Document = require('../../models/document');
const User = mongoose.model('user', Schemata.User);
    

  
    // send array of all institutions of current user
    app.get('/institutions', validateToken, (req, res) => {
        console.log(res.locals.user.institutions);
        res.send({ "institutions" : res.locals.user.institutions});
    });

    // creates institution for current user
    app.post('/createInstitution', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution']), validateToken, (req, res) => {

        let query = {'_id':res.locals.user._id};
        let newInstitution = req.body.institution;
        let institutionsArray = res.locals.user.institutions;
        let insitutionIsUnique = true;
    
        institutionsArray.forEach(institution => {
            if (institution == newInstitution) {
                insitutionIsUnique = false;
            }
        });
    
        if (insitutionIsUnique) {
            institutionsArray.push(newInstitution);
            console.log("Institution: " + newInstitution + " was created");
            console.log("This is the new institutionsArray: " + institutionsArray);
            User.findOneAndUpdate(query, { institutions: institutionsArray}, {upsert:false}, function(err, doc){
                if (err) {
                    res.status(500).json({ "error": err });
                } else {
                    res.status(200).json({"Message":"Institution \"" + newInstitution + "\" created and saved successfully"});
                }
            });
        } else {
            res.status(400).json({"error": "Please enter a unique institution"});
        }
    
    });
            
    // deletes institution from current user and from all documents where it is used in
    app.post('/deleteInstitution', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution']), validateToken, (req, res) => {
              
        let query = {'_id':res.locals.user._id};
        let institutionToDelete = req.body.institution;
        let institutionsArray = res.locals.user.institutions;
        let institutionFound = false;
        let positionFound = null;
              
        for (let i = 0; i < institutionsArray.length; i++) 
        {
            //console.log("Comparing "+ institutionsArray[i] + " to " + institutionToDelete);
            if (institutionsArray[i] == institutionToDelete) {
                institutionFound = true;
                positionFound = i;
                break;
            }
        }
        // console.log(institutionFound);
        // console.log(positionFound);
        if (institutionFound && positionFound !== null) {
            institutionsArray.splice(positionFound, 1);
            console.log(institutionsArray);
            console.log(res.locals.user.institutions);
            User.findOneAndUpdate(query, { institutions: institutionsArray}, {upsert:false}, function(err, doc){
                if (err) {
                    res.status(500).json({ "error": err });
                } else {
                    // delete institution from documents
                    // get all docs with username ...
                    let userQuery = {"user": res.locals.user._id};
                    Document.find(userQuery, function(err, docs) {
                        if (err) {
                            console.log("User has no documents");
                        } else {
                            console.log(docs);
                            // get all docs with institution in array
                            docs.forEach(doc => {
                                let institutionsArray = doc.institution;
                                let institutionFound = false;
                                let positionFound = null;
                                
                                for (let i = 0; i < institutionsArray.length; i++) 
                                {
                                    //console.log("Comparing "+ institutionsArray[i] + " to " + institutionToDelete);
                                    if (institutionsArray[i] == institutionToDelete) {
                                        institutionFound = true;
                                        positionFound = i;
                                        break;
                                    }
                                }
                                if (institutionFound && positionFound !== null) {
                                    institutionsArray.splice(positionFound, 1);
                                    // replace
                                    let query = {_id : doc._id};
                                    Document.findOneAndUpdate(query, { institution: institutionsArray}, {upsert:false}, function(err, doc){
                                    if (err)
                                        console.log(err);
                                    });
                                }
                            });
                        }
                    });
                    res.status(200).json({"Message":"Institution " + institutionToDelete + " deleted successfully"});
                }
            });
        } else {
            res.status(400).json({ "error" : "Institution not existing in user"});
        }
    });
            
    // adds insitution(given by name) to document given by id
    app.post('/addInstitutionToDocument/:id', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution']), validateToken, (req, res) => {
        const { id } = req.params;
        Document.findById(id, 'institution', (err, document) => {
            if (err || document == null) {
                // console.log('Error getting document by id');
                res.status(404).json({ "error": "This id is not associated with any existing document"});
            } else {
                console.log(document);
                let institutionToAdd = req.body.institution;
                let institutionsArray = document.institution;
                let institutionFound = false;
              
                for (let i = 0; i < institutionsArray.length; i++) 
                {
                console.log("Comparing "+ institutionsArray[i] + " to " + institutionToAdd);
                    if (institutionsArray[i] == institutionToAdd) {
                        institutionFound = true;
                        break;
                    }
                }
                if (institutionFound) {
                    res.status(400).json({"error" : "Institution already existing in document"});
                } else {
                    var query = {'_id':id};
                    institutionsArray.push(institutionToAdd);
                    console.log(institutionsArray);
                    Document.findOneAndUpdate(query, { institution: institutionsArray}, {upsert:false}, function(err, doc){
                        if (err) {
                            res.status(500).json({ "error": err });
                        } else {
                            console.log(doc);
                        res.status(200).json({"Message":"Institution " + institutionToAdd + " added to document: " + id});
                        }
                    });
                }
            }
        });  
    });
            
    // deletes institution(given by name) from document given by id
    app.post('/deleteInstitutionFromDocument/:id', (req, res, next) => checkBodyForValidAttributes(req, res, next, ['institution']), validateToken, (req, res) => {
               
        const { id } = req.params;
        Document.findById(id, 'institution', (err, document) => {
            if (err) {
                // console.log('Error getting document by id');
                res.status(404).json({ "error": "This id is not associated with any existing document"});
            } else {
                console.log(document);
                let institutionToDelete = req.body.institution;
                let institutionsArray = document.institution;
                let institutionFound = false;
                let indexFound = null;
              
                for (let i = 0; i < institutionsArray.length; i++) 
                {
                    console.log("Comparing "+ institutionsArray[i] + " to " + institutionToDelete);
                    if (institutionsArray[i] == institutionToDelete) {
                        institutionFound = true;
                        indexFound = i;
                        break;
                    }
                }
                if (institutionFound && indexFound !== null) {
            
                    institutionsArray.splice(indexFound, 1);
                    var query = {'_id':id};
                    Document.findOneAndUpdate(query, { institution: institutionsArray}, {upsert:false}, function(err, doc){
                        if (err) {
                            res.status(500).json({ "error" : err });
                        } else {
                            console.log(doc);
                        res.status(200).json({ "Message" : "Institution " + institutionToDelete + " removed from document: " + id });
                        }
                    });
            
                } else {
                    res.status(400).json({ "error" : "Institution not existing in document" });
                }
            }
        });
    });


};