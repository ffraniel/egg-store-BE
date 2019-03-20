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

app.put('/orders/remove/:orderID', function (req, res){
  const orderID = req.params.orderID;
  // handle no order ID
  if (!orderID) {
    res.send({
      action: 'Remove Order by ID',
      id: '',
      completed: false,
      message: 'Unable to delete order. No order ID provided.'
    });
    return;
  };
  // get data store
  req.webtaskContext.storage.get(function (err, data) {
    if (err) {
      console.log({error: err});
      return;
    };

    // get current orders
    const ordersList = data.orders || [];

    // handle an empty array
    if (ordersList.length === 0) {
      res.send({
        action: 'Remove Order by ID',
        id: orderID,
        completed: false,
        message: 'Unable to delete order. No previous orders.'
      });
      return;
    };

    const filteredOrdersList = ordersList.filter((item) => {
      return item.id !== orderID;
    })

    if (ordersList.length === filteredOrdersList.length) {
      res.send({
        action: 'Remove Order by ID',
        id: orderID,
        completed: false,
        message: 'Unable to find a match. No order deleted.'
      });
      return;
    };

    // add the filtered orders back on to the data object
    data.orders = filteredOrdersList;

    // set the data storage
    req.webtaskContext.storage.set(data, function (err) {
      if (err) {
        res.send({
          error: err
        });
        return;
      };
      res.send({
        action: 'Remove Order by ID',
        id: orderID,
        completed: true,
        message: `Removed order ${orderID} from orders list.`
      });
      return;
    });
  });
});

app.post('/orders/amend/:orderID', function (req, res) {
  const orderID = req.params.orderID;
  const amendedOrder = req.body;

  // handle no order ID
  if (!orderID) {
    res.send({
      action: 'amend order by ID',
      id: '',
      completed: false,
      message: 'Unable to amend order. No order ID provided.'
    });
    return;
  };

  // handle no body sent
  if (amendedOrder === undefined) {
    res.send({
      action: "amend order by ID",
      id: orderID,
      completed: false,
      message: "No details attached"
    });
    return;
  };

  // get data store
  req.webtaskContext.storage.get(function (err, data) {
    if (err) {
      console.log({
        error: err
      });
    };

    // get current orders
    const ordersList = data.orders || [];

    // handle an empty array
    if (ordersList.length === 0) {
      res.send({
        action: 'amend Order by ID',
        id: orderID,
        completed: false,
        message: 'Unable to amend order. No previous orders.'
      });
      return;
    };

    // check it contains an item with the ID
    const matchedID = ordersList.find(function(element) {
      return element.id === orderID;
    });

    if (matchedID === undefined) {
      res.send({
        action: "amend order by ID",
        id: orderID,
        message: "No orders with matching ID",
        completed: false
      });
      return;
    };

    // find and amend order
    const amendedOrdersList = ordersList.map((item)=>{
      if (item.id === orderID) {
        item.name = amendedOrder.name;
        return item;
      } else {
        return item;
      };
    });

    // put amended list back on data object
    data.orders = amendedOrdersList;

    // set the data to storage
    req.webtaskContext.storage.set(data, function (err) {
      if (err) {
        res.send({
          error: err
        });
        return;
      };
      res.send({
        action: "amend order by ID",
        id: orderID,
        message: `Successfully amended order ${orderID}.`,
        completed: true,
        orders: amendedOrdersList
      });
    });
  });
});

module.exports = Webtask.fromExpress(app);