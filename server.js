const cors = require('cors');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const moment = require('moment');
const fs = require("fs"); 
const ordersData = require('./orders.json');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const PORT = 3030;

app.use(cors());
app.options('*', cors());
app.use(express.json());

const getOrdersData = new Promise((resolve, reject) => {
    fs.readFile('orders.json', 'utf8', (err, data) => {
        if (err){
            console.log("readFile-error");
            resolve([]);
        } else {
            resolve(JSON.parse(data));
        }
    });
});

const updateOrdersData = (orders) => {
    console.log("bd")
    return new Promise((resolve, reject) => {
        let json = JSON.stringify(orders);
        console.log("bdv")
        fs.writeFile('orders.json', json, 'utf8', () => {
            console.log("done")
            resolve(orders);
        });
    });
}

io.on('connection', async (socket) => {
    console.log("New WS Connection...");
    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
    socket.on('create_orders', async(data) => {
        io.emit("create_orders",data);
    });

    socket.on('update_orders', async(data) => {
        io.emit("update_orders",data);
    });
});

app.get("/orders", async (req, res) => {
    const orders = await getOrdersData;
    let data = orders.filter( order => {
        return !['canceled','done'].includes(order.status)
    })
    res.json({
        data: data,
        statusCode: 200
    });
});

app.get("/orders/get/:id", async (req, res) => {
    const order_id = parseInt(req.params.id);
    const orders = await getOrdersData;
    console.log(orders,order_id)
    const order = orders.find( item => item.id === order_id);
    res.json({
        data: order,
        statusCode: order ? 200 : 404
    });
});

app.post("/orders/update", async (req, res) => {
    const body = req.body;
    let orders = await getOrdersData;
    orders = JSON.parse(JSON.stringify(orders));
    let order = orders.find( item => item.id === body.id);
    if ( !order ) {
        res.json({
            message: "order is not found",
            statusCode: 200
        })
        return;
    };
    let updated_time = moment().format('YYYY-MM-DD HH:mm:ss');
    for (const [key, value] of Object.entries(body)) {
        if ( key === 'status' ) {
            order[key] = value;
            if ( value === 'driver_assigned' ) {
                order.rider_name = ["A Tuấn","A Hưng","A Trường","A Bảy Gà","A Vi Cá","A Sói","C Tam Muội","C Bảy","A Hổ","C Beo"][Math.round(Math.random()*10)];
            }
        } else if ( order[key] ) {
            order[key] = value;
            order.updated_time = updated_time;
        }
    }
    let orderIndex = orders.findIndex((item) => item.id === body.id);
    orders[orderIndex] = order;
    await updateOrdersData(orders);
    console.log("vo")
    res.json({
        data: order,
        statusCode: 200
    });
});

app.post("/orders/create", (req, res) => {
    const body = req.body;
    let now = new Date();
    let total_price = 0;
    body.dishes.forEach( dish => {
        total_price += dish.price;
    })
    const orders = {
        id: now.getTime(),
        status: "created",
        customer_name: body.customer_name,
        rider_name: body.rider_name,
        order_address: body.order_address,
        merchant_name: body.merchant_name,
        merchant_address: body.merchant_address,
        dishes: body.dishes,
        total_price: total_price,
        updated_time: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    fs.readFile('orders.json', 'utf8', (err, data) => {
        if (err){
            console.log("readFile-error",err);
        } else {
            let items = JSON.parse(data);
            items.push(orders); 
            let json = JSON.stringify(items);
            fs.writeFile('orders.json', json, 'utf8', () => {
                console.log("done")
            });
        }
    });

    res.json({
        data: orders,
        statusCode: 200
    });
});

app.get("/", (req, res) => {
    res.send("Hello Baemin");
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})