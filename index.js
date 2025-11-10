const input = document.querySelector("input")
const output = document.querySelector("output")

import { execute } from "./interpreter.js"


input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return
    console.log(">> " + input.value)
    const result = execute(input.value)
    input.value = ""

    console.log(result.stdout)
    console.log("Exited with code: " + result.code)
})