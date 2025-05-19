require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const cron = require("node-cron");
const { Server } = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 4000;

app.use(cors());

let solution = "guest"

async function setSolution() {
    const response = await fetch(process.env.WORDS_API);
    const wordsList = await response.json();
    solution = wordsList[Math.floor(Math.random() * wordsList.length)].toLowerCase();
    io.send("wordChanged");
}
setSolution();
cron.schedule("* * 0 * * *", async () => {
    setSolution();
})

app.get("/", (req, res) => {
    console.log("wow")
    return res.send("Working");
})

app.get("/checkWord", (req, res) => { 
    let colors = [];
    let word = req.query.word;
    let index = 0;
    for(let letter of word) {
        let color = "";
        if(letter === solution[index]) {
            color = "green";
        }
        else if(solution.includes(letter)) {
            let count = 0;
            for(let i = 0; i < solution.length; i++) {
                if(solution[i] === letter) count++;
                if(solution[i] === letter && solution[i] === word[i]) count--;
            }
            for(let i = 0; i < index; i++) {
                if(word[i] === letter) count--;
            }
            if(count > 0) {
                color = "orange"
            }
            else {
                color = "gray"
            }
        }
        else if(letter) {
            color = "gray";
        }
        colors.push(color);
        index++;
    }

    res.send({
        colors: colors,
        playerWon: word === solution, 
        solution: solution
    });
})

io.on("connection", (socket) => {
    console.log(`connected to ${socket.id}`)
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
})