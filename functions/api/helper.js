exports.validator = function(req,fields)
{ 
    try {
        var reqFields = {};
        fields.forEach(function(field) {   
            if ( req.query[field.name] != undefined || req.query[field.name]) 
            {
                if ( req.query[field.name].length > field.maxlen ) throw Error("Liian pitkä "+field.name);
                var value;
                if ( field.type == "number" ) 
                    value = Number(req.query[field.name]);
                else 
                    value = req.query[field.name];
                reqFields[field.name]=value;
            }
        } ); 
        return reqFields;
    }
    catch(error) { throw (error); }
}

exports.asynclock = function () {
    this.lockMap = new Map();
    this.release  = function (str) {  this.lockMap.delete(str);}
    this.set = function(str) { 
        return waitAsync(str, this.lockMap).then();
     }
}

function waitAsync(str,lockM)
{
    return new Promise(function(resolve, reject) {
    var id=setTimeout(()=>{ lockM.delete(str); resolve(); }, 9000);
    (function waiting()
        {
        if (!lockM.has(str)) 
        {
            clearTimeout(id);
            lockM.set(str,true);
            return resolve();
        }
        setTimeout(waiting, 50);
        })();
    });
 }