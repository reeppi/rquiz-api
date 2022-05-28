const { MongoClient } = require('mongodb');
const { config } = require('./config');

module.exports = function()
{
    router.get('/scoreboard', cors(), (req, res) => {
        var name, scorename, score;
        if ( req.query.name === undefined || !req.query.name)
        {
             res.json({error:"Anna visan tunnus."});
             return;
        }
        name= req.query.name;
        score = req.query.score;
        var nameResult = name.replace(/\/|\\/gi,"");
        scoreboard(res,nameResult);  
        }
    );

    router.get('/addscore', cors(), (req, res) => {
        var name, scorename, score;
        if ( req.query.name === undefined || !req.query.name)
            return res.json({error:"Anna visan tunnus!"});
        name = req.query.name;

        if ( req.query.scorename === undefined || !req.query.scorename)
            return res.json({error:"Anna nimimerkkisi."});
        if ( req.query.scorename.length > 20 ) 
            return  res.json({error:"Liian pitkä nimimerkki."});
        scorename = req.query.scorename;

        if ( req.query.score === undefined || !req.query.score)
            return res.json({error:"Määrittele pistemäärä"});
        if ( req.query.score.length > 5 ) 
            return res.json({error:"Liian pitkä pistemäärä"});
    
        score = Number(req.query.score);
        let nameReg= name.replace(/\/|\\/gi,"");
        if ( req.user == null ) 
        {   
            return res.json({error:"Pistetaulu on vain kirjautuneille."});
        }
        addScore(res,nameReg,scorename,score,req.user.email); 
        }
    );
}




 async function addScore(res,quizName,name,score,email) {
    try {
        const client = new MongoClient(config.mongoUri);
        await client.connect();
        console.log("Connected!!!");
        const database = client.db("qb");
        const qCollection = database.collection("scoreboard");
        const questionCollection = database.collection("questions");
        const query = { name: quizName.toLowerCase() };
        const options = { projection: { _id: 0, name: 1,scores: 1 }, };
        const questions = await questionCollection.findOne(query,options);
        if (questions == null ) 
        {
            res.json({error:"Visaa "+quizName+" ei ole."});
        } else 
        {
            const scoreboard = await qCollection.findOne(query,options);
            if ( scoreboard == null ) 
            {  
                await qCollection.insert({name:quizName,scores:[{name,email,score}]});
                console.log("Insert done");
                res.json({score : {name,email,score}});
            }   
            else {
                var newScoreboard = Array.from(scoreboard.scores);
                newScoreboard.push({name,email,score});
                newScoreboard = newScoreboard.sort((a,b)=>(b.score - a.score));
                newScoreboard.length = Math.min(newScoreboard.length, 10);
                scoreboard.scores = newScoreboard;
                scoreUpdate = await qCollection.findOneAndReplace(query,scoreboard,options);
                console.log("Insert done");
                res.json({score : {name:name,score:score}});
            }
        }
    } finally {
        await client.close();
    }
    }
    
async function scoreboard (res,quizName) {
    try {
        const client = new MongoClient(config.mongoUri);
        await client.connect();
        console.log("Connected!!!");
        const database = client.db("qb");
        const qCollection = database.collection("scoreboard");
        const query = { name: quizName.toLowerCase()  };
        const options = { projection: { _id: 0 },};
        const scoreboard = await qCollection.findOne(query,options);
        if ( scoreboard == null )
            res.json({error:"Pistetaulua "+quizName+" ei ole olemassa"});
        else
            res.json(scoreboard);
    
    } finally {
        await client.close();
        }
    }