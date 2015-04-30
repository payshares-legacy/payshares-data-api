function(doc) {

  var time    = new Date(doc.close_time_timestamp),
    unix      = Math.round(time.getTime()),
    timestamp = [ time.getUTCFullYear(), time.getUTCMonth(), time.getUTCDate(),
      time.getUTCHours(), time.getUTCMinutes(), time.getUTCSeconds()
    ];

  doc.transactions.forEach(function(tx) {

    if (tx.metaData.TransactionResult !== 'tesSUCCESS') {
      return;
    }

    if (tx.TransactionType !== 'Payment' && tx.TransactionType !== 'OfferCreate') {
      return;
    }

    tx.metaData.AffectedNodes.forEach(function(affNode) {

      var node = affNode.ModifiedNode || affNode.DeletedNode;

      if (!node || node.LedgerEntryType !== 'Offer') {
        return;
      }

      if (!node.PreviousFields || !node.PreviousFields.TakerPays || !node.PreviousFields.TakerGets) {
        return;
      }

      var involvesBTC = false;
      var involvesXPR = false;
  
      var exchangeRate = node.exchange_rate,
        counterparty   = node.FinalFields.Account,
        payCurr,
        payAmnt,
        getCurr,
        getAmnt;

      if ( typeof node.PreviousFields.TakerPays === "object" ) {
        payCurr = node.PreviousFields.TakerPays.currency+"."+node.PreviousFields.TakerPays.issuer;
        payAmnt = node.PreviousFields.TakerPays.value - node.FinalFields.TakerPays.value;
        involvesBTC = involvesBTC || (node.PreviousFields.TakerPays.currency === 'BTC');
      } else {
        payCurr = "XPR";
        payAmnt = (node.PreviousFields.TakerPays - node.FinalFields.TakerPays) / 1000000.0; // convert from drops
        exchangeRate = exchangeRate / 1000000.0;
        involvesXPR = true;
      }

      if ( typeof node.PreviousFields.TakerGets === "object" ) {
        getCurr = node.PreviousFields.TakerGets.currency+"."+node.PreviousFields.TakerGets.issuer;
        getAmnt = node.PreviousFields.TakerGets.value - node.FinalFields.TakerGets.value;
        involvesBTC = involvesBTC || (node.PreviousFields.TakerGets.currency === 'BTC');
      } else {
        getCurr = "XPR";
        getAmnt = (node.PreviousFields.TakerGets - node.FinalFields.TakerGets) / 1000000.0;
        exchangeRate = exchangeRate * 1000000.0;
        involvesXPR = true;
      }

      if(!involvesXPR || !involvesBTC) return;

      var result = {date: unix};
      
      if(getCurr === 'XPR') {
        result.price = 1 / exchangeRate;
        result.amount = payAmnt;
      } else {
        result.price = exchangeRate;
        result.amount = getAmnt;
      }

      result.price = Number(result.price.toFixed(6));
      result.amount = Number(result.amount.toFixed(8));

      emit(timestamp, result);
    } );
  } );
}