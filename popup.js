document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.getElementById('editBtn');
    const darkBtn = document.getElementById('darkBtn');
    const pdfBtn = document.getElementById('pdfBtn');
    const exportSelBtn = document.getElementById('exportSelBtn');
    const eraserBtn = document.getElementById('eraserBtn');
    const saveBtn = document.getElementById('saveBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    
    // New Pro Buttons
    const cloneBtn = document.getElementById('cloneBtn');
    const xrayBtn = document.getElementById('xrayBtn');
    const cleanPrintBtn = document.getElementById('cleanPrintBtn');

    // Paywall elements
    const proView = document.getElementById('proView');
    const activateBtn = document.getElementById('activateBtn');
    const licenseKey = document.getElementById('licenseKey');
    const licenseMessage = document.getElementById('licenseMessage');

    let isPro = false;
    let pdfCount = 0;

    // License Verification (Replace YOUR_SECRET_KEY with your own secret)
    const SECURE_TOKEN = btoa('YOUR_SECRET_KEY');
    chrome.storage.local.get(['_weAuthToken', 'pdfCount', 'isPro'], (result) => {
        if (result.isPro) { chrome.storage.local.remove('isPro'); }
        isPro = (result._weAuthToken === SECURE_TOKEN);
        pdfCount = result.pdfCount || 0;

        if (isPro) {
            proView.classList.add('hidden');
            document.querySelectorAll('.pro-action').forEach(btn => {
                 btn.disabled = false;
                 btn.classList.remove('locked');
                 btn.title = "";
            });
            ensureScriptAndUpdate();
        } else {
            proView.classList.remove('hidden');
            document.querySelectorAll('.pro-action').forEach(btn => {
                 btn.disabled = true;
                 btn.classList.add('locked');
                 btn.title = "PRO Feature - Upgrade Required";
            });
            ensureScriptAndUpdate();
        }
    });

    // License Key Activation
    activateBtn.addEventListener('click', () => {
        const key = licenseKey.value.trim();
        if (key.startsWith('PRO-') && key.length > 5) {
            chrome.storage.local.set({ _weAuthToken: SECURE_TOKEN }, () => {
                isPro = true;
                licenseMessage.style.color = '#00b894';
                licenseMessage.textContent = '✅ License activated successfully!';
                
                document.querySelectorAll('.pro-action').forEach(btn => {
                     btn.disabled = false;
                     btn.classList.remove('locked');
                     btn.title = "";
                });
                
                setTimeout(() => {
                    proView.classList.add('hidden');
                    ensureScriptAndUpdate();
                }, 1500);
            });
        } else {
            licenseMessage.style.color = '#ff7675';
            licenseMessage.textContent = '❌ Invalid License Key.';
        }
    });

    function ensureScriptAndSend(message, callback) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }).then(() => {
                chrome.tabs.sendMessage(tabId, message, callback);
            }).catch((err) => {
                chrome.tabs.sendMessage(tabId, message, callback);
            });
        });
    }

    function ensureScriptAndUpdate() {
        ensureScriptAndSend({ action: "get_state" }, (response) => {
            if (response) {
                editBtn.textContent = response.isEditing ? '✨ Disable Edit Mode' : '✨ Enable Edit Mode';
                editBtn.classList.toggle('active', response.isEditing);
                darkBtn.textContent = response.isDarkMode ? '☀️ Disable Dark Mode' : '🌙 Toggle Dark Mode';

                if (isPro) {
                    eraserBtn.textContent = response.isErasing ? '🧹 Cancel Eraser' : '🧹 Magic Eraser';
                    eraserBtn.classList.toggle('active', response.isErasing);
                    
                    cloneBtn.textContent = response.isCloning ? '👯 Cancel Cloner' : '👯 Clone Element';
                    cloneBtn.classList.toggle('active', response.isCloning);
                    
                    xrayBtn.textContent = response.isXRaying ? '🔍 Cancel X-Ray' : '🔍 HTML X-Ray';
                    xrayBtn.classList.toggle('active', response.isXRaying);
                    
                    cleanPrintBtn.textContent = response.isCleanPrint ? '📄 Cancel Clean Print' : '📄 Clean Print';
                    cleanPrintBtn.classList.toggle('active', response.isCleanPrint);
                }
            }
        });
    }

    // Free & Premium Event Listeners
    editBtn.addEventListener('click', () => ensureScriptAndSend({ action: "toggle_edit" }, ensureScriptAndUpdate));
    darkBtn.addEventListener('click', () => ensureScriptAndSend({ action: "toggle_dark" }, ensureScriptAndUpdate));
    
    // Premium Event Listeners
    eraserBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_eraser" }, ensureScriptAndUpdate); });
    cloneBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_clone" }, ensureScriptAndUpdate); });
    xrayBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_xray" }, ensureScriptAndUpdate); });
    cleanPrintBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "toggle_cleanprint" }, ensureScriptAndUpdate); });
    saveBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "save_state" }, ensureScriptAndUpdate); });
    restoreBtn.addEventListener('click', () => { if(isPro) ensureScriptAndSend({ action: "restore_state" }, ensureScriptAndUpdate); });

    function handlePDFExport(actionType) {
        if (!isPro && pdfCount >= 5) {
            proView.classList.remove('hidden');
            licenseMessage.style.color = '#ff7675';
            licenseMessage.textContent = '⚠️ Free limit (5) reached. Upgrade to PRO to export more PDFs.';
            return;
        }
        chrome.storage.local.set({ pdfCount: pdfCount + 1 }, () => {
            pdfCount++;
            ensureScriptAndSend({ action: actionType }, ensureScriptAndUpdate);
        });
    }

    pdfBtn.addEventListener('click', () => handlePDFExport("export_pdf"));
    exportSelBtn.addEventListener('click', () => handlePDFExport("export_popup_selection"));
});
