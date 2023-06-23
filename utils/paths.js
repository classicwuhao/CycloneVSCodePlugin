const vscode = require('vscode');
const path = require('path');
const { trace } = require('console');


/**
* 
* @returns Absolute path of current file
*/
function getCurrFilePath() {
	let currentOpenTabPath = vscode.window.activeTextEditor.document.fileName;
	
	if(currentOpenTabPath !== '') {
		return currentOpenTabPath;
	} 
	else { // Display error and don't check the spec
		vscode.window.showErrorMessage("Working folder not found, please open a folder and try again" );
		return '';
	}
}

/**
* 
* @returns path of the trace file when checking the spec of the current opened cyclone file
*/
function getTraceFilePath() {
	const currFilePath = getCurrFilePath();
	if (currFilePath === ''){
		return ''
	}
	const index = currFilePath.lastIndexOf(path.sep);
	// Insert /trace and replace .cyclone by .trace at the end of the file
	return path.join(currFilePath.slice(0, index), "trace", currFilePath.slice(index+1).replace(".cyclone",".trace"));
}

/**
* 
* @returns trace directory path of current cyclone file
*/
function getTraceDirPath() {
	const traceFilePath = getTraceFilePath();
	if (traceFilePath === ''){
		return ''
	}
	
	return path.dirname(traceFilePath); // Get the dir where trace file is
}

/**
* 
* @returns directory path of current cyclone file
*/
function getCurrDirPath() {
	const currFilePath = getCurrFilePath();
	if (currFilePath === ''){
		return ''
	}
	
	return path.dirname(currFilePath); // Get the dir where cyclone file is
}

/**
* 
* @returns path of the .dot trace file when checking the spec of the current opened cyclone file
*/
function getDotFilePath() {
	const traceFilePath = getTraceFilePath();
	if (traceFilePath === ''){
		return ''
	}
	// Remove trace and append "dot"
	return traceFilePath.slice(0, traceFilePath.length-5) + "dot";
}

/**
* 
* @returns path of the .png trace file when checking the spec of the current opened cyclone file
*/
function getPngFilePath() {
	const traceFilePath = getTraceFilePath();
	if (traceFilePath === ''){
		return ''
	}
	// Remove trace and append "dot"
	return traceFilePath.slice(0, traceFilePath.length-5) + "png";
}

module.exports = {
	 getCurrDirPath,  getTraceDirPath, getTraceFilePath, getCurrFilePath, getDotFilePath, getPngFilePath
}