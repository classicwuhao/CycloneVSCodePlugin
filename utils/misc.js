const vscode = require('vscode');
const os = require('os');

/**
* 
* @param {string} message Message to be display
* @param {number} timeout Duration of the notification
*/
async function showNotification( message, timeout = 5000 ) {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification, // '.Window' instead of '.Notification' if display wanted in blue bottom bar
            cancellable: false
        },
        async (progress) => {
            progress.report({ increment: 100, message: `${message}` });
            await new Promise((resolve) => setTimeout(resolve, timeout));
        }
        );
    }
    
    
    /**
     * Wait for asked time
     * @param {number} time 
     * @returns 
     */
    function sleep(time){
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, time);
        });
    }

    /**
     * 
     * @returns  'Linux' | 'MacOS' | 'Windows' | 'Unsupport' Depending on user OS
     */
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
    * Check Java Version and display warnings if java is not installed/too old
    */
    function checkJavaVersion(){
        var exec = require('child_process').exec;
        var cmd = exec("java -version", (error,stdout,stderr)=>{
            // TODO Still need to figure out the exact output when no JVM
            if (error){
                // Java isn't installed (or at least 'java' command is not working)
                if (error.message.includes("is not recognized as an internal") || 
                error.message.includes("command not found")){
                    vscode.window.showWarningMessage("You don't seem to have JVM installed, please be sure to have Java installed before using Cyclone.")
                }
                console.error(`error: ${error.message}`);
            }
            
            let res = stderr.match(/version "(.*)"/);
            if (res === null || res.length < 2){
                return;
            }
            
            let javaVersion = res[1];
            // Check for version compatibility
            if (parseInt(javaVersion.split(".")[0]) < 8){
                if (parseInt(javaVersion.split(".")[0]) === 1 && parseInt(javaVersion.split(".")[1]) >= 8){
                    return;
                }
                vscode.window.showWarningMessage("It seems that the version of your JVM is older than Java 8, Cyclone require Java 8 or higher, please consider updating")
            }
        })
    }

    module.exports = {
        showNotification, sleep, checkJavaVersion, checkOS
    }