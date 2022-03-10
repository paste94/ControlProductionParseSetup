Parse.Cloud.define('hello', (req) => {
  req.log.info(req)
  return 'Hi';
});

Parse.Cloud.define('asyncFunction', async (req) => {
  await new Promise((resolve) => setTimeout(resolve,1000));
  req.log.info(req)
  return 'Hi async';
});

/*
Parse.Cloud.beforeSave('impiegati', async (request) => {
  console.log("CLOUD CODE - Impiegati beforeSave - checking for chip ", request.object.get('chip'))
  await new Parse.Query('impiegati')
    .equalTo( 'chip', request.object.get('chip') )
    .find()
    .then(impiegati => {
      console.log("CLOUD CODE - Impiegati beforeSave - Impiegati length ", impiegati.length)
      if( impiegati.length > 0){
        console.log("*****NOPE*****")
      }else{
        console.log("*****OK*****")
      }
    })
    .catch( error => console.error("Got an error " + error.code + " : " + error.message) );
});
*/

/**
 * Controlla che non vengano mai creati due elementi con CHIP uguale
 * TODO: Controlla la modifica!
 */
Parse.Cloud.beforeSave('impiegati', async (request) => {
  console.log("CLOUD CODE - Impiegati beforeSave - checking for chip ", request.object.get('chip'))
  const query = new Parse.Query("impiegati");
  query.equalTo('chip', request.object.get('chip'));
  const elements = await query.find()
  
  if(elements.length > 1){
    throw 'Ci sono troppi elementi con lo stesso numero di chip, per favore contattare l\'assistenza'
  }else if(elements.length === 1){
    if(elements[0].id !== request.object.id){
      throw 'Esiste già un elemento con questo chip, selezionare un chip con umero differente'
    }
  }
});


/**
 * Quando salvo un nuovo lavoro, inserisco l'ID del nuovo lavoro 
 * nell'array dei lavori in corso di un determinato lavoratore
 */
Parse.Cloud.afterSave('lavori', (request) => {
  console.log("CLOUD CODE - Lavori afterSave triggered with ", request.object)
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

/**
 * Aggiunge i campi totPreventivo e totOre alla commessa creata, se non presenti. 
 */
Parse.Cloud.beforeSave('commesse', (request => {
  if (request.object.get( 'totPreventivo' ) === undefined){
    request.object.set('totPreventivo', 0)
  }
  if (request.object.get( 'totOre' ) === undefined){
    request.object.set('totOre', 0)
  }
}))

/**
 * Dopo il salvataggio o la modifica di un preventivo, calcola il totale delle ore e del
 * prezzo della commessa e aggiunge un campo alla commessa con totale delle ore e 
 * totale del prezzo.
 */
Parse.Cloud.afterSave('preventivo', (request => {
  console.log("CLOUD CODE - preventivo afterSave triggered with ", request.object)
  new Parse.Query('preventivo')
    // Seleziona tutti gli elementi non eliminati
    .notEqualTo('eliminato', true)
    // Seleziona tutti gli elementi che hanno lo stesso parent dell'elemento modificato o creato
    .equalTo('parent', request.object.get('parent'))
    .find()
    .then(result => {
      let totPreventivo = 0
      let totOre = 0
      // Somma i valori da aggregare
      result.forEach(elem => {
        totPreventivo = totPreventivo + elem.attributes.totPreventivo
        totOre = totOre + elem.attributes.totOre
      })
      // Salva le somme come campi nella commessa parent
      new Parse.Query('commesse')
        .get(request.object.get('parent'))
        .then(commessa => {
          commessa
            .set('totPreventivo', totPreventivo)
            .set('totOre', totOre)
            .save()
        })
    })
}))

Parse.Cloud.define('hello', req => {
  req.log.info(req);
  return 'Hi';
});