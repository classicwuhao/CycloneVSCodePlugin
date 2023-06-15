const { stdout } = require('process');
const vscode = require('vscode');
const fs = require("fs");
const path = require('path');
const os = require ('os');
const extension = vscode.extensions.getExtension("HaoWu.Cyclone");
const lib_path = path.join(extension.extensionPath, "Cyclone");
const ext_path = path.join(lib_path, "cyclone.jar");
cmd_ver='';
cmd_java_ver='java -jar cyclone.jar --version';
cmd_cyclone='';
// Both cmd are changed for windows in initialize()
rmCmd = "rm ";
rmDirCmd = "rm -r ";
var decorationErrorType = vscode.window.createTextEditorDecorationType({
	textDecoration: "underline red wavy",
});


function activate(context) {
	initialize();
	let out = vscode.window.createOutputChannel("Cyclone");
	registerCycloneCheck(context,out);
	registerCycloneInfo(context,out);
	registerCycloneShowTrace(context, out);
	registerCycloneCleanTrace(context, out);
	registerCycloneCleanAllTrace(context, out);
}

function registerCycloneCheck(context,out){
	let disposable = vscode.commands.registerCommand('cyclone.m1.check', function () {
		var exec = require('child_process').exec, child;
		var currentDir = getCurrDir();
		const editor = vscode.window.activeTextEditor;
		if(currentDir === '') { // Display error and don't check the spec
			vscode.window.showErrorMessage("Working folder not found, please open a folder and try again" );
			context.subscriptions.push(disposable);
			return;
		}
		if (checkOS() === 'Windows') {
			currentDir = "/d "+ currentDir; // Need to specify /d to change hard drive if needed
		}
		
		child = exec('cd '+currentDir+ ' && java "-Djava.library.path=' + lib_path + '" -jar "' + ext_path + '" --nocolor "' + editor.document.fileName + '"',
		function (error, stdout, stderr){
			out.clear();
			out.appendLine(stdout);
			out.appendLine(stderr);
			console.log('stdout: ' + stdout);
			console.log('stderr: ' + stderr);
			// Remove all highlights
			decorationErrorType.dispose();
			if (stderr !== ''){ // Apply highlights if needed
				parseStderr(stderr, editor);
			}
			
			if(error !== null){
				console.log('exec error: ' + error);
			}
		});
	});
	context.subscriptions.push(disposable);
}

//child = exec('java "-Djava.library.path=' + lib_path + '" -jar "' + ext_path + '" --version',
function registerCycloneInfo(context, out){
	let disposable = vscode.commands.registerCommand('cyclone.m5.version', function () {
		var exec = require('child_process').exec, child;
		child = exec(cmd_ver,
			function (error, stdout, stderr){
				out.clear();
				out.appendLine(stdout);
				out.appendLine(stderr);
				console.log('stdout: ' + stdout);
				console.log('stderr: ' + stderr);
				if(error !== null){
					console.log('exec error: ' + error);
				}
			});  
		});
		context.subscriptions.push(disposable);
	}
	
	function registerCycloneShowTrace(context, out){
		let disposable = vscode.commands.registerCommand('cyclone.m2.trace', function () {
			var traceFilePath = getTraceFilePath();
			
			if (fs.existsSync(traceFilePath)) {
				out.appendLine("Trace file opened.\n");
				const openPath = vscode.Uri.file(traceFilePath);
				vscode.workspace.openTextDocument(openPath).then(doc => {
					vscode.window.showTextDocument(doc, {
						viewColumn: vscode.ViewColumn.Beside // Open file in a split view
					});
				});
			} else {
				vscode.window.showErrorMessage("Trace file not found, please check the specification before showing trace" );
			}
		});
		context.subscriptions.push(disposable);
	}
	
	function registerCycloneCleanTrace(context, out){
		let disposable = vscode.commands.registerCommand('cyclone.m3.clean', function () {
			var traceFilePath = getTraceFilePath();
			if (fs.existsSync(traceFilePath)) {
				var exec = require('child_process').exec, child;
				child = exec(rmCmd+traceFilePath, function (error, stdout, stderr){
					if(error !== null){
						out.appendLine(stderr);
						console.log('exec error: ' + error);
					} else {
						traceFilePath  = '';
						out.appendLine("Trace successfully deleted");
						
					}
				});
			} else {
				vscode.window.showInformationMessage("There was no trace file to clean" );
			}
		});
		context.subscriptions.push(disposable);
	}
	
	function registerCycloneCleanAllTrace(context, out){
		let disposable = vscode.commands.registerCommand('cyclone.m4.cleanAll', function () {
			traceDir = getTraceDir();
			if (fs.existsSync(traceDir)) {
				vscode.window.showInformationMessage("Do you really want to remove repertory "+traceDir+"?", "Yes", "No")
				.then(answer => {
					if (answer === "Yes") {
						var exec = require('child_process').exec, child;
						child = exec(rmDirCmd+traceDir, 
							function (error, stdout, stderr){
								out.appendLine(stderr);
								if(error !== null){
									console.log('exec error: ' + error);
								} else {
									traceFilePath  = '';
									out.appendLine("All traces were successfully deleted");
								}
								// Set the trace file path by parsing stdout (There may be a better way to do it)
								setTracePathFromStdout(stdout);
							});
						}
					})
				}
			});
			context.subscriptions.push(disposable);
		}
		
		function initialize(){
			sys=checkOS();
			var exec = require('child_process').exec;
			
			if (sys=='Linux'){
				cmd_ver='cd '+lib_path+' && '+' export LD_LIBRARY_PATH=.'+' && '+cmd_java_ver;
				p1=exec ('export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:'+lib_path,(error,stdout,stderr)=>{
					if (error){
						console.error('error: ${error.message}');
						return;
					}
					if (stderr){
						console.error('stderr: ${stderr}');
						return;
					}
				});
				return;
			}
			
			if (sys=='MacOS'){
				cmd_ver='cd '+lib_path+' && '+' export DYLD_LIBRARY_PATH=.'+' && '+cmd_java_ver;
				exec ('export DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH:'+lib_path,(error,stdout,stderr)=>{
					if (error){
						console.error('error: ${error.message}');
						return;
					}
					if (stderr){
						console.error('stderr: ${stderr}');
						return;
					}
				});
				return;
			}
			
			
			rmCmd = "del ";
			rmDirCmd = "del /F /Q ";
			cmd_ver='cd '+lib_path+' && ' + cmd_java_ver;
			
			
			
		}
		
		function checkOS(){
			const platform = os.platform();		
			if (platform=='linux'){
				return 'Linux';
			}
			else if (platform=='darwin'){
				return 'MacOS';
			}
			else if (platform=='win32'){
				return 'Windows';
			}
			else
			return 'Unsupport';
		}
		
		/**
		* 
		* @returns Absolute path of current file
		*/
		function getCurrFilePath() {
			var currentOpenTabPath = vscode.window.activeTextEditor.document.fileName;
			
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
			const traceFilePath = getCurrFilePath();
			if (traceFilePath === ''){
				return ''
			}
			const index = traceFilePath.lastIndexOf(path.sep);
			// Insert /trace and replace .cyclone by .trace at the end of the file
			return path.join(traceFilePath.slice(0, index), "trace", traceFilePath.slice(index+1)).replace(".cyclone",".trace");
		}
		
		/**
		* 
		* @returns get trace directory of current cyclone file
		*/
		function getTraceDir() {
			const traceFilePath = getTraceFilePath();
			if (traceFilePath === ''){
				return ''
			}
			var lastSepIndex = traceFilePath.lastIndexOf(path.sep);
			return traceFilePath.substring(0, lastSepIndex + 1); // Get the dir where trace file is
		}
		
		/**
		* 
		* @returns get directory of current cyclone file
		*/
		function getCurrDir() {
			const traceFilePath = getCurrFilePath();
			if (traceFilePath === ''){
				return ''
			}
			var lastSepIndex = traceFilePath.lastIndexOf(path.sep);
			return traceFilePath.substring(0, lastSepIndex + 1); // Get the dir where cyclone file is
		}
		
		
		/**
		* Highlights error by parsing stderr
		* @param {*} stderr The error given by the spec check
		* @param {*} editor vs code active editor
		*/
		function parseStderr(stderr, editor){
			if (editor) {
				const syntaxErrorList = stderr.split("Syntax error:");
				const semanticErrorList = stderr.split("Semantic Error:");
				const specErrorList = stderr.split("Invalid Spec Error:");
				
				var decorationsArray = [];
				let decoration = null;
				let pos = null;
				
				// First element does not contain the error
				syntaxErrorList.shift();
				// Then for each syntax error, add position to decorationsArray
				syntaxErrorList.forEach(error => {
					pos = getSyntaxErrorPos(error);
					if (pos === null){
						return
					}
					decoration = getDecorationFromPos(pos);
					decorationsArray.push(decoration);
				});
				
				// First element does not contain the error
				semanticErrorList.shift();
				semanticErrorList.forEach(error => {
					pos = getSemanticErrorPos(error);
					if (pos === null){
						return
					}
					decoration = getDecorationFromPos(pos);
					decorationsArray.push(decoration);
				});

				// First element does not contain the error
				specErrorList.shift();
				specErrorList.forEach(error => {
					pos = getSpecErrorPos(error);
					if (pos === null){
						return
					}
					decoration = getDecorationFromPos(pos);
					decorationsArray.push(decoration);
				});
				
				decorationErrorType = vscode.window.createTextEditorDecorationType({
					textDecoration: "underline red wavy",
				});
				editor.setDecorations(decorationErrorType, decorationsArray);
			}
		}

		function getDecorationFromPos(pos){
			const start = new vscode.Position(pos[1], pos[2]);
			const end = new vscode.Position(pos[1], pos[3]);
			const decorationRange = new vscode.Range(start, end);
			
			let message = pos[4]
			
			return { range: decorationRange, hoverMessage: message };
			
		}
		
		/**
		* 
		* @param {*} stderr The error given by the spec check
		* @returns An array containing stderr, line of the error, column of the beginning of the error, column of the end of the error
		*/
		function getSyntaxErrorPos(stderr){
			const regexPos = /line:([0-9]+), position:([0-9]+), symbol:'(.*)':/;
			let posMatch = stderr.match(regexPos);
			if (posMatch === null){
				return null
			}
			
			
			posMatch[1] = parseInt(posMatch[1]) - 1;
			posMatch[2] = parseInt(posMatch[2]);
			posMatch[3] = posMatch[2] + parseInt(posMatch[3].length);
			var regexExpect = /.*expecting (.*)/;
			let expectMatch = stderr.match(regexExpect);
			if (expectMatch === null){
				regexExpect = /.*missing (.*) at/;
				expectMatch = stderr.match(regexExpect);
				if (expectMatch === null || expectMatch[1]==='EOF'){
					posMatch.push("");
					return posMatch
				}
				posMatch.push("Missing '"+expectMatch[1]+"'");
			} else {
				posMatch.push("Expecting '"+expectMatch[1]+"'");
			}
			return posMatch;
		}
		
		function getSemanticErrorPos(stderr){
			var regexList =  [];
			regexList.push(/.*line:([0-9]+),  position:([0-9]+) :  Function '(.*)' cannot be found\..*/);
			regexList.push(/at line:([0-9]+),  position:([0-9]+) :  no variable\/constant (.*) is found./);
			regexList.push(/at line:([0-9]+),  position:([0-9]+) :  no state (.*) is defined./);
			regexList.push(/at line:([0-9]+),  position:([0-9]+) :  variable '(.*)' is not allowed in '(.*)'/);
			
			msgList = [];
			msgList.push("Unknown function: '");
			msgList.push("Unknown variable/constant: '");
			msgList.push("Unknown state: '");
			msgList.push("Unknown variable: '");
			let posMatch = null;
			for (let i=0; i<regexList.length; i++ ){
				posMatch = stderr.match(regexList[i]);
				if (posMatch !== null){
					if (i === 3){
						posMatch[4] = (msgList[i]+posMatch[3]+"' when defining '"+posMatch[4]+"'");
					} else {
						posMatch.push(msgList[i]+posMatch[3]+"'");
					}
					break;
				}
			}
			
			posMatch[1] = parseInt(posMatch[1]) - 1;
			posMatch[2] = parseInt(posMatch[2]);
			posMatch[3] = posMatch[2] + parseInt(posMatch[3].length);
			
			return posMatch;
		}

		function getSpecErrorPos(stderr){
			const regexPos = /line: ([0-9]+), position:([0-9]+) :  cannot find source state '(.*)' in current spec/;
			let posMatch = stderr.match(regexPos);
			if (posMatch === null){
				return null
			}
			
			posMatch.push("Cannot find source state '"+posMatch[3]+"'");
			
			posMatch[1] = parseInt(posMatch[1]) - 1;
			posMatch[2] = parseInt(posMatch[2]);
			posMatch[3] = posMatch[2] + parseInt(posMatch[3].length);
			
			
			return posMatch;
		}
		
		function deactivate() {}
		module.exports = {
			activate,
			deactivate
		}
		