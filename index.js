const input = document.querySelector("input")
const output = document.querySelector("output")

import { execute } from "./interpreter.js"


input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return
    console.log(execute(input.value))
    input.value = ""
})