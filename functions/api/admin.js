const { deleteObjects, listObjects } = require('./s3');
const getDb = require('./db');


module.exports = function()
{
router.post('/edit', cors(), (req, res) => {
    console.log("Edit");
    editQuiz(res,req);
});
router.get('/delete', cors(), (req, res) => {
    console.log("Delete");
    deleteQuiz(res,req);
});
router.get('/list', cors(), (req, res) => {
    console.log("List");
    listQuizes(res,req);
});
}

async function listQuizes(res,req) {
try {
    var email;
    if ( req.user == null ) 
        throw Error("Virhe");
    email = req.user.email;

    db = await getDb();
    const userCollection = db.collection("users");
    const query = { email: email.toLowerCase() };
    const options = { projection: { _id: 0, email: 1, quiz: 1 }, };
    const user = await userCollection.findOne(query,options);
        if ( user != null ) 
            res.json({quiz:user.quiz});
        else
            throw Error("Ei visoja käyttäjällä "+email);
} catch (error) { 
    console.log(error); 
    res.json({error:error.message});
} 

}

async function deleteQuiz(res,req) {
    try {
        if ( !req.query.name || req.query.name === undefined ) 
            throw Error("Visalla ei nimeä.");
        var quizName = req.query.name.toLowerCase();

        db = await getDb();
        const questionCollection = db.collection("questions");
        const query = { name: quizName };
        const options = { projection: { _id: 0, name: 1, email: 1 }, };
        const question = await questionCollection.findOne(query,options);
        if ( question != null ) 
        {
            if ( req.user.email != question.email ) 
                throw Error(req.user.email+" ei ole visan "+quizName+" omistaja.");

            await deleteQuizFromUser(req.user.email,quizName,db);
            await questionCollection.deleteOne(query,options);
            await deleteScoreboard(db,quizName);
            await removeDir(quizName);
            let done = "Visa "+quizName+" poistettu.";
            console.log(done);
            res.json({done});
        }
         else 
        {
            throw  Error("Visaa "+quizName+" ei ole.");
        }

    } catch (error) { 
        console.log(error); 
        res.json({error:error.message});
    } 
}

async function deleteScoreboard(db, quizName)
{
    try {
        const questionCollection = db.collection("scoreboard");
        const query = { name: quizName };
        const options = { projection: { _id: 0, name: 1 }, };
        await questionCollection.deleteOne(query,options);
    } catch (err) { throw(err); }
}

async function editQuiz(res,req) {
    try {
        if ( !req.query.name || req.query.name === undefined ) 
             throw Error("Visalla ei tunnusta.");
        if ( req.query.name.length > 20 ) 
            throw Error("Liian pitkä tunnus");
        var quizName = req.query.name.toLowerCase();

        var  errorDataType = "Tietyyppi virhe";
        if ( !req.is('json') )
            throw Error(errorDataType);
    
        if ( Object.keys(req.body).length == 0  ) throw Error("Visa on tyhjä");        
        if ( ! req.body.hasOwnProperty("questions") ) throw Error(errorDataType);
        if ( ! Array.isArray(req.body.questions) ) throw Error(errorDataType);

        db = await getDb();
        const questionCollection = db.collection("questions");
        const query = { name: quizName };
        const options = { projection: { _id: 0, name: 1, email: 1 }, };
        req.body.name=quizName.toLowerCase();
        req.body.email=req.user.email;

        const questions = await questionCollection.findOne(query,options);
            if ( questions == null ) 
            {  
                await addQuizToUser(req.user.email,quizName,db);
                await questionCollection.insertOne(req.body);
                let error="Käyttäjän "+req.body.email+" Visa "+quizName+" Lisätty.";
                console.log(error);
                res.json({error});
            }   
            else {
                if ( questions.email != req.user.email ) 
                    throw Error(req.user.email+" ei ole visan "+quizName+" omistaja.");
                
                await addQuizToUser(req.user.email,quizName,db);
                await questionCollection.replaceOne(query,req.body,options);
                await removeFiles(quizName,req.body);
                let error="Visa "+quizName+" tallennettu.";
                console.log(error);
                res.json({error});
              
            }
    } catch (error) { 
        console.log(error); 
        res.json({error:error.message});
    }
}

async function removeDir(quizName)
{
    try {
    console.log("removeDir "+quizName);
    dirFiles = [];
    data= await listObjects(quizName+"/");
    data.Contents.forEach(function(d) { dirFiles.push(d.Key) } );
    if ( dirFiles.length > 0 ) 
        await deleteObjects(dirFiles);
    } catch(error) {  throw (error) }
}

async function removeFiles(quizName,body) {
try {
  dirFiles = [];
  data= await listObjects(quizName+"/");
  data.Contents.forEach(function(d) { dirFiles.push(d.Key) } );
  modFiles = [];
  body.questions.forEach(function(d) {  
      if ( d.hasOwnProperty("image")) 
        if ( d.image != "" )
            modFiles.push(quizName+"/"+d.image) } 
      );
   rFiles = []; 
    dirFiles.forEach( function(d) {
        if ( !modFiles.includes(d) )
         rFiles.push(d);
    });
    if ( rFiles.length > 0 ) 
        await deleteObjects(rFiles);
    console.log("Poistetaan : ");
    console.log(rFiles);
} catch(error) {  throw (error) }
}

async function deleteQuizFromUser(email,quizName,db)
{
    try {
    const userCollection = db.collection("users");
    const query = { email: email.toLowerCase() };
    const options = { projection: { _id: 0, email: 1, quiz: 1 }, };
    const user = await userCollection.findOne(query,options);
    if ( user != null ) 
    {
        if (Array.isArray(user.quiz))
        {
            if ( user.quiz.includes(quizName)) 
            {
                const index = user.quiz.indexOf(quizName);
                user.quiz.splice(index,1);
                await userCollection.findOneAndReplace(query,user,options);
            }
        }
    }
    } catch (error) { throw(error); }
}


async function addQuizToUser(email,quizName,db)
{
    try {
    const userCollection = db.collection("users");
    const query = { email: email.toLowerCase() };
    const options = { projection: { _id: 0, email: 1, quiz: 1 }, };
    const user = await userCollection.findOne(query,options);
    if ( user == null ) 
    {
        await userCollection.insertOne({email,quiz:[quizName]});
    } else {
        if ( !user.quiz.includes(quizName) )
        {
            if ( user.quiz.length < 5 ) 
            {
                user.quiz.push(quizName);
                await userCollection.findOneAndReplace(query,user,options);
            } 
            else {
                throw Error("Maksimimäärä visoja lisätty!");
            }
        }
        else { console.log("ei lisätty"); }
    }
    } catch (error) { throw(error); }   
}


