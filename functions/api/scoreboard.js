const { MongoClient } = require('mongodb');
const { config } = require('./config');

module.exports = function()
{
    router.get('/scoreboard', cors(), (req, res) => {
        console.log("Scoreboard");
        scoreboard(res,req);  
        }
    );
    router.get('/addscore', cors(), (req, res) => {
        console.log("Addscore");
        addScore(res,req); 
    }
    );
}

 async function addScore(res,req) {
    try {
        client = new MongoClient(config.mongoUri);

        var quizName, name, score, email;
        if ( req.query.name === undefined || !req.query.name) throw "Anna visan tunnus";
        quizName = req.query.name.toLowerCase();

        if ( req.query.scorename === undefined || !req.query.scorename) throw "Anna nimimerkkisi";
        if ( req.query.scorename.length > 20 ) throw "Liian pitkä nimimerkki";
        name = req.query.scorename;

        if ( req.query.score === undefined || !req.query.score) throw "Määrittele pistemäärä";
        if ( req.query.score.length > 5 ) throw "Liian pitkä pistemäärä";
        score = Number(req.query.score);

        if ( req.user == null ) 
            throw "Vain kirjautuneille";

        email=req.user.email;

        await client.connect();
        const database = client.db("qb");
        const qCollection = database.collection("scoreboard");
        const questionCollection = database.collection("questions");
        const query = { name: quizName };
        const options = { projection: { _id: 0, name: 1,scores: 1 }, };
        const questions = await questionCollection.findOne(query,options);
        if (questions == null ) 
        {
            throw "Visaa "+quizName+" ei ole.";
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
    } catch (error) { 
        console.log(error); 
        res.json({error});
    } finally {
        await client.close();
    }
}
    
async function scoreboard (res,req) {
    try {
        var quizName;
        if ( req.query.name === undefined || !req.query.name)
             throw "Anna visan tunnus.";
        quizName= req.query.name.toLowerCase();
        client = new MongoClient(config.mongoUri);
        await client.connect();

        const database = client.db("qb");
        const qCollection = database.collection("scoreboard");
        const query = { name: quizName };
        const options = { projection: { _id: 0 },};
        const scoreboard = await qCollection.findOne(query,options);
        if ( scoreboard == null )
            throw "Pistetaulua "+quizName+" ei ole olemassa";
        res.json(scoreboard);
    
    } catch (error) { 
        console.log(error); 
        res.json({error});
    } finally {
        await client.close();
        }
    }