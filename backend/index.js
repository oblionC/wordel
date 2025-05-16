const express = require("express");
const cors = require("cors");
const app = express();

const PORT = 4000;

app.use(cors());

app.get("/checkWord", (req, res) => { 
    let colors = [];
    let solution = "guest";
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

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
})