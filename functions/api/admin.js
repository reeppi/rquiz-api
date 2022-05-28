const { MongoClient } = require('mongodb');
const { config } = require('./config');

module.exports = function()
{

router.post('/edit', cors(), (req, res) => {
    var name;
    console.log("Muokataan");
    if ( !req.query.name || req.query.name === undefined ) 
            return res.json({error:"Visalla ei nimeä."});
    else
        name = req.query.name.toLowerCase();
    //let nameReg= name.replace(/\/|\\/gi,"");

    var  sError = "Tietyyppi virhe";

    if ( !req.is('json') )
        return res.json({error:sError});

    if ( Object.keys(req.body).length > 0  )
    {
         if ( ! req.body.hasOwnProperty("questions") ) return res.json({error:sError});
         if ( ! Array.isArray(req.body.questions) ) return res.json({error:sError});
        editQuiz(res,req,name);
    }
    else
        res.json({error:"Visa on tyhjä."});
});

router.get('/delete', cors(), (req, res) => {
    var name;
    console.log("Poistetaan");
    if ( !req.query.name || req.query.name === undefined ) 
        return res.json({error:"Visalla ei nimeä."});
    else
        name = req.query.name.toLowerCase();
 //   let nameReg= name.replace(/\/|\\/gi,"");
    deleteQuiz(res,req,name);
});

router.get('/list', cors(), (req, res) => {
    if ( req.user != null ) 
        listQuizes(res,req.user.email);
    else
        res.json({error:"List: Tuntematon virhe"});
});

}

async function listQuizes(res,email) {
try {
    const client = new MongoClient(config.mongoUri);
    await client.connect();
    const database = client.db("qb");
    const userCollection = database.collection("users");
    const query = { email: email.toLowerCase() };
    const options = { projection: { _id: 0, email: 1, quiz: 1 }, };
    const user = await userCollection.findOne(query,options);
        if ( user != null ) 
            res.json({quiz:user.quiz});
        else
            res.json({error:"Ei visoja käyttäjällä "+email});
} finally {
    await client.close();
}

}


async function deleteQuiz(res,req,quizName) {
    try {
        const client = new MongoClient(config.mongoUri);
        await client.connect();
        console.log("Connected!");
        const database = client.db("qb");
        const questionCollection = database.collection("questions");
        const query = { name: quizName.toLowerCase() };
        const options = { projection: { _id: 0, name: 1, email: 1 }, };
        const question = await questionCollection.findOne(query,options);
        if ( question != null )
        {
            if ( req.user.email == question.email )
            {
                await deleteQuizFromUser(req.user.email,quizName);
                await questionCollection.deleteOne(query,options);
                let done = "Visa "+quizName+" poistettu.";
                console.log(done);
                res.json({done});
            } else {
                let error = req.user.email+" ei ole visan "+quizName+" omistaja.";
                console.log(error);
                res.json({error});
            }
        } else 
            {
            res.json({error: "Visaa "+quizName+" ei ole."});
        }

    } finally {
        await client.close();
    }
}

async function editQuiz(res,req,quizName) {
    try {
        const client = new MongoClient(config.mongoUri);
        await client.connect();
        console.log("Connected!");
        const database = client.db("qb");
        const questionCollection = database.collection("questions");
        const query = { name: quizName.toLowerCase() };
        const options = { projection: { _id: 0, name: 1, email: 1 }, };
        req.body.name=quizName;
        req.body.email=req.user.email;

        //console.log("SIZE::"+req.get("content-length"));

        const questions = await questionCollection.findOne(query,options);
            if ( questions == null ) 
            {  
                const success = await addQuizToUser(req.user.email,quizName);
                if ( success ) 
                {
                    await questionCollection.insertOne(req.body);
                    let error="Käyttäjän "+req.body.email+" Visa "+quizName+" lisätty.";
                    console.log(error);
                    res.json({error});
                } else {
                    let error="Maksimimäärä visoja lisätty";
                    console.log(error);
                    res.json({error});
                }
            }   
            else {
                if ( questions.email == req.user.email ) {
                    await addQuizToUser(req.user.email,quizName);
                    await questionCollection.replaceOne(query,req.body,options);
                    let error="Visa "+quizName+" tallennettu.";
                    console.log(error);
                    res.json({error});
                } else 
                {
                    let error = req.user.email+" ei ole visan "+quizName+" omistaja.";
                    console.log(error);
                    res.json({error});
                }
                 
            }
    } finally {
        await client.close();
    }
}

async function deleteQuizFromUser(email,quizName)
{
    const client = new MongoClient(config.mongoUri);
    await client.connect();
    const database = client.db("qb");
    const userCollection = database.collection("users");
    const query = { email: email.toLowerCase() };
    const options = { projection: { _id: 0, email: 1, quiz: 1 }, };
    const user = await userCollection.findOne(query,options);
    if ( user != null ) 
    {
        if ( user.quiz.includes(quizName)) 
        {
            const index = user.quiz.indexOf(quizName);
            user.quiz.splice(index,1);
            await userCollection.findOneAndReplace(query,user,options);
        }
    }
}


async function addQuizToUser(email,quizName)
{
    const client = new MongoClient(config.mongoUri);
    await client.connect();
    const database = client.db("qb");
    const userCollection = database.collection("users");
    const query = { email: email.toLowerCase() };
    const options = { projection: { _id: 0, email: 1, quiz: 1 }, };
    const user = await userCollection.findOne(query,options);
    if ( user == null ) 
    {
        await userCollection.insertOne({email,quiz:[quizName]});
        return true;
    } else {
        if ( !user.quiz.includes(quizName) )
        {
            if ( user.quiz.length < 5 ) 
            {
                user.quiz.push(quizName);
                await userCollection.findOneAndReplace(query,user,options);
                return true;
            } 
            else {
                return false;
            }
        }
        else { console.log("ei lisätty"); }
    }
    return false;
}


