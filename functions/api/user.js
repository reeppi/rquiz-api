const getDb = require('./db');
const { validator, asynclock } = require('./helper'); 

const lock = new asynclock();

module.exports = function()
{
    router.get('/user', cors(), (req, res) => {
        console.log("User");
        user(res,req);  
        }
    );   
    router.get('/test', cors(),  async (req, res) => { 
      try 
      {
        await lock.set("sa");
        await delay("Hoppista",2000);
        res.json({error:"testi"});
      } catch (error) { console.log("::"+error);  } 
      finally {
        lock.release("sa"); 
      }
    } );
}

function delay(str,time) {
  return new Promise(function(resolve, reject) {
    setTimeout((str)=>{ console.log(str); resolve()}, time, str);
  });
}
  
async function user(res,req) {
    try {
        var email = "tuomas.kokki@iki.fi";
        const fields = [{name:"name",maxlen:20},
                      {name:"desc",maxlen:200},
                      {name:"age",maxlen:3,type:"number"}];
        const reqFields = validator(req,fields);
        const db = await getDb(); 
        const userCollection = db.collection("users");
        const query = { email };
        const options = { projection: { _id: 0 } };

        await lock.set(email);
        var user = await userCollection.findOne(query,options);
        if ( user != null ) 
        {
          if ( Object.keys(reqFields).length > 0 )
          {
            newUser = Object.assign(user,reqFields);
            await userCollection.findOneAndReplace(query,newUser,options);
            user = await userCollection.findOne(query,options);
          }
          res.json(user);
        }
        
        } catch (error) 
          { console.log(error); res.json({error:error.message}); }
        finally { lock.release(email);  }
}