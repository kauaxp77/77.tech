const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('template_padrao_77xp.pdf');

pdf(dataBuffer).then(function (data) {
    fs.writeFileSync('template_padrao.txt', data.text);
    console.log("PDF lido com sucesso e salvo em template_padrao.txt");
}).catch(e => console.error(e));
