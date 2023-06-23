const vscode = require('vscode');

var decorationErrorType = vscode.window.createTextEditorDecorationType({
	textDecoration: "underline red wavy",
});


/**
* Parse stdout and stderr to display any Warning or Generation errors
* @param {string} stdout 
* @param {string} stderr 
*/
function displayWarningAndGenerationError(stdout,stderr){
    let msgList = stdout.split("Warning:");
    let endLinePos = 0;
    // Begin at 1 because first element is either empty or useless here 
    for (let i = 1; i < msgList.length; i++){
        endLinePos = msgList[i].indexOf("\n");
        vscode.window.showWarningMessage(msgList[i].substring(0, endLinePos));
    }
    msgList = stderr.split("Generation Error:");
    // Begin at 1 because first element is either empty or useless here
    for (let i = 1; i < msgList.length; i++){
        endLinePos = msgList[i].indexOf("\n");
        vscode.window.showWarningMessage(msgList[i].substring(0, endLinePos));
    }
}



/**
* Highlights error by parsing stderr
* @param {*} stderr The error given by the spec check
* @param {*} editor vs code active editor
*/
function highlightErrors(stderr, editor){
    if (editor) {
        const typeErrorList = [
            "Syntax error:", 
            "Semantic Error:",
            "Invalid Spec Error:",
            "Type Error:"
        ]
        
        let errorListList = [];
        for (let i = 0; i < typeErrorList.length; i++){
            errorListList.push(stderr.split(typeErrorList[i]));
        }
        
        let decorationsArray = [];
        let decoration = null;
        let pos = null;
        let excludeMisleading = false;
        
        for (let i = 0; i < errorListList.length; i++){
            // Syntax errors may present misleading errors so we remove them
            excludeMisleading = i === 0; 
            // First element does not contain the error
            errorListList[i].shift();
            // Then for each syntax error, add position to decorationsArray
            errorListList[i].forEach(error => {
                
                pos = getErrorPos(error, true);
                if (pos === null){
                    return
                }
                decoration = getDecorationFromPos(pos);
                // Appending error type to hover message
                decoration.hoverMessage = typeErrorList[i] + " " +decoration.hoverMessage;
                decorationsArray.push(decoration);
            });
        }
        
        decorationErrorType = vscode.window.createTextEditorDecorationType({
            textDecoration: "underline red wavy",
        });
        editor.setDecorations(decorationErrorType, decorationsArray);
    }
}
/**
* 
* @param {Int8Array} pos Array containing : [line, start position, end position, message] of the error
* @returns decoration to apply
*/
function getDecorationFromPos(pos){
    const start = new vscode.Position(pos[0], pos[1]);
    const end = new vscode.Position(pos[0], pos[2]);
    const decorationRange = new vscode.Range(start, end);
    
    return { range: decorationRange, hoverMessage: pos[3] };
    
}

/**
* 
* @param {string} stderr The error given by the spec check
* @param {boolean} excludeMisleading exclude misleading errors including "set null", "EOF",...
* @returns An array containing stderr, line of the error, column of the beginning of the error, column of the end of the error
*/
function getErrorPos(stderr, excludeMisleading){
    let regexList =[] ;
    // Add '\r?' for windows
    regexList.push(/'(.*)'\s+at line:\s?([0-9]+),\s+position:([0-9]+)\s+[:-]\s+(.*)\r?\n/);
    regexList.push(/at line:([0-9]+), position:([0-9]+), symbol[:|-]'(.*)':  (.*)\r?\n/);
    // For type error : No distinction from first regex appart from the fact that there is no separator 
    // between position and error message (e.g ':' '-'). To avoid matching unexpected data, we perform this one at the end
    regexList.push(/'(.*)'\s+at line:\s?([0-9]+),\s+position:([0-9]+)\s+(.*)\r?\n/);
    let posMatch = null;
    
    for (let i = 0; i < regexList.length ; i++){
        posMatch = stderr.match(regexList[i]);
        if (posMatch !== null){
            if (i === 1){
                posMatch = [posMatch[0], posMatch[3], posMatch[1], posMatch[2], posMatch[4]];
            }
            break
        }
        
    }
    if (posMatch === null){
        return null;
    }
    
    let res = [];
    res.push(parseInt(posMatch[2]) - 1); // line
    res.push(parseInt(posMatch[3])); // Start pos
    res.push(parseInt(posMatch[3]) + parseInt(posMatch[1].length)); // Start pos + length of symbol
    
    if (excludeMisleading && (posMatch[4].includes("set null") || posMatch[4].includes("EOF"))){
        res.push("");
    } else {
        res.push(posMatch[4]); // Error message
    }
    return res;
}

function disposeHighlights(){
    decorationErrorType.dispose();
}

module.exports = {
    highlightErrors, displayWarningAndGenerationError, disposeHighlights
}