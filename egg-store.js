var express = require('express');
var Webtask = require('webtask-tools');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.send({
    message: "Add, Remove or check Quantity of eggs"
  });
});

app.get('/add/:number', function (req, res) {
  var paramNumber = req.params.number;
  // error check for number here and handle
  var increment = parseInt(paramNumber) || 0;
  req.webtaskContext.storage.get(function (err, data) {
    if (err) {
      res.send({
        error: err
      });
    }
    if (data === undefined) {
      data = {};
    }
    const currentEggs = data.eggQuantity || 0;
    const newTotal = currentEggs + increment;
    data.eggQuantity = newTotal;
    const message = increment ? `Successfully added ${increment} egg(s) to your store` : 'You did not change your store'; 
    req.webtaskContext.storage.set(data, function (err) {
      if (err) {
        res.send({
          error: err
        });
      }
      res.send({
        action: 'add',
        amount: increment,
        message,
        total: newTotal
      });
    });
  });
});

app.get('/remove/:number', function (req, res) {
  var paramNumber = req.params.number;
  // error check for number here and handle
  var decrement = parseInt(paramNumber) || 0;
  // get eggs numbers
  req.webtaskContext.storage.get(function (err, data) {
    if (err) {
      res.send({
        error: err
      });
    }
    if (data === undefined) {
      data = {};
    }
    const currentEggs = data.eggQuantity || 0;
    const newTotal = currentEggs - decrement;
    var totalLimitedAtZero = newTotal > 0 ? newTotal : 0;
    data.eggQuantity = totalLimitedAtZero;
    const message = decrement ? `Successfully removed ${decrement} eggs to your store (zero-limted)` : 'You did not change your store'; 
    req.webtaskContext.storage.set(data, function (err) {
      if (err) {
        res.send({
          error: err
        });
      }
      res.send({
        action: 'remove',
        amount: decrement,
        message,
        total: totalLimitedAtZero
      });
    });
  });
});

app.get('/quantity', function (req, res) {
  req.webtaskContext.storage.get(function(err, data){
    if (err) {
      res.send({
        error: err
      });
    }
    if (data === undefined) {
      data = {};
    };
    const eggs = data.eggQuantity || 0;
    res.send({
      action: 'quantity',
      amount: null,
      message: 'Check Quantity',
      total: eggs
    });
  });
});

module.exports = Webtask.fromExpress(app);