const { stdout } = require('process');
const vscode = require('vscode');
const fs = require("fs");
const path = require('path');
const os = require ('os');

function activate(context) {
	let out = vscode.window.createOutputChannel("Cyclone");
	let disposable = vscode.commands.registerCommand('extension.runFile', function () {
		var exec = require('child_process').exec, child;
		const editor = vscode.window.activeTextEditor;
		const extension = vscode.extensions.getExtension("HaoWu.Cyclone");
		const lib_path = path.join(extension.extensionPath, "Cyclone");
		const ext_path = path.join(lib_path, "cyclone.jar");

		const platform = os.platform();		
		if (platform=='linux'){
			/*p1=exec ('export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:'+lib_path,(error,stdout,stderr)=>{
				if (error){
					console.error('error: ${error.message}');
					return;
				}
				if (stderr){
					console.error('stderr: ${stderr}');
					return;
				}
				
			});*/
			out.appendLine('linux: set path.');
		}
		
		/*if (platform=='darwin')
			exec ('export DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH:'+lib_path,(error,stdout,stderr)=>{
				if (error){
					console.error('error: ${error.message}');
					return;
				}
				if (stderr){
					console.error('stderr: ${stderr}');
					return;
				}
			});*/

		child = exec('java "-Djava.library.path=' + lib_path + '" -jar "' + ext_path + '" "' + editor.document.fileName + '"',
		function (error, stdout, stderr){
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
function deactivate() {}
module.exports = {
	activate,
	deactivate
}
