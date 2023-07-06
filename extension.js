const { getTraceDirPath, getTraceFilePath, getCurrFilePath, getDotFilePath, getPngFilePath} = require("./utils/paths");
const {highlightErrors, displayWarningAndGenerationError, disposeHighlights} = require("./utils/errors")
const {quickPickDir, loadFile} = require("./utils/quickPicks");
const {modifyForPngTrace, rollbackFile} = require("./utils/editFile");
const {checkJavaVersion, checkOS, showNotification, sleep, checkGraphviz} = require("./utils/misc");

const { stdout } = require('process');
const vscode = require('vscode');
const fs = require("fs");
const path = require('path');
const os = require ('os');
const extension = vscode.extensions.getExtension("HaoWu.Cyclone");
const lib_path = path.join(extension.extensionPath, "Cyclone");
const ext_path = path.join(lib_path, "cyclone.jar");
var cmd_ver='';
var cmd_java_ver='java -jar cyclone.jar --version';
var cmd_cyclone='';
// Both cmd are changed for windows in initialize()
var rmCmd = "rm ";
var rmDirCmd = "rm -r ";
const cancelCommandId = "cyclone.cancelCheck";
var customCancellationToken = null;
var myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
var keepChild = false; // Global var needed for cancellation token



function activate(context) {
	initialize();
	let out = vscode.window.createOutputChannel("Cyclone");
	registerCycloneCheck(context,out);
	registerCycloneInfo(context,out);
	registerCycloneShowTrace(context, out);
	registerCycloneShowTraceGraphic(context, out);
	registerCycloneCleanTrace(context, out);
	registerCycloneCleanAllTrace(context, out);
	registerCycloneSettings(context, out);
	registerCycloneExamples(context, out);
	registerCycloneSwitchTraceMode(context, out);
	initTraceStatusBar(context.subscriptions);
}

function registerCycloneCheck(context,out){
	let disposable = vscode.commands.registerCommand('cyclone.check', function () {
		// Prevent 2 checks from being run at the same time.
		vscode.commands.executeCommand(cancelCommandId, false);

		var exec = require('child_process').exec, child;
		let currentFilePath = getCurrFilePath();
		let currentDirPath = path.dirname(currentFilePath);
		let pngTraceWanted = vscode.workspace.getConfiguration().get("Trace.generateGraphicTrace");
		
		if (pngTraceWanted){
			checkGraphviz();
			// Modify the file to add png output option
			if (!modifyForPngTrace(currentFilePath)){
				// If no option-trace is false, disable png generation
				pngTraceWanted = false;
			}
		}
		
		const editor = vscode.window.activeTextEditor;
		if(currentDirPath === '') { // Display error and don't check the spec
			vscode.window.showErrorMessage("Working folder not found, please open a folder and try again." );
			return;
		}
		if (checkOS() === 'Windows') {
			currentDirPath = "/d "+ currentDirPath; // Need to specify /d to change hard drive if needed
		}
		
		child = exec('cd '+currentDirPath+ ' && java "-Djava.library.path=' + lib_path + '" -jar "' + ext_path + '" --nocolor "' + editor.document.fileName + '"',
		{
			timeout: vscode.workspace.getConfiguration().get("check.Timeout")*1000, // Convert into s
			killSignal:"SIGTERM" // Needed to distinguish with user cancellation
		},
		function (error, stdout, stderr){
			// Remove added line before getting error pos
			pngTraceWanted ? rollbackFile(currentFilePath) : '';
			out.clear();
			let date = new Date();
			out.appendLine(`[${date.toLocaleString()}]: `+stdout);
			out.appendLine(stderr);
			console.log('stdout: ' + stdout);
			console.log('stderr: ' + stderr);
			// Remove all highlights
			disposeHighlights();
			
			// Handle warning and generation errors
			displayWarningAndGenerationError(stdout, stderr);
			
			if (stderr !== ''){ 
				// Apply highlights if needed
				highlightErrors(stderr, editor);
				// Remove the timer and show warning msg
				vscode.commands.executeCommand(cancelCommandId, true);
				vscode.window.showErrorMessage("An error occurred, abort checking.");
			}
			
			if(error !== null){
				console.log('exec error: ' + error);
				// Specify the error message according to the problem
				if (error.killed){
					// Each killSignal is linked to a certain problem/user cancellation/time out
					switch (error.signal) {
						case "SIGTERM":
						vscode.commands.executeCommand(cancelCommandId, false) // False because child has already been killed
						vscode.window.showWarningMessage("Check was timed out.");
						break;
						case "SIGKILL":
						vscode.window.showInformationMessage("Check was successfully cancelled.");
						break;
						default:
						break;
					}
				} else if (stderr ==='' ){ // Do not show error twice
					vscode.window.showErrorMessage("Check finished with an error.");
				}
				return;
			}
			
			if(error === null && stderr === ''){
				// Removes the timer
				vscode.commands.executeCommand(cancelCommandId, true);
				if (stdout.includes("No Path found.") || stdout.includes("No Counter-example found.")){
					showNotification("No path was generated for this spec." + (pngTraceWanted ? " Image based trace won't be generated." : ""), 4000);
					pngTraceWanted = false;
				}
				if (pngTraceWanted){
					let dotFilePath = getDotFilePath();
					let pngFilePath = dotFilePath.slice(0, dotFilePath.length - 3) + "png"
					// Error when generating dot file or No path was found
					if (!fs.existsSync(dotFilePath)){
						vscode.window.showWarningMessage("Dot trace not found.");
						return;
					}
					exec(`cd ${currentDirPath} && dot -Tpng ${dotFilePath} -o  ${pngFilePath}`,
					function (error, stdout, stderr){
						out.appendLine(`[${date.toLocaleString()}]: `+stdout);
						out.appendLine(stderr);
						console.log('stdout: ' + stdout);
						console.log('stderr: ' + stderr);
					});
				}
				showNotification("Check finished. Details in Output -> Cyclone", 5000);
			}
		});
		showCheckNotification(child);
	});
	context.subscriptions.push(disposable);
}

function registerCycloneInfo(context, out){
	
	let disposable = vscode.commands.registerCommand('cyclone.version', function () {
		var exec = require('child_process').exec, child;
		child = exec(cmd_ver,
			function (error, stdout, stderr){
				out.clear();
				let date = new Date();
				out.appendLine(`[${date.toLocaleString()}]: `+stdout);
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
		let disposable = vscode.commands.registerCommand('cyclone.trace', function () {
			let traceFilePath = getTraceFilePath();
			if (fs.existsSync(traceFilePath)) {
				let date = new Date();
				const openPath = vscode.Uri.file(traceFilePath);
				vscode.workspace.openTextDocument(openPath).then(doc => {
					vscode.window.showTextDocument(doc, {
						viewColumn: vscode.ViewColumn.Beside // Open file in a split view
					});
				});
				out.appendLine(`[${date.toLocaleString()}]: ${path.basename(traceFilePath)} opened.\n`);
			} else {
				vscode.window.showErrorMessage("Trace file not found, please ensure that 'Graphic Trace' setting is disabled and check the specification before showing trace." );
			}
		});
		context.subscriptions.push(disposable);
	}
	
	function registerCycloneShowTraceGraphic(context, out){
		let disposable = vscode.commands.registerCommand('cyclone.pngTrace', function () {
			let pngFilePath = getPngFilePath();
			if (fs.existsSync(pngFilePath)) {
				let date = new Date();
				const openPath = vscode.Uri.file(pngFilePath);
				vscode.commands.executeCommand('vscode.open', openPath, vscode.ViewColumn.Beside);
				out.appendLine(`[${date.toLocaleString()}]: ${path.basename(pngFilePath)} opened.\n`);
			} else {
				vscode.window.showErrorMessage("Trace file not found, please ensure that 'Graphic Trace' setting is activated and check the specification before showing trace." );
			}
		});
		context.subscriptions.push(disposable);
	}
	
	function registerCycloneCleanTrace(context, out){
		let disposable = vscode.commands.registerCommand('cyclone.clean', function () {
			let fileTraces = [];
			let err = "";
			let didDelete = false;
			// Need to remove all 3 kind of trace files
			fileTraces.push(getTraceFilePath());
			fileTraces.push(getPngFilePath());
			fileTraces.push(getDotFilePath());
			
			var exec = require('child_process').exec, child;
			// Try to delete each file
			for (let i = 0; i < fileTraces.length; i++){
				if (fs.existsSync(fileTraces[i])) {
					didDelete = true;
					child = exec(rmCmd+fileTraces[i], function (error, stdout, stderr){
						if(error !== null){
							err += stderr + "\n";
							console.log('exec error: ' + error);
						} 
					});
				}
			} 
			let date = new Date();
			if (!didDelete)  {
				vscode.window.showInformationMessage("There was no trace file to clean." );
				return;
			}
			
			if (err !== ""){
				out.appendLine(`[${date.toLocaleString()}]: `+err);
			} else {
				out.appendLine(`[${date.toLocaleString()}]: Trace files successfully deleted.`);
			}
			
		});
		context.subscriptions.push(disposable);
	}
	
	function registerCycloneCleanAllTrace(context, out){
		let disposable = vscode.commands.registerCommand('cyclone.cleanAll', function () {
			let traceDir = getTraceDirPath();
			if (fs.existsSync(traceDir)) {
				vscode.window.showInformationMessage(`Do you really want to delete repertory ${traceDir}?`, "Yes", "No")
				.then(answer => {
					if (answer === "Yes") {
						var exec = require('child_process').exec, child;
						let date = new Date();
						child = exec(rmDirCmd+traceDir, 
							function (error, stdout, stderr){
								out.appendLine("["+date.toLocaleString()+"]: "+stderr);
								if(error !== null){
									console.log('exec error: ' + error);
								} else {
									out.appendLine(`[${date.toLocaleString()}]: All traces were successfully deleted.`);
								}
							});
						}
					})
				} else {
					showNotification("There was no trace folder to delete.")
				}
			});
			context.subscriptions.push(disposable);
		}
		
		function registerCycloneSettings(context, out){
			let disposable = vscode.commands.registerCommand('cyclone.settings', function() {
				vscode.commands.executeCommand( 'workbench.action.openSettings', 'Cyclone' )
			});
			
			context.subscriptions.push(disposable);
		}
		
		function registerCycloneExamples(context, out){
			let disposable = vscode.commands.registerCommand('cyclone.examples', function() {
				let choiceList = []; // The list displayed to the user
				let pathList = []; // The path corresponding to the choices
				let exampleDir = path.join(lib_path,'examples'); // Absolute path to provided examples 
				let itemPath='';
				
				fs.readdirSync(exampleDir).forEach(item => {
					// Remove 'trace/' folder from accessible directory
					if (item === "trace"){
						return;
					}
					itemPath = path.join(exampleDir, item); // Get absolute path of file
					if (fs.statSync(itemPath).isDirectory()){
						choiceList.push({
							label: path.basename(item),
							description: `Go to ${path.basename(item)} examples.`
						})
						pathList.push(itemPath);
					} else {
						// Do not display files that aren't cyclone file
						if (itemPath.slice(itemPath.length - 8) !== (".cyclone")){
							return;
						}
						choiceList.push({
							label: path.basename(item),
							description: `Load ${path.basename(item)} example.`
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
					if (fs.statSync(selectedPath).isDirectory()){
						// Show quickPicks for selected folder
						quickPickDir(selectedPath);	
						return;
					}
					loadFile(selectedPath);
				});
			});
			
			context.subscriptions.push(disposable);
		}
		
		
		function registerCycloneSwitchTraceMode(context, out){
			let disposable = vscode.commands.registerCommand('cyclone.switchTraceMode', function() {
				let config = vscode.workspace.getConfiguration();
				let newMode = !config.get("Trace.generateGraphicTrace");
				config.update("Trace.generateGraphicTrace", newMode, true);
				showNotification(newMode ? "Switched to graphic trace" : "Switched to text trace", 1500);
			});
			
			context.subscriptions.push(disposable);
		}
		
		function initialize(){
			vscode.commands.registerCommand(cancelCommandId, (finishedSuccessfully) => {
				if (customCancellationToken) {
					// If the check finished without any errors, there is no need to kill the process
					keepChild = finishedSuccessfully;
					
					customCancellationToken.cancel();
					// If user asked for graphic trace generation, then we need to remove the prepended line
					if (vscode.workspace.getConfiguration().get("Trace.generateGraphicTrace")){
						rollbackFile(getCurrFilePath());
					}
				}
			})
			
			let sys=checkOS();
			checkJavaVersion();
			var exec = require('child_process').exec;
			
			if (sys=='Linux'){
				cmd_ver=`cd ${lib_path} &&  export LD_LIBRARY_PATH=. && ${cmd_java_ver}`;
				let p1=exec ('export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:'+lib_path,(error,stdout,stderr)=>{
					if (error){
						console.error(`error: ${error.message}`);
						return;
					}
					if (stderr){
						console.error(`stderr: ${stderr}`);
						return;
					}
				});
				return;
			}
			
			if (sys=='MacOS'){
				cmd_ver=`cd ${lib_path} && export DYLD_LIBRARY_PATH=. && ${cmd_java_ver}`;
				exec ('export DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH:'+lib_path,(error,stdout,stderr)=>{
					if (error){
						console.error(`error: ${error.message}`);
						return;
					}
					if (stderr){
						console.error(`stderr: ${stderr}`);
						return;
					}
				});
				return;
			}
			
			
			rmCmd = "del ";
			rmDirCmd = "rmdir /s /q ";
			cmd_ver=`cd ${lib_path} && ${cmd_java_ver}`;
			
		}
		
		/**
		 * Add a status bar for trace extension
		 * @param {*} subscriptions 
		 */
		function initTraceStatusBar(subscriptions) {
			subscriptions.push(myStatusBarItem);
			
			// register listener to make sure the status bar 
			// item always up-to-date
			subscriptions.push(vscode.workspace.onDidChangeConfiguration(updateStatusBarItem));
			
			// update status bar item once at start
			updateStatusBarItem();
		}
		
		/**
		 * Function that will update the content of the trace status bar
		 */
		function updateStatusBarItem() {
			let graphicTraceActivated = vscode.workspace.getConfiguration().get("Trace.generateGraphicTrace")

			if (graphicTraceActivated) {
				myStatusBarItem.text = `$(symbol-misc) Graphic trace`;
				checkGraphviz(); // Ensure that Graphviz is installed, else display warning
				myStatusBarItem.show();
			} else {
				myStatusBarItem.text = `$(list-selection) Text trace`;
				myStatusBarItem.show();
			}
		}
	
	
	/**
	* Show a notification that present a timer and a cancel button
	* @param {import("child_process").ChildProcess} child
	*/
	// Based on a code written by Elio Struyf
	async function showCheckNotification(child ) {
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Check progress",
			cancellable: false // We're using a custom cancellation token
		}, async (progress, token) => {
			return new Promise((async (resolve) => {
				customCancellationToken = new vscode.CancellationTokenSource();
				
				customCancellationToken.token.onCancellationRequested(() => {
					customCancellationToken?.dispose();
					customCancellationToken = null;

					// Only kill if timed out. Allow us to click launch button twice without interfering
					if (!keepChild){
						child.kill("SIGKILL");
					}
					resolve(null);
					return;
				});
				
				const seconds = 7200;
				for (let i = 1; i < seconds; i++) {
					// Increment is summed up with the previous value
					progress.report({ increment: seconds, message: `Running... (${i}s) [Cancel](command:${cancelCommandId})` })
					await sleep(1000);
				}
				
				resolve(null);
			}));
		});
	}
	
	function deactivate() {}
	module.exports = {
		activate,
		deactivate
	}
	