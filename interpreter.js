class FSFile {
    constructor(parent, name, content) {
        this.parent = parent
        this.name = name
        this.type = "FILE"
        this.content = content

    }

    ls() {
        return this.name
    }

    rm() {
        delete this.parent.children[this.name]
    }

    write(content) {
        this.content = content
    }
}

class FSDirectory {
    /**
     * 
     * @param {FSDirectory} parent 
     * @param {string} name 
     */
    constructor(parent, name) {
        this.parent = parent
        this.name = name
        this.children = {
            ".": this
        }
        if (this.parent) this.children[".."] = this.parent
        this.type = "DIR"

    }

    ls() {
        return Object.keys(this.children)
    }

    rm() {
        if (this.parent) delete this.parent.children[this.name]
        else this.children = {}
    }

    write(file, content) {
        this.children[file] = new FSFile(this, file, content)
    }
}

const VFS = new FSDirectory(null, "")
let workingDir = VFS

const temp = new FSDirectory(VFS, "somedir")
temp.write("skibidi.rizz", "only in ohio!!!11!11!")
VFS.children["somedir"] = temp

VFS.write("README.txt", "Hello, world!\nThis is some test text, I hope you enjoy it!")

// a bit of an odd way to store commands, but it works

const COMMANDS = {
    /**
     * 
     * @param {string} stdin 
     * @param {FSDirectory} dir 
     * @param {string[]} args 
     * @returns 
     */
    cat: (stdin, dir, args) => {
        let stdout = ""

        if (args.length < 1) {
            return { stdout: stdin, dir: dir, code: 0 }
        }
        else {
            const params = extractAllParams(args)

            if (params.includes("help")) return { stdout: "Screw you just read the man page https://linux.die.net/man/1/cat", dir: dir, code: 0 }

            if (params.includes("A") || params.includes("show-all")) params.push("v","E","T")
            if (params.includes("e")) params.push("v","E")
            
            
            let start = args.findIndex((a) => a[0] !== "-" || a === "-")
            if (start < 0) {
                args.push("")
                start = args.length-1
            }
            for (let i = start; i < args.length; i++) {
                const v = args[i]
                if (v === "-" || v === "") {
                    let temp = stdin
                    if (params.includes("E") || params.includes("show-ends")) temp = temp.replaceAll("\n", "$\n")
                    if (params.includes("n") || params.includes("number")) {
                        const split = temp.split("\n")
                        temp = ""
                        for (let l = 0; l < split.length; l++) {
                            temp += `${l+1} ${split[l]}\n`
                        }
                    }
                    if (params.includes("s") || params.includes("squeeze-blank")) temp.replaceAll(/\n{3,}/gm, "\n\n") // lazy

                    stdout += `${temp}\n`
                }
                else {
                    let temp = traversePath(dir, v).content

                    if (params.includes("E") || params.includes("show-ends")) temp = temp.replaceAll("\n", "$\n")
                    if (params.includes("n") || params.includes("number")) {
                        const split = temp.split("\n")
                        temp = ""
                        for (let l = 0; l < split.length; l++) {
                            temp += `${l+1} ${split[l]}\n`
                        }
                    }
                    if (params.includes("s") || params.includes("squeeze-blank")) temp.replaceAll(/\n{3,}/gm, "\n\n") // lazy

                    stdout += temp + "\n"
                }
            }

            return { stdout: stdout, dir: dir, code: 0 }
        }
    },

    /**
     * 
     * @param {string} stdin 
     * @param {FSDirectory} dir 
     * @param {string[]} args 
     * @returns 
     */
    echo: (stdin, dir, args) => {
        let stdout = ""
        const params = extractAllParams(args)
        stdout = args.slice(args.findIndex((a) => a[0] !== "-"))
        
        if (params.includes("e") && !params.includes("E")) stdout = stdout.map((v) => v.replaceAll("\\n", "\n"))

        stdout = stdout.join(" ")
        if (!params.includes("n")) stdout += "\n"

        console.log(stdout)
        return { stdout: stdout, dir: dir, code: 0 }
    },

    /**
     * 
     * @param {string} stdin 
     * @param {FSDirectory} dir 
     * @param {string[]} args 
     * @returns 
     */
    ls: (stdin, dir, args) => {
        let stdout = ""
        const params = extractAllParams(args)
        let start = args.findIndex((a) => a[0] !== "-" || a === "-")
        if (start < 0) {
            args.push(".")
            start = args.length-1
        }


        if (args.length < 1) {
            stdout = dir.ls()

            stdout = stdout.join("   ") + "\n"
        }
        else {
            for (let i = start; i < args.length; i++) {
                let tempDir = traversePath(dir, args[i]).ls()
                
                if (!params.includes("a") && !params.includes("all")) tempDir = tempDir.filter((v) => v[0] !== ".")
                if (!params.includes("B") && !params.includes("ignore-backups")) tempDir = tempDir.filter((v) => v[0] !== "~")
                // other options omitted because lazy

                stdout += tempDir.join("   ") + "\n"
            }
        }

        return { stdout: stdout, dir: dir, code: 0 }
    },

    info: (stdin, dir, args) => {
        return { stdout: 
`Hello, and thank you for choosing GOLD OS™. We hope you are enjoying your EXPERIENCE™ so far. This CLI™(Command Line Interface) is fairly unfinished, and is mostly meant as a placeholder until the actual operating system is completed, which, if finished will run completely in a VM. Unfortunately this VM is not yet complete, so you are left with this monstrosity of a partial Bash™ interpreter. This Project™ was made using a custom Turbowarp™ extension™ because we here at Gold OS™ can't be fucked™ implementing this in Scratch™.
For a list of commands, run \`help\`.\n`,
            dir: dir,
            code: 0
        }
    },

    help: (stdin, dir, args) => {
        return { stdout: 
`All listed commands are somewhat compliant with their BusyBox equivalents:
cat      - Read a file
echo     - Cry out into the void, see if it cries back
ls       - List entries in a directory
info     - Get information about this OS
help     - This message
poweroff - POWER OFF YOURSELF, NOW!\n`,
            dir: dir,
            code: 0
        }
    },

    poweroff: (stdin, dir, args) => {
        return { stdout: "Powering off...", dir: dir, code: 67 }
    }
}











/**
 * 
 * @param {String} command Command to tokenize
 */
function tokenize(command) {
    const output = []

    let held = ""

    let flags = {
        singleEscape: false,
        doubleEscape: false
    }


    for (let i = 0; i < command.length; i++) {
        // maybe todo: command substitution
        if (command[i] === "#") {
            if (flags.doubleEscape || flags.singleEscape) {
                held += command[i]
            }
            else {
                break
            }
        }
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
        else if (command[i] === "|") {
            if (flags.doubleEscape || flags.singleEscape) held += command[i]
            else if (command[i+1] === "|") {
                if (held !== "") output.push(held)
                output.push("||")
                held = ""
                i++
            }
            else {
                if (held !== "") output.push(held)
                output.push("|")
                held = ""
            }
        }
        else if (command[i] === ">") {
            if (flags.doubleEscape || flags.singleEscape) held += command[i]
            else if (command[i+1] === ">") {
                if (held !== "") output.push(held)
                output.push(">>")
                held = ""
                i++
            }
            else {
                if (held !== "") output.push(held)
                output.push(">")
                held = ""
            }
        }
        else if (command[i] === "&") {
            if (flags.doubleEscape || flags.singleEscape) held += command[i]
            else if (command[i+1] === "&") {
                if (held !== "") output.push(held)
                output.push("&&")
                held = ""
                i++
            }
            else {
                throw new Error("Invalid syntax: \"&\" is not implemented.\n")
            }
        }
        else if (command[i] === ";") {
            if (flags.doubleEscape || flags.singleEscape) held += command[i]
            else {
                if (held !== "") output.push(held)
                output.push(";")
                held = ""
            }
        }
        else if (command[i] === " " && !flags.singleEscape && !flags.doubleEscape) {
            if (held !== "") output.push(held)
            held = ""

        }
        else {
            held += command[i]
        }
    }

    if (held !== "") output.push(held)

    return output
}

function textWrapStdout(stdout) {

    /** @type {string[]} */
    const split = stdout.split("\n")
    for (let i = 0; i < split.length; i++) {
        const temp = []
        for (let j = 0; j < split[i].length; j += 75) {
            temp.push(split[i].slice(j, j+75))
        }
        split.splice(i, 1, ...temp)
        i += temp.length-1
    }

    stdout = split.slice(0, split.length-1).join("\n") + "\n" + split[split.length-1] + (stdout[stdout.length-1] === "\n" ? "\n" : "")

    return stdout
}

function execute(command) {
    let stdin = ""
    let stdout = ""
    let sentStdout = ""
    let exitCode = 0

    try {
        const parsed = tokenize(command)
        // console.log(parsed)

        const subcommands = []

        let temp = []
        for (let i = 0; i < parsed.length; i++) {
            if ([">", ">>", "<", "|", ";", "||", "&&"].includes(parsed[i])) {
                subcommands.push(temp, parsed[i])
                temp = []
            }
            else {
                temp.push(parsed[i])
            }
        }
        if (temp.length > 0) subcommands.push(temp)
        
        // console.log(subcommands)



        for (let i = 0; i < subcommands.length; i++) {
            const command = subcommands[i]
            switch (command) {
                case "|": {
                    stdin = stdout
                    break
                }

                case ">": {
                    workingDir.write(subcommands[i+1][0], stdout)
                    stdout = ""
                    i++
                    break
                }

                case ">>": {
                    workingDir.write(subcommands[i+1][0], (workingDir.children[subcommands[i+1][0]].content ?? "") + stdout)
                    stdout = ""
                    i++
                    break
                }

                case "||": {
                    if (exitCode === 0) i++ // second command only executed if the previous failed
                    break
                }
                
                case "&&": {
                    if (exitCode !== 0) i++ // second command only executed if the previous was successful
                    break
                }

                case ";": {
                    // doesn't really matter
                    break
                } 

                default: {
                    if (Object.prototype.hasOwnProperty.call(COMMANDS, command[0])) {
                        if (subcommands[i+1] === "<") {
                            if (workingDir.children[subcommands[i+2]]?.type === "FILE") stdin = workingDir.children[subcommands[i+2]].content
                        }
                        //console.log(command[0], stdin, command.slice(1))

                        try {
                            const result = COMMANDS[command[0]](stdin, workingDir, command.slice(1))

                            stdin  = ""
                            if ([">", ">>", "|"].includes(subcommands[i+1])) {
                                // stdout is redirected, do not flush to terminal
                                stdout = result.stdout
                            }
                            else {
                                sentStdout += result.stdout
                            }
                            //console.log(stdout)
                            workingDir = result.dir

                            exitCode = result.code
                            if (exitCode === 67) return { stdout: textWrapStdout(sentStdout), code: exitCode }

                            if (subcommands[i+1] === "<") i += 2 // already handled
                        }
                        catch (error) {
                           sentStdout = `${sentStdout}\n${command[0]}: ${error.message ?? "Unknown error"}`
                           exitCode = 1
                        }

                    }
                    else {
                        exitCode = 127
                        sentStdout = `${sentStdout}\nUnknown command "${command[0]}"\n`
                    }
                }
            }

        }

        return { stdout: textWrapStdout(sentStdout), code: exitCode }
    }
    catch (err) { // couldn't escape from the error; just exit
        return { stdout: textWrapStdout(sentStdout + "\nERROR: " + err?.message ?? "(UNKNOWN)"), code: 1 }
    }
}

/**
 * 
 * @param {String} text 
 */
function extractParams(text) {
    if (text.startsWith("--")) {
        return [text.slice(2)]
    }
    else if (text[0] === "-") return text.slice(1).split("")
    
    return []
}

/**
 * 
 * @param {string[]} args
 */
function extractAllParams(args) {
    let out = []
    for (let i = 0; args[i]?.[0] === "-"; i++) {
        out = out.concat(extractParams(args[i]))
    }

    return out
}

/**
 * 
 * @param {FSDirectory} dir 
 * @param {string} path 
 */
function traversePath(dir, path) {
    const split = path.split("/")
    for (let i = 0; i < split.length; i++) {
        const v = split[i]
        if (v === ".") {} // do nothing
        else if (v === "..") dir = dir.parent ?? VFS
        else {
            if (dir.children[v]?.type === "DIR" || (i === split.length-1 && dir.children[v]?.type === "FILE")) dir = dir.children[v]
            else { console.error(split, v, dir); throw new Error(`"${path}": No such file or directory\n`) }
        }
    }

    return dir
}


export { execute, VFS as VirtualFileSystem}