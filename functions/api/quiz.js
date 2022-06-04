const getDb = require('./db');

module.exports = function()
{
    router.get('/quiz', cors(), (req, res) => {
        getQuiz(res,req);
    })
    router.get('/listall', cors(), (req, res) => {
        listQuizesAll(res);
    });
}

async function listQuizesAll(res) 
{
    try {
        const db = await getDb();
        const qCollection = db.collection("questions");
        const query = { public:true };
        const options = { projection: { _id: 0, name:1, public:1, title:1  }, };
        const quizes = await qCollection.find(query,options);
        var quizArray = [];
        await quizes.forEach(function(dA) { quizArray.push({name:dA.name,title:dA.title,cat:""});} );
        res.json(quizArray);
    } catch(error) {
        console.log(error);
        res.json({error:error.message});
    }
} 

async function getQuiz(res,req) 
{
    try {
        var dialog=false;
        if ( !req.query.name || req.query.name === undefined ) 
            throw Error("Anna visan tunnus");
        quizName = req.query.name.toLowerCase();
 
        const db =  await getDb();
        const qCollection = db.collection("questions");
        const query = { name: quizName };
        const options = { projection: { _id: 0 }, };
        const quiz = await qCollection.findOne(query,options);
        if (quiz == null ) 
            {
             dialog=true;
             throw Error("Visaa "+quizName+" ei ole olemassa.");
            }
        else
            res.json(quiz);
    } catch (error) {
        console.log(error);
        res.json({error:error.message,dialog});
    } 
}