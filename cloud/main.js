// IMPIEGATI
/**
 * Controlla che non vengano mai creati due elementi con CHIP uguale
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

// COMMESSE

/**
 * Aggiunge i campi totPreventivo e totOre alla commessa creata, se non presenti. 
 */
Parse.Cloud.beforeSave('commesse', (request => {
  console.log('BEFORE SAVE COMMESSE: setta a 0 totOrePreventivo e totOre se non definiti')
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
  console.log("AFTER SAVE PREVENTIVO: Calcola il totale delle ore del preventivo e lo salva in COMMESSE", request.object)
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

/**
 * Clona la commessa
 * @param {string} commessaId id della commessa da clomnre
 * @param {string} nome nome della nuova commessa 
 * @param {string} numero numero della nuova commessa 
 * @param {string} data_offerta data_offerta della nuova commessa 
 * @param {string} data_consegna data_consegna della nuova commessa 
 */
function cloneCommessa(commessaId, nome, numero, data_offerta, data_consegna){
  const copyObj = new Parse.Object('commesse')
  copyObj.set('nome', nome)
  copyObj.set('numero', numero)
  copyObj.set('data_offerta', data_offerta)
  copyObj.set('data_consegna', data_consegna)
  copyObj
    .save()
    .then(newObj => clonePreventivi(commessaId, newObj.id))
}

/**
 * Clona tutti i preventivi di una commessa
 * @param {string} commessaId id della commessa da clonare
 * @param {string} newId id della commessa appena clonata
 */
function clonePreventivi(commessaId, newId){
  new Parse.Query('preventivo')
    .equalTo('parent', commessaId)
    .find()
    .then(
      results => {
        results.forEach(
          current => {
            var currentAttr = current.attributes
            const copyObj = new Parse.Object('preventivo')
            Object.keys(currentAttr).forEach(
              key => copyObj.set(key, currentAttr[key])
            )
            copyObj.set('parent', newId)
            copyObj.save()
          }
        )
      }
    )
}

/**
 * Clone la commessa. Parametri dela richiesta: 
 *    - commessaId: id della vecchia commessa da clonare
 *    - nome: nome della nuova commessa
 *    - numero: numero della nuova commessa
 *    - data_offerta: data_offerta della nuova commessa
 *    - data_consegna: data_consegna della nuova commessa
 */
Parse.Cloud.define("cloneCommessa", (request) =>  {
  const { params, headers, log, message } = request;
  console.log('CLONE COMMESSA', params.data_offerta, params.data_consegna)
  cloneCommessa(params.commessaId, params.nome, params.numero, params.data_offerta, params.data_consegna)
  return 'req:', request;
});

/**
 * Calcola differenza (in minuti e in stringa) tra due date
 * @param {date} dateFuture La data futura
 * @param {date} dateNow la data passata
 * @returns la differenza in minuti e una stringa contenente la differenza formattata bene
 */
function timeDiffCalc(dateFuture, dateNow) {
  let diffInMilliSeconds = Math.abs(dateFuture - dateNow) / 1000;

  // Calcola i minuti totali (che servono poi per la somma nella commessa)
  const totMin = Math.floor(diffInMilliSeconds / 60);

  // calculate hours
  const hours = Math.floor(diffInMilliSeconds / 3600);
  diffInMilliSeconds -= hours * 3600;

  // calculate minutes
  const minutes = Math.floor(diffInMilliSeconds / 60) % 60;
  diffInMilliSeconds -= minutes * 60;

  // Crea la stringa che indica ore e minuti
  difference = (hours === 0 || hours === 1) ? `${hours} h, ` : `${hours} h, `;
  difference += (minutes === 0 || hours === 1) ? `${minutes} m` : `${minutes} m`; 

  return [totMin, difference];
}

/**
 * Calcola la differenza di tempo tra le due date in ORE 
 */
 Parse.Cloud.beforeSave('lavori', (request => {
   console.log('BEFORE SAVE LAVORI: Calcola la differenza di tempo tra due lavori')
  if (request.object.get( 'fine' ) !== undefined){
    const [totMin, difference] = timeDiffCalc(request.object.get( 'fine' ), request.object.get( 'inizio' ))

    request.object
      .set('tempo', difference)
      .set('diffInMinutes', totMin)
  }
}))

/**
 * Salva la somma dei minuti di ogni lavoro per una commessa
 */
Parse.Cloud.afterSave('lavori', request => {
  console.log('AFTER SAVE LAVORI: somma i minuti di lavoro per una commessa')
  new Parse.Query('lavori')
      .equalTo('commessaId', request.object.get( 'commessaId' ))
      .find()
      .then(
        results => {
          let totMin = 0
          results.forEach(
            lavoro => {
              console.log(lavoro)
              totMin = totMin + lavoro.attributes.diffInMinutes
            }
          )
          new Parse.Query('commesse')
            .get( request.object.get( 'commessaId' ) )
            .then( commessa => commessa.set( 'minutiReali', totMin ).save() )
        }
      )
})

/**
 * Archivia la commessa. 
 * @params request: l'ID della commessa da archiviare
 */
Parse.Cloud.define("archiviaCommessa", (request) =>  {
  const { params, headers, log, message } = request;
  console.log('ARCHIVIA COMMESSA', params.id)
  archiviaCommessa(params.id, true)
  console.log('ARCHIVIATO TUTTO')
  return request
});

/**
 * Disrchivia la commessa. 
 * @params request: l'ID della commessa da disarchiviare
 */
 Parse.Cloud.define("disarchiviaCommessa", (request) =>  {
  const { params, headers, log, message } = request;
  console.log('DISARCHIVIA COMMESSA', params.id)
  archiviaCommessa(params.id, false)
  return 'req:', request;
});

/**
 * Archivia o disarchivia una commessa
 * @param {bool} b Indica se la commessa deve essere archiviata o no
 */
function archiviaCommessa(id, b){
  new Parse.Query('commesse')
    .get(id)
    .then( commessa =>commessa.set('archiviata', b).save() )
  
  new Parse.Query('lavori')
    // Trova tutti i lavori con questa commessa come ID
    .equalTo('commessaId', id)
    .find()
    .then(results => {
      results.forEach(r => {
        r
          .set("archiviato", b)
          .save()
      })
    })
}