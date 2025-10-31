const input = document.querySelector("input")
const output = document.querySelector("output")

/**
 * 
 * @param {String} command Command to tokenize
 */
function tokenize(command) {
    const output = []

    let held = ""

    let type = ""

    let flags = {
        singleEscape: false,
        doubleEscape: false
    }

    for (let i = 0; i < command.length; i++) {
        if (command[i] === "'") {
            if (flags.doubleEscape || command[i-1] === "\\") {
                held += command[i]
            }
            else {
                flags.singleEscape = !flags.singleEscape
            }
        }
        else if (command[i] === "\"") {
            if (flags.singleEscape || command[i-1] === "\\") {
                held += command[i]
            }
            else {
                flags.doubleEscape = !flags.doubleEscape
            }
        }
        else if (command[i] === " " && !flags.singleEscape && !flags.doubleEscape) {
            output.push(held)
            held = ""

        }
        else {
            held += command[i]
        }
    }

    if (held !== "") output.push(held)

    return output
}

input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return
    console.log(tokenize(input.value))
    input.value = ""
})