import { useEffect, useState } from "react";
import { socket } from "./socket";

const SOLUTION_SIZE = 5;
const MAX_GUESSES = 6;

function Tile({ word, color, index }) {
    const letter = word[index]

    return (
        <div className={`tile ${color}`}>
            {letter}
        </div>
    )
}

function Line({ word,  colors }) {
    const tiles = new Array(SOLUTION_SIZE);
    for(let i = 0; i < SOLUTION_SIZE; i++) {
        let color;
        if(colors) {
            color = colors[i]
        }
        else {
            color = ""
        }
        tiles.push(<Tile key={i} word={word} color={color} index={i} />)
    }

    return (
        <div className="line">
            {tiles}
        </div> 
    )
}

export default function Board() {
    const [solution, setSolution] = useState("");
    const [guesses, setGuesses] = useState(new Array(MAX_GUESSES).fill(""));
    const [currentGuess, setCurrentGuess] = useState(0);
    const [userWon, setUserWon] = useState(false);
    const [userLost, setUserLost] = useState(false);
    const [colors, setColors] = useState([]);

    useEffect(() => {
        function handleKeyPress(event) {
            if(currentGuess >= MAX_GUESSES) return;
            if (event.key.length === 1 && guesses[currentGuess].length < SOLUTION_SIZE) {
                setGuesses(oldGuesses => {
                    let newGuesses = [...oldGuesses];
                    newGuesses[currentGuess] += event.key;
                    return newGuesses;
                })
            }
            else if(event.key === "Backspace") {
                setGuesses(oldGuesses => {
                    let newGuesses = [...oldGuesses];
                    newGuesses[currentGuess] = newGuesses[currentGuess].slice(0, -1)
                    return newGuesses
                })
            }
            else if(event.key === "Enter" && guesses[currentGuess].length === SOLUTION_SIZE) {
                let url = new URL("http://localhost:4000/checkWord");
                url.searchParams.append("word", guesses[currentGuess]);
                url.searchParams.append("lost", currentGuess >= MAX_GUESSES - 1);
                fetch(url).then((response => {
                    response.json().then((json => {
                        if(json.solution !== undefined) {
                            setSolution(json.solution)
                        }
                        setColors(oldColors => {
                            let newColors = [...oldColors];
                            newColors.push(json.colors);
                            return newColors;
                        });
                        if(json.playerWon) {
                            setUserWon(true);
                        }
                        else if(currentGuess >= MAX_GUESSES - 1) {
                            setUserLost(true);
                        }
                    }))
                }))
                setCurrentGuess(oldGuess => oldGuess + 1);
            }
        }

        document.addEventListener("keydown", handleKeyPress);
        return () => document.removeEventListener("keydown", handleKeyPress);
    }, [currentGuess, guesses])

    return (
        <div className="board">
            <div className="title">
                wordel
            </div>
            {guesses.map((guess, i) => {
                return <Line key={i} word={guess} colors={colors[i]} />
            })}
            <div className="subtitle">
                check out the repository <a href="https://github.com/oblionC/wordel">here</a>
            </div>
            { userWon && (<>You won</>)}
            { userLost && (<>You lost, the word was {solution} </>)}
        </div>
    )
}