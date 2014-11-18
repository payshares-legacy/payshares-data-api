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
      var involvesUSD = false;
  
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
        involvesUSD = involvesUSD || (node.PreviousFields.TakerPays.currency === 'USD');
      } else {
        return;
      }

      if ( typeof node.PreviousFields.TakerGets === "object" ) {
        getCurr = node.PreviousFields.TakerGets.currency+"."+node.PreviousFields.TakerGets.issuer;
        getAmnt = node.PreviousFields.TakerGets.value - node.FinalFields.TakerGets.value;
        involvesBTC = involvesBTC || (node.PreviousFields.TakerGets.currency === 'BTC');
        involvesUSD = involvesUSD || (node.PreviousFields.TakerGets.currency === 'USD');
      } else {
        return;
      }

      if(!involvesUSD || !involvesBTC) return;

      var result = {date: unix};
      
      if(node.PreviousFields.TakerGets.currency === 'USD') {
        result.price = 1 / exchangeRate;
        result.amount = payAmnt;
      } else {
        result.price = exchangeRate;
        result.amount = getAmnt;
      }

      result.price = Number(result.price.toFixed(2));
      result.amount = Number(result.amount.toFixed(8));

      emit(timestamp, result);
    } );
  } );
}