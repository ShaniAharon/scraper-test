import fs from 'fs'

export const utilService = {
    readJsonFile,
}


function readJsonFile(path) {
    const str = fs.readFileSync(path, 'utf8')
    const json = JSON.parse(str)
    return json
}

