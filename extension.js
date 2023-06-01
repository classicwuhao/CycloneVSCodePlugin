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
function activate(context) {
	initialize();
	let out = vscode.window.createOutputChannel("Cyclone");
	registerCycloneCheck(context,out);
	registerCycloneInfo(context,out);
}

function registerCycloneCheck(context,out){
	let disposable = vscode.commands.registerCommand('cyclone.check', function () {
		var exec = require('child_process').exec, child;
		const editor = vscode.window.activeTextEditor;
		child = exec('java "-Djava.library.path=' + lib_path + '" -jar "' + ext_path + '" --nocolor "' + editor.document.fileName + '"',
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

//child = exec('java "-Djava.library.path=' + lib_path + '" -jar "' + ext_path + '" --version',
function registerCycloneInfo(context, out){
	let disposable = vscode.commands.registerCommand('cyclone.version', function () {
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

function deactivate() {}
module.exports = {
	activate,
	deactivate
}
