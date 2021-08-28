Parse.Cloud.define('hello', (req) => {
  req.log.info(req)
  return 'Hi';
});

Parse.Cloud.define('asyncFunction', async (req) => {
  await new Promise((resolve) => setTimeout(resolve,1000));
  req.log.info(req)
  return 'Hi async';
});

Parse.Cloud.beforeSave('Test', () => {
  throw new Parse.Error(212,'Saving test objects is not available.')
});

/**
 * Quando salvo un nuovo lavoro, inserisco l'ID del nuovo lavoro 
 * nell'array dei lavori in corso di un determinato lavoratore
 */
Parse.Cloud.afterSave('lavori', (request) => {

  new Parse.Query('impiegati')
    .get( request.object.get( 'impiegatoId' ) )
    .then( impiegato => {
      if(request.object.get( 'fine' ) === undefined){
        impiegato.add('lavoriInCorso', request.object.id).save()
      }else{        
        impiegato.remove('lavoriInCorso', request.object.id).save()
      }
    })
    .catch( error => console.error("Got an error " + error.code + " : " + error.message) );
})

