var express = require('express');
var Webtask = require('webtask-tools');
var bodyParser = require('body-parser');
var app = express();
const uuid = require('uuidv4');

const checkOrderData = (order)=>{
  if (order.name) {
    return true;
  } else {
    return false;
  }
};

app.use(bodyParser.urlencoded({extended:false}));

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
    console.log("data = ", data);
    if (data === undefined) {
      console.log("Data object undfined")
      data = {};
    }
    console.log("data = ", data);
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

app.get('/login/:username/:password', function(req, res) {
  const username = req.params.username;
  const password = req.params.password;
  if (username === req.webtaskContext.secrets.username && password === req.webtaskContext.secrets.password) {
    res.send({
      success: true
    })
  } else {
    res.send({
      success: false
    })
  }
});

app.get('/orders', function(req, res) {
  req.webtaskContext.storage.get(function (err, data) {
    if (err) {
      res.send({
        error: err
      });
    }
    let orders = data.orders; 
    res.send(orders);
  });
});

app.post('/orders/add', function (req, res) {
  const newOrder = req.body;
  
  // handle no body sent
  if (newOrder === undefined) {
    res.send({
      action: "place order",
      message: "No order attached",
      newOrder: null
    });
    return;
  };

  // check newOrder has all correct fields completed
  if (!checkOrderData(newOrder)) {
    res.send({
      action: "place order",
      message: "Order details incorrect",
      newOrder: null
    });
    return;
  };

  // get data
  req.webtaskContext.storage.get(function (err, data) {
    if (err) {
      console.log("Data fetch error")
      res.send({
        error: err
      });
      return;
    };

    //get orders or handle no orders
    const ordersList = data.orders || [];

    // generate id, add incomplete, date and attach to newOrder
    newOrder.date = new Date();
    newOrder.id = uuid();
    newOrder.complete = false;

    // add new order to order list
    ordersList.push(newOrder);

    // reattach to data object
    data.orders = ordersList;

    //set data
    req.webtaskContext.storage.set(data, function (err) {
      if (err) {
        res.send({
          error: err
        });
        return;
      };
      res.send({
        message: "input",
        newOrder,
        orders: ordersList
      });
      return;
    });

  });
});

app.get('/data', function(req, res) {
  req.webtaskContext.storage.get(function (err, data) {
    if (err) {
      res.send({
        error: err
      })
    }
    res.send({data});
  });
});

app.get('/datareset', function(req, res) {
  req.webtaskContext.storage.get(function (err, data) {
    if (err) {
      res.send({
        error: err
      })
    }
    data.orders = [];
    req.webtaskContext.storage.set(data, function (err) {
      if(err) {
        console.log({error: err});
      }
      res.send({data});
    });
  });
});

module.exports = Webtask.fromExpress(app);