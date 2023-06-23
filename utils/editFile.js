const vscode = require('vscode');
const fs = require("fs");

/**
* Modify the file to output png file.
* @param {string} filePath 
* @returns True if option-trace is set to 'true' in the file
*/
function modifyForPngTrace(filePath){
    var fileText = fs.readFileSync(filePath).toString();
    // Remove all white spaces for the test
    let testText = fileText.replace(/\s/g,'')
    if (!testText.includes('option-trace=true;')){
        return false;
    }

    let data = fileText.split("\n");
    // Insert option for dot file
    data.splice(0, 0, 'option-output = "dot";');
    var text = data.join("\n");
    
    fs.writeFile(filePath, text, function (err) {
        if (err) {
            vscode.window.showErrorMessage("Error: Couldn't generate a png trace")
        };
    });
    return true;
}

/**
* Modify the file to its state before calling modifyForPngTrace
* @param {string} filePath  
*/
function rollbackFile(filePath){
    var data = fs.readFileSync(filePath).toString().split("\n");
    // Remove previously added option
    if (data[0].includes('option-output = "dot";')){
        data.shift();
    }
    
    var text = data.join("\n");
    fs.writeFile(filePath, text, function (err) {
        if (err) {
            vscode.window.showErrorMessage("Error: Couldn't execute rollback. Please note that a line was prepended to your file.")
        };
    });
}

module.exports = {
    modifyForPngTrace, rollbackFile
}