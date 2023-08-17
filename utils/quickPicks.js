
const vscode = require('vscode');
const fs = require("fs");
const path = require('path');

const {extension} =  require("./../extension");
const {checkOS} = require("./misc");
const lib_path = path.join(extension.extensionPath, "Cyclone");

const isWindows = checkOS() === "Windows"

function formatBackSlash(content){
    if (isWindows){
        return content
    }
    return content.replaceAll("\\","")
}

/**
* Display in the quick picks the content of the selected folder
* @param {string} dirPath the path of the selected folder
*/
function quickPickDir(dirPath){
    let choiceList = [];
    let pathList = []
    // Prevent user from going outside 'example/' folder
    if (dirPath !== path.join(lib_path, 'examples')){
        choiceList.push({
            label: "..",
            description: "Go to parent directory"
        })
        pathList.push(path.dirname(dirPath))
    }
    
    let itemPath = '';
    
    fs.readdirSync(formatBackSlash(dirPath)).forEach(item => {
        // Do not display 'trace/' folder 
        if (item === "trace"){
            return;
        }
        itemPath = path.join(dirPath, item)
        if (fs.statSync(formatBackSlash(itemPath)).isDirectory()){
            choiceList.push({
                label: path.basename(item),
                description: "Go to "+path.basename(item)+" examples."
            })
            pathList.push(itemPath);
        } else {
            // Do not display files that aren't cyclone file
            if (itemPath.slice(itemPath.length - 8) !== (".cyclone")){
                return;
            }
            choiceList.push({
                label: path.basename(item),
                description: "Load "+path.basename(item)+" example."
            })
            pathList.push(itemPath);
        }
    });
    
    
    vscode.window.showQuickPick(choiceList).then(selection => {
        // the user canceled the selection
        if (!selection) {
            return;
        }
        
        let selectedPath = pathList[choiceList.indexOf(selection)];
        if (fs.statSync(formatBackSlash(selectedPath)).isDirectory()){
            // Show quickPicks for selected folder
            quickPickDir(selectedPath);	
            return;
        }
        loadFile(selectedPath);
    });
}

/**
* Open the file located at filePath if exists
* @param {string} filePath path of the file to be loaded
*/
function loadFile(filePath){
    if (fs.existsSync(formatBackSlash(filePath))) {
        const openPath = vscode.Uri.file(formatBackSlash(filePath));
        vscode.workspace.openTextDocument(openPath).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    } else {
        vscode.window.showErrorMessage("An error occurred when locating the file" );
    }
}

module.exports = {
    quickPickDir, loadFile
}