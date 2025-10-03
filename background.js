let connection;
let jobInProgress = false;
let jobComplete = false;

const executeJob = () => {
    jobInProgress = true;
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTabId = tabs[0].id;
        chrome.scripting.executeScript({
            target: {tabId: currentTabId},
            files: ["./modules/pdfkit.js", "./modules/blob-stream.js", "./src/ModifyDocSendView.js", "./src/GeneratePDF.js", "./src/DocSendDownloader.js"]
        }, () => {
            connection = chrome.tabs.connect(currentTabId);
            connection.postMessage({requestType: "GENERATE_PDF"});
            connection.onMessage.addListener((message) => {
                if (message.requestType == "SET_JOB_COMPLETE") {
                    jobInProgress = false;
                    jobComplete = true;
                }
            })
        })
    })
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {hostSuffix: 'docsend.com', pathContains: 'view'},
            })],
            actions: [new chrome.declarativeContent.ShowAction()]
        }]);
    });
});


chrome.action.onClicked.addListener(() => {

    chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [1],
        addRules: [{
            id: 1,
            priority: 1,
            action: {
                type: "modifyHeaders",
                responseHeaders: [
                    {header: "Access-Control-Allow-Origin", operation: "set", value: "*"},
                    {header: "Access-Control-Allow-Methods", operation: "set", value: "GET, OPTIONS"}
                ]
            },
            condition: {
                urlFilter: "*://*.docsend.com/*",
                resourceTypes: ["xmlhttprequest", "image", "main_frame", "sub_frame"]
            }
        }, {
            id: 2,
            priority: 1,
            action: {
                type: "modifyHeaders",
                responseHeaders: [
                    {header: "Access-Control-Allow-Origin", operation: "set", value: "*"},
                    {header: "Access-Control-Allow-Methods", operation: "set", value: "GET, OPTIONS"}
                ]
            },
            condition: {
                urlFilter: "*://*.cloudfront.net/*",
                resourceTypes: ["xmlhttprequest", "image", "main_frame", "sub_frame"]
            }
        }]
    })

    if (jobComplete || jobInProgress) {
        try {
            connection.postMessage({requestType: "CHECK_PROGRESS"});
        }
        catch {
            //Connection closed, start new job
            executeJob();
        }
    }
    else if (!jobInProgress && !jobComplete) {
        executeJob();
    }
})
