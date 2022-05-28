const { MongoClient } = require('mongodb');
const { config } = require('./config');

module.exports = function()
{
    router.get('/quiz', cors(), (req, res) => {
        var name;
        if ( !req.query.name || req.query.name === undefined ) 
            name= 'test';
        else
            name = req.query.name;
        let nameReg= name.replace(/\/|\\/gi,"");
        getQuiz(res,nameReg);
    })

    router.get('/listall', cors(), (req, res) => {
            listQuizesAll(req,res);
    });
    
}

async function listQuizesAll(req,res) 
{
    try {
        const client = new MongoClient(config.mongoUri);
        await client.connect();
        const database = client1.db("qb");
        const qCollection = database.collection("questions");
        const query = { public:true };
        const options = { projection: { _id: 0, name:1, public:1, title:1  }, };
        const quizes = await qCollection.find(query,options);
        var quizArray = [];
        await quizes.forEach(function(dA) { quizArray.push({name:dA.name,title:dA.title,cat:""});} );
        res.json(quizArray);
    } 
    finally {
        await client.close();
    }

}

async function getQuiz(res,quizName) 
{
    try {
        const client = new MongoClient(config.mongoUri);
        await client.connect();
        const database = client1.db("qb");
        const qCollection = database.collection("questions");
        const query = { name: quizName.toLowerCase() };
        const options = { projection: { _id: 0 }, };
        const quiz = await qCollection.findOne(query,options);
        if (quiz == null ) 
             res.json({error:"Visaa "+quizName+" ei ole olemassa."});
        else
            res.json(quiz);
    } catch (error) {
        console.error("error:"+error);
    } 
    finally {
        await client.close();
    }
}